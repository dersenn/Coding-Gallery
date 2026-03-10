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
  ProjectLayerDefinition
} from '~/types/project'
import { initFromProjectDefinition } from '~/utils/projectBootstrap'
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
const { controlValues, initializeControls } = useControls()
const { utils } = useGenerativeUtils()
const route = useRoute()

let cleanup: CleanupFunction | null = null
let controlCallbacks: Array<(values: any) => void> = []
let actionHandlers: Record<string, () => void> = {}
let isLoading = ref(true)
let error = ref<string | null>(null)
const activeProjectControls = ref<ProjectControlDefinition[]>([])

// Emit controls when module is loaded
const emit = defineEmits<{
  controlsLoaded: [controls: ProjectControlDefinition[]]
  actionsLoaded: [actions: ProjectActionDefinition[]]
}>()

// Canonical project config + layer-module loaders.
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
  const techniques = activeDefinition.value?.techniques || []
  return techniques.includes('svg')
})
const hasCanvas2dTechnique = computed(() => {
  const techniques = activeDefinition.value?.techniques || []
  return techniques.includes('canvas2d')
})
const themePreference = computed(() => props.project.prefersTheme ?? 'dark')
const viewerBackground = computed(() => resolveTheme(undefined, themePreference.value).background)

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

    const controls = definition.controls || []
    activeProjectControls.value = controls || []
    if (controls.length) {
      initializeControls(controls)
    }
    emit('controlsLoaded', controls)
    const moduleActions = definition.actions || []
    const hasModuleSvgAction = moduleActions.some((action) => action.key === DOWNLOAD_SVG_ACTION_KEY)
    const hasModulePngAction = moduleActions.some((action) => action.key === DOWNLOAD_PNG_ACTION_KEY)
    const shouldInjectSvgAction = hasSvgTechnique.value && !hasModuleSvgAction
    const shouldInjectPngAction = hasCanvas2dTechnique.value && !hasModulePngAction
    const effectiveActions = [
      ...moduleActions,
      ...(shouldInjectSvgAction ? [DOWNLOAD_SVG_ACTION] : []),
      ...(shouldInjectPngAction ? [DOWNLOAD_PNG_ACTION] : [])
    ]
    emit('actionsLoaded', effectiveActions)

    const theme = resolveTheme(definition.theme, themePreference.value)
    cleanup = await initFromProjectDefinition({
      definition,
      container: containerRef.value,
      loadLayerModule: async (layer: ProjectLayerDefinition) => {
        const baseDir = resolvedConfigKey.split('/').slice(0, -1).join('/')
        const normalizedLayerPath = layer.module.startsWith('./')
          ? `${baseDir}/${layer.module.slice(2)}`
          : `${baseDir}/${layer.module}`
        const resolvedLayerKey = resolveGlobKey(normalizedLayerPath, layerModules)
          ?? resolveGlobKey(normalizedLayerPath.replace(/\.js$/, '.ts'), layerModules)
          ?? resolveGlobKey(normalizedLayerPath.replace(/\.ts$/, '.js'), layerModules)
        const loader = resolvedLayerKey ? layerModules[resolvedLayerKey] : undefined
        if (!loader) {
          throw new Error(
            `Layer module not found for project "${definition.id}": ${normalizedLayerPath}`
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
        }
      }
    })

    if (shouldInjectSvgAction && !actionHandlers[DOWNLOAD_SVG_ACTION_KEY]) {
      actionHandlers[DOWNLOAD_SVG_ACTION_KEY] = createSvgDownloadFallback()
    }
    if (shouldInjectPngAction && !actionHandlers[DOWNLOAD_PNG_ACTION_KEY]) {
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

// Watch for project changes
watch(() => props.project, () => {
  loadProject()
}, { immediate: false })

watch(
  () => route.query,
  () => {
    if (!activeProjectControls.value.length) return
    initializeControls(activeProjectControls.value)
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
