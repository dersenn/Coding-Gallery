<template>
  <div class="fixed inset-0 bg-black overflow-hidden font-medium">
    <!-- Full-screen sketch (z-0) -->
    <ProjectViewer 
      v-if="project" 
      :project="project" 
      class="absolute inset-0"
      @controls-loaded="handleControlsLoaded"
    />

    <!-- Overlay navigation (top-left) -->
    <div class="absolute top-0 left-0 z-10">
      <NuxtLink 
        to="/" 
        class="inline-flex items-center gap-2 p-4 bg-black/50 backdrop-blur-md rounded-lg hover:bg-black/70 transition text-white text-2xl font-medium"
      >
        ←
      </NuxtLink>
    </div>

    <!-- Combined title + controls panel (right side, flush) -->
    <div
      v-if="project"
      class="absolute top-0 right-0 z-20 transition-all duration-300 ease-out"
      :class="isPanelExpanded && loadedControls?.length ? 'bottom-0 w-80' : 'w-auto'"
    >
      <div
        class="flex flex-col text-white transition-all duration-300 ease-out"
        :class="isPanelExpanded && loadedControls?.length
          ? `h-full ${showControls ? 'bg-black/50 backdrop-blur-md' : ''}`
          : ''"
      >
        <div
          class="self-end flex items-center gap-3 p-4"
        >
          <h1 class="text-2xl leading-tight">{{ project.title }}</h1>
          <UButton
            v-if="loadedControls?.length"
            :icon="showControls ? 'i-heroicons-eye-slash' : 'i-heroicons-adjustments-horizontal'"
            @click="showControls = !showControls"
            size="xl"
            color="neutral"
            variant="ghost"
          />
        </div>

        <Transition name="slide-left" @after-leave="handleControlsAfterLeave">
          <div v-if="showControls && loadedControls?.length" class="flex-1 min-h-0">
            <ControlPanel :controls="loadedControls" class="h-full" />
          </div>
        </Transition>
      </div>
    </div>

    <!-- Project not found message -->
    <div v-if="!project" class="absolute inset-0 flex items-center justify-center">
      <UCard class="bg-black/50 backdrop-blur-md border border-white/10">
        <p class="text-sm text-white">Project not found</p>
      </UCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ControlDefinition } from '~/types/project'

const route = useRoute()
const { getProjectById } = useProjectLoader()

const project = computed(() => getProjectById(route.params.id as string))
const loadedControls = ref<ControlDefinition[] | undefined>(undefined)
const isPanelExpanded = ref(false)

// Handle controls loaded from module
const handleControlsLoaded = (controls: ControlDefinition[]) => {
  loadedControls.value = controls
}

// Restore showControls state from localStorage
const showControls = ref(false)
onMounted(() => {
  const savedState = localStorage.getItem('showControls')
  if (savedState !== null) {
    showControls.value = savedState === 'true'
    isPanelExpanded.value = showControls.value
  }
})

// Persist showControls state to localStorage
watch(showControls, (newValue) => {
  if (newValue) {
    isPanelExpanded.value = true
  }
  localStorage.setItem('showControls', newValue.toString())
})

const handleControlsAfterLeave = () => {
  isPanelExpanded.value = false
}
</script>

<style scoped>
.slide-left-enter-active,
.slide-left-leave-active {
  transition: all 0.3s ease;
}

.slide-left-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.slide-left-leave-to {
  opacity: 0;
  transform: translateX(20px);
}

</style>
