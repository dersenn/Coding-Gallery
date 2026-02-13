<template>
  <div class="fixed inset-0 bg-black overflow-hidden">
    <!-- Full-screen sketch (z-0) -->
    <ProjectViewer 
      v-if="project" 
      :project="project" 
      class="absolute inset-0"
      @controls-loaded="handleControlsLoaded"
    />

    <!-- Overlay navigation (top-left) -->
    <div class="absolute top-4 left-4 z-10">
      <NuxtLink 
        to="/" 
        class="inline-flex items-center gap-2 px-4 py-2 bg-black/50 backdrop-blur-md rounded-lg hover:bg-black/70 transition text-white border border-white/10"
      >
        <span class="text-lg">←</span>
        <span>Gallery</span>
      </NuxtLink>
    </div>

    <!-- Overlay info (top-right, toggleable) -->
    <div class="absolute top-4 right-4 z-10 max-w-sm">
      <Transition name="slide-left">
        <UCard 
          v-if="showInfo && project"
          class="bg-black/50 backdrop-blur-md border border-white/10"
        >
          <template #header>
            <div class="flex justify-between items-start">
              <div class="flex-1">
                <h1 class="text-lg font-bold text-white">{{ project.title }}</h1>
                <p class="text-xs text-gray-400 mt-1">{{ project.date }}</p>
              </div>
              <UButton 
                icon="i-heroicons-x-mark" 
                size="xs" 
                color="neutral" 
                variant="ghost"
                @click="showInfo = false"
              />
            </div>
          </template>
          
          <div class="space-y-3">
            <p class="text-sm text-gray-300">{{ project.description }}</p>
            
            <div class="flex flex-wrap gap-1.5">
              <UBadge 
                v-for="tag in project.tags" 
                :key="tag"
                color="neutral"
                variant="soft"
                size="xs"
              >
                {{ tag }}
              </UBadge>
            </div>

            <div v-if="project.github" class="pt-2">
              <a 
                :href="project.github" 
                target="_blank"
                class="text-xs text-blue-400 hover:text-blue-300 transition"
              >
                View on GitHub →
              </a>
            </div>
          </div>
        </UCard>
      </Transition>

      <!-- Info toggle button when card is hidden -->
      <UButton 
        v-if="!showInfo"
        icon="i-heroicons-information-circle"
        size="sm"
        color="neutral"
        @click="showInfo = true"
        class="bg-black/50 backdrop-blur-md border border-white/10"
      />
    </div>

    <!-- Overlay controls (bottom-right) -->
    <div 
      v-if="loadedControls?.length" 
      class="absolute bottom-4 right-4 z-10"
    >
      <!-- Show controls button (when collapsed) -->
      <UButton 
        v-if="!showControls"
        icon="i-heroicons-adjustments-horizontal"
        @click="showControls = true"
        size="sm"
        color="neutral"
        class="bg-black/50 backdrop-blur-md border border-white/10"
      >
        Controls
      </UButton>

      <!-- Control panel with hide button (when expanded) -->
      <Transition name="slide-up">
        <div v-if="showControls" class="w-80 space-y-2">
          <ControlPanel :controls="loadedControls" />
          <UButton 
            icon="i-heroicons-chevron-down"
            @click="showControls = false"
            size="xs"
            color="neutral"
            variant="ghost"
            class="w-full bg-black/30 backdrop-blur-md border border-white/10 hover:bg-black/50"
          >
            Hide Controls
          </UButton>
        </div>
      </Transition>
    </div>

    <!-- Project not found message -->
    <div v-if="!project" class="absolute inset-0 flex items-center justify-center">
      <UCard class="bg-black/50 backdrop-blur-md border border-white/10">
        <p class="text-white">Project not found</p>
      </UCard>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ControlDefinition } from '~/types/project'

const route = useRoute()
const { getProjectById } = useProjectLoader()

const project = computed(() => getProjectById(route.params.id as string))
const showInfo = ref(false)
const loadedControls = ref<ControlDefinition[] | undefined>(undefined)

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
  }
})

// Persist showControls state to localStorage
watch(showControls, (newValue) => {
  localStorage.setItem('showControls', newValue.toString())
})
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

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}

.slide-up-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.slide-up-leave-to {
  opacity: 0;
  transform: translateY(20px);
}
</style>
