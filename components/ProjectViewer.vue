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
const { galleryUtils } = useGalleryUtils()

let cleanup: CleanupFunction | null = null
let controlCallbacks: Array<(values: any) => void> = []
let isLoading = ref(true)
let error = ref<string | null>(null)

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

    // Dynamic import of project module
    const module = await import(/* @vite-ignore */ props.project.entryFile) as ProjectModule
    
    if (!module.init) {
      throw new Error('Project module must export an init function')
    }

    // Setup context for the project
    cleanup = await module.init(containerRef.value, {
      controls: toRaw(controlValues.value),
      utils: galleryUtils,
      onControlChange: (callback) => {
        controlCallbacks.push(callback)
      }
    })

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
