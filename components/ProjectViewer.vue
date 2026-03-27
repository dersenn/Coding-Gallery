<template>
  <div
    ref="containerRef"
    class="w-full h-full"
    :style="{ backgroundColor: viewerBackground }"
  ></div>
</template>

<script setup lang="ts">
import type {
  CleanupFunction,
  Project,
  ProjectActionDefinition,
  ProjectControlDefinition,
  ProjectDefinition,
  ProjectSketchDefinition,
  RuntimeActionCapabilities,
  ScopedProjectActions,
  ScopedProjectControls
} from '~/types/project'
import { initFromProjectDefinition } from '~/runtime/projectBootstrap'
import {
  normalizeScopedProjectConfig,
  resolveEffectiveScopedActions,
  resolveEffectiveScopedControls
} from '~/runtime/scopedProjectConfig'
import { resolveTheme } from '~/utils/theme'
import { buildSvgDownloadFilename, serializeSvgWithMetadata } from '~/utils/download'

const props = defineProps<{
  project: Project
  actionRequest?: {
    key: string
    nonce: number
  } | null
}>()

const containerRef = ref<HTMLElement | null>(null)
const { controlValues, initializeScopedControls } = useControls()
const { paused, togglePause, setPaused, setPauseEnabled } = usePlayback()
const { utils } = useGenerativeUtils()
const route = useRoute()

let cleanup: CleanupFunction | null = null
let controlCallbacks: Array<(values: any) => void> = []
let actionHandlers: Record<string, () => void> = {}
let isLoading = ref(true)
let error = ref<string | null>(null)
const scopedProjectControls = ref<ScopedProjectControls>({
  shared: [],
  bySketch: {}
})
const scopedProjectActions = ref<ScopedProjectActions>({
  shared: [],
  bySketch: {}
})
const hasInjectedSvgAction = ref(false)
const hasInjectedPngAction = ref(false)

// Emit controls when module is loaded
const emit = defineEmits<{
  controlsLoaded: [controls: ProjectControlDefinition[]]
  actionsLoaded: [actions: ProjectActionDefinition[]]
}>()

// Canonical project config + sketch-module loaders.
const projectConfigModules = import.meta.glob('~/projects/**/project.config.ts') as Record<
  string,
  () => Promise<{ default: ProjectDefinition }>
>
const layerModules = import.meta.glob('~/projects/**/*.{ts,js}') as Record<
  string,
  () => Promise<unknown>
>
const DOWNLOAD_SVG_ACTION_KEY = 'download-svg'
const DOWNLOAD_PNG_ACTION_KEY = 'download-png'
const DOWNLOAD_SVG_ACTION: ProjectActionDefinition = {
  key: DOWNLOAD_SVG_ACTION_KEY,
  label: 'Save SVG'
}
const DOWNLOAD_PNG_ACTION: ProjectActionDefinition = {
  key: DOWNLOAD_PNG_ACTION_KEY,
  label: 'Save PNG'
}

const activeDefinition = ref<ProjectDefinition | null>(null)
const hasSvgTechnique = computed(() => {
  const sketches = activeDefinition.value?.sketches ?? []
  return sketches.some((sketch) => sketch.technique === 'svg')
})
const hasCanvas2dTechnique = computed(() => {
  const sketches = activeDefinition.value?.sketches ?? []
  return sketches.some((sketch) => sketch.technique === 'canvas2d')
})
const themePreference = computed(() => props.project.prefersTheme ?? 'dark')
const viewerBackground = computed(() => resolveTheme(undefined, themePreference.value).background)
const defaultSketchId = computed(() => {
  const sketches = activeDefinition.value?.sketches ?? []
  return sketches.find((sketch) => sketch.defaultActive)?.id ?? sketches[0]?.id
})
const activeSketchId = computed(() => {
  const raw = controlValues.value.activeSketch
  if (typeof raw === 'string' && raw.length > 0) return raw
  return defaultSketchId.value
})
const runtimeCapabilities = computed<RuntimeActionCapabilities>(() => {
  const activeSketch = (activeDefinition.value?.sketches ?? []).find((sketch) => sketch.id === activeSketchId.value)
  return {
    canDownloadSvg: activeSketch?.technique === 'svg',
    canDownloadPng: activeSketch?.technique === 'canvas2d'
  }
})

