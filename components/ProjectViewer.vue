<template>
  <div class="w-full">
    <UCard>
      <div class="aspect-square bg-gray-100 flex items-center justify-center">
        <iframe
          v-if="project"
          ref="iframeRef"
          :src="project.entryFile"
          class="w-full h-full border-0"
          sandbox="allow-scripts allow-same-origin"
        />
        <p v-else class="text-gray-500">Loading project...</p>
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
import type { Project } from '~/types/project'

const props = defineProps<{
  project: Project
}>()

const iframeRef = ref<HTMLIFrameElement | null>(null)
const { controlValues } = useControls()

// Send control updates to iframe
watch(controlValues, (newValues) => {
  if (iframeRef.value?.contentWindow) {
    // Convert Vue proxy to plain object for postMessage
    iframeRef.value.contentWindow.postMessage({
      type: 'control-update',
      values: toRaw(newValues)
    }, '*')
  }
}, { deep: true })

// Reload iframe when project changes
watch(() => props.project, () => {
  if (iframeRef.value) {
    iframeRef.value.src = props.project.entryFile
  }
})
</script>
