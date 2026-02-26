<template>
  <div ref="containerRef" class="w-full h-full bg-black"></div>
</template>

<script setup lang="ts">
import type {
  CleanupFunction,
  Project,
  ProjectActionDefinition,
  ProjectControlDefinition,
  ProjectModule
} from '~/types/project'
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

// Use Vite's glob import to load project modules from TS or JS sketches
// This creates a map of paths to module loaders
const projectModules = import.meta.glob('~/projects/**/index.{ts,js}') as Record<string, () => Promise<ProjectModule>>
const DOWNLOAD_SVG_ACTION_KEY = 'download-svg'
const DOWNLOAD_SVG_ACTION: ProjectActionDefinition = {
  key: DOWNLOAD_SVG_ACTION_KEY,
  label: 'Download SVG'
}

const hasSvgLibrary = computed(() => {
  return (props.project.libraries || []).some((library) => library.trim().toLowerCase() === 'svg')
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

    // Look up the module loader from the glob import map
    const moduleLoader = projectModules[props.project.entryFile]
    
    if (!moduleLoader) {
      throw new Error(`Project module not found: ${props.project.entryFile}. Available: ${Object.keys(projectModules).join(', ')}`)
    }

    // Load the module
    const module = await moduleLoader() as ProjectModule
    
    if (!module.init) {
      throw new Error('Project module must export an init function')
    }

    // Initialize controls from module if available, otherwise from project metadata
    const controls = module.controls || props.project.controls
    activeProjectControls.value = controls || []
    if (controls) {
      initializeControls(controls)
      emit('controlsLoaded', controls)
    }
    const moduleActions = module.actions || []
    const hasModuleDownloadAction = moduleActions.some((action) => action.key === DOWNLOAD_SVG_ACTION_KEY)
    const shouldInjectDownloadAction = hasSvgLibrary.value && !hasModuleDownloadAction
    const effectiveActions = shouldInjectDownloadAction
      ? [...moduleActions, DOWNLOAD_SVG_ACTION]
      : moduleActions
    emit('actionsLoaded', effectiveActions)

    // Setup context for the project
    const theme = resolveTheme(module.theme)
    cleanup = await module.init(containerRef.value, {
      controls: toRaw(controlValues.value),
      utils,
      theme,
      onControlChange: (callback) => {
        controlCallbacks.push(callback)
      },
      registerAction: (key, handler) => {
        actionHandlers[key] = handler
      }
    })

    if (shouldInjectDownloadAction && !actionHandlers[DOWNLOAD_SVG_ACTION_KEY]) {
      actionHandlers[DOWNLOAD_SVG_ACTION_KEY] = createSvgDownloadFallback()
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