const hasActionKey = (actions: ScopedProjectActions, actionKey: string) => {
  if (actions.shared.some((action) => action.key === actionKey)) return true
  return Object.values(actions.bySketch).some((layerActions) => {
    return layerActions.some((action) => action.key === actionKey)
  })
}

const emitEffectiveControlsAndActions = () => {
  const effectiveControls = resolveEffectiveScopedControls(activeSketchId.value, scopedProjectControls.value)
  emit('controlsLoaded', effectiveControls)
  const effectiveActions = resolveEffectiveScopedActions({
    activeSketchId: activeSketchId.value,
    scopedActions: scopedProjectActions.value,
    capabilities: runtimeCapabilities.value
  })
  emit('actionsLoaded', effectiveActions)
}

const pauseCallbacks = new Set<(paused: boolean) => void>()
watch(paused, (nextPaused) => {
  pauseCallbacks.forEach((callback) => callback(nextPaused))
})

watch(activeSketchId, () => {
  setPauseEnabled(false)
})

const createSvgDownloadFallback = () => {
  return () => {
    const svgElement = containerRef.value?.querySelector('svg')
    if (!svgElement) {
      console.warn('Download SVG requested, but no SVG element was found in the project container.')
      return
    }

    const source = serializeSvgWithMetadata(svgElement, {
      projectId: props.project.id,
      seed: utils.seed.current,
      controls: toRaw(controlValues.value),
      sourceUrl: window.location.href
    })
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = buildSvgDownloadFilename({
      projectId: props.project.id,
      seed: utils.seed.current
    })
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }
}

