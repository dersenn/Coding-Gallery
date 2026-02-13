<template>
  <div ref="containerRef" class="w-full h-full bg-black"></div>
</template>

<script setup lang="ts">
import type { Project, ProjectModule, CleanupFunction } from '~/types/project'

const props = defineProps<{
  project: Project
}>()

const containerRef = ref<HTMLElement | null>(null)
const { controlValues } = useControls()
const { utils } = useGenerativeUtils()

let cleanup: CleanupFunction | null = null
let controlCallbacks: Array<(values: any) => void> = []
let isLoading = ref(true)
let error = ref<string | null>(null)

// Use Vite's glob import to load all project modules
// This creates a map of paths to module loaders
const projectModules = import.meta.glob('~/projects/*/index.ts') as Record<string, () => Promise<ProjectModule>>

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
    }

    // Clear container
    containerRef.value.innerHTML = ''

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

    // Setup context for the project
    cleanup = await module.init(containerRef.value, {
      controls: toRaw(controlValues.value),
      utils,
      onControlChange: (callback) => {
        controlCallbacks.push(callback)
      }
    })

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

onMounted(() => {
  loadProject()
})

onUnmounted(() => {
  if (cleanup) {
    cleanup()
  }
})
</script>