const createPngDownloadFallback = () => {
  return () => {
    const canvasElement = containerRef.value?.querySelector('canvas')
    if (!(canvasElement instanceof HTMLCanvasElement)) {
      console.warn('Download PNG requested, but no canvas element was found in the project container.')
      return
    }

    const link = document.createElement('a')
    const seedSuffix = utils.seed.current ? `-${String(utils.seed.current)}` : ''
    link.download = `${props.project.id}${seedSuffix}.png`
    link.href = canvasElement.toDataURL('image/png')
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
}

const resolveGlobKey = (
  targetPath: string,
  registry: Record<string, unknown>
): string | null => {
  const normalized = targetPath.startsWith('/') ? targetPath : `/${targetPath}`
  const candidates = [
    normalized,
    `~${normalized}`,
    normalized.replace(/^\/+/, ''),
    `~/${normalized.replace(/^\/+/, '')}`
  ]
  return candidates.find((candidate) => registry[candidate] !== undefined) ?? null
}

const loadProject = async () => {
  if (!containerRef.value) return

  try {
    isLoading.value = true
    error.value = null
    
    // Clear previous instance
    if (cleanup) {
      cleanup()
      cleanup = null
      controlCallbacks = []
      actionHandlers = {}
    }

    // Default to playing when a new project instance mounts.
    setPaused(false)
    setPauseEnabled(false)

    // Clear container
    containerRef.value.innerHTML = ''
    actionHandlers = {}

    const configKey = resolveGlobKey(props.project.configFile, projectConfigModules)
    const configLoader = configKey ? projectConfigModules[configKey] : undefined
    if (!configKey || !configLoader) {
      throw new Error(`Project config not found: ${props.project.configFile}`)
    }
    const resolvedConfigKey = configKey
    const configModule = await configLoader()
    const definition = configModule.default
    activeDefinition.value = definition

    const scopedConfig = normalizeScopedProjectConfig(definition)
    scopedProjectControls.value = scopedConfig.controls
    scopedProjectActions.value = {
      ...scopedConfig.actions,
      shared: [...scopedConfig.actions.shared]
    }
    const hasModuleSvgAction = hasActionKey(scopedProjectActions.value, DOWNLOAD_SVG_ACTION_KEY)
    const hasModulePngAction = hasActionKey(scopedProjectActions.value, DOWNLOAD_PNG_ACTION_KEY)
    hasInjectedSvgAction.value = hasSvgTechnique.value && !hasModuleSvgAction
    hasInjectedPngAction.value = hasCanvas2dTechnique.value && !hasModulePngAction
    if (hasInjectedSvgAction.value) {
      scopedProjectActions.value.shared.push(DOWNLOAD_SVG_ACTION)
    }
    if (hasInjectedPngAction.value) {
      scopedProjectActions.value.shared.push(DOWNLOAD_PNG_ACTION)
    }
    initializeScopedControls({
      sharedControls: scopedProjectControls.value.shared,
      layerControlsById: scopedProjectControls.value.bySketch
    }, {
      activeSketchId: defaultSketchId.value
    })
    emitEffectiveControlsAndActions()

    const theme = resolveTheme(definition.theme, themePreference.value)
    cleanup = await initFromProjectDefinition({
      definition,
      container: containerRef.value,
      loadSketchModule: async (sketch: ProjectSketchDefinition) => {
        const baseDir = resolvedConfigKey.split('/').slice(0, -1).join('/')
        const normalizedLayerPath = sketch.module.startsWith('./')
          ? `${baseDir}/${sketch.module.slice(2)}`
          : `${baseDir}/${sketch.module}`
        const resolvedLayerKey = resolveGlobKey(normalizedLayerPath, layerModules)
          ?? resolveGlobKey(normalizedLayerPath.replace(/\.js$/, '.ts'), layerModules)
          ?? resolveGlobKey(normalizedLayerPath.replace(/\.ts$/, '.js'), layerModules)
        const loader = resolvedLayerKey ? layerModules[resolvedLayerKey] : undefined
        if (!loader) {
          throw new Error(
            `Sketch module not found for project "${definition.id}": ${normalizedLayerPath}`
          )
        }
        return loader()
      },
      context: {
        controls: toRaw(controlValues.value),
        utils,
        theme,
        onControlChange: (callback) => {
          controlCallbacks.push(callback)
        },
        registerAction: (key, handler) => {
          actionHandlers[key] = handler
        },
        runtime: {
          get paused() {
            return paused.value
          },
          enablePause: () => {
            setPauseEnabled(true)
          },
          togglePause,
          onPauseChange: (callback) => {
            setPauseEnabled(true)
            pauseCallbacks.add(callback)
            return () => {
              pauseCallbacks.delete(callback)
            }
          }
        }
      }
    })

    if (hasInjectedSvgAction.value && !actionHandlers[DOWNLOAD_SVG_ACTION_KEY]) {
      actionHandlers[DOWNLOAD_SVG_ACTION_KEY] = createSvgDownloadFallback()
    }
    if (hasInjectedPngAction.value && !actionHandlers[DOWNLOAD_PNG_ACTION_KEY]) {
      actionHandlers[DOWNLOAD_PNG_ACTION_KEY] = createPngDownloadFallback()
    }

    // Log seed to console for debugging
    console.log(`Seed: ?seed=${utils.seed.current}`)

    isLoading.value = false
  } catch (err) {
    console.error('Failed to load project:', err)
    error.value = err instanceof Error ? err.message : 'Failed to load project'
    isLoading.value = false
  }
}

// Watch for control changes and notify project
watch(controlValues, (newValues) => {
  if (controlCallbacks.length > 0) {
    const rawValues = toRaw(newValues)
    controlCallbacks.forEach(cb => cb(rawValues))
  }
}, { deep: true })

watch(
  () => controlValues.value.activeSketch,
  () => {
    emitEffectiveControlsAndActions()
  }
)

// Watch for project changes
watch(() => props.project, () => {
  loadProject()
}, { immediate: false })

watch(
  () => route.query,
  () => {
    if (!activeDefinition.value) return
    initializeScopedControls({
      sharedControls: scopedProjectControls.value.shared,
      layerControlsById: scopedProjectControls.value.bySketch
    }, {
      activeSketchId: defaultSketchId.value
    })
    emitEffectiveControlsAndActions()
  }
)

watch(() => props.actionRequest, (request) => {
  if (!request) return

  const handler = actionHandlers[request.key]
  if (handler) {
    handler()
  }
}, { deep: true })

onMounted(() => {
  loadProject()
})

onUnmounted(() => {
  if (cleanup) {
    cleanup()
  }
})
</script>
