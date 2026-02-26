<template>
  <div class="fixed inset-0 bg-black overflow-hidden font-medium">
    <!-- Full-screen sketch (z-0) -->
    <ProjectViewer 
      v-if="project" 
      :key="viewerInstanceKey"
      :project="project" 
      :action-request="actionRequest"
      class="absolute inset-0"
      @controls-loaded="handleControlsLoaded"
      @actions-loaded="handleActionsLoaded"
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
      :class="isPanelExpanded ? 'bottom-0 w-80' : 'w-auto'"
    >
      <div
        class="flex flex-col text-white transition-all duration-300 ease-out"
        :class="isPanelExpanded
          ? `h-full ${showControls ? 'bg-black/50 backdrop-blur-md' : ''}`
          : ''"
      >
        <div
          class="self-end flex items-center gap-3 p-4"
        >
          <h1 class="text-2xl leading-tight">{{ project.title }}</h1>
          <UButton
            :icon="showControls ? 'i-heroicons-eye-slash' : 'i-heroicons-adjustments-horizontal'"
            @click="showControls = !showControls"
            size="xl"
            color="neutral"
            variant="ghost"
          />
        </div>

        <Transition name="slide-left" @after-leave="handleControlsAfterLeave">
          <div v-if="showControls" class="flex-1 min-h-0">
            <ControlPanel
              :controls="loadedControls"
              :context-actions="loadedActions"
              :panel-state-key="project.id"
              class="h-full"
              @action="handleControlAction"
            />
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
import type { ProjectActionDefinition, ProjectControlDefinition } from '~/types/project'

const route = useRoute()
const router = useRouter()
const { getProjectById } = useProjectLoader()
const { utils } = useGenerativeUtils()
const { resetControls } = useControls()

const project = computed(() => getProjectById(route.params.id as string))
const loadedControls = ref<ProjectControlDefinition[]>([])
const loadedActions = ref<ProjectActionDefinition[]>([])
const isPanelExpanded = ref(false)
const viewerInstanceKey = ref(0)
const actionRequest = ref<{ key: string; nonce: number } | null>(null)
const actionNonce = ref(0)

// Handle controls loaded from module
const handleControlsLoaded = (controls: ProjectControlDefinition[]) => {
  loadedControls.value = controls || []
}

const handleActionsLoaded = (actions: ProjectActionDefinition[]) => {
  loadedActions.value = actions || []
}

const seedAlphabet = '123456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ'
const createSeed = () => {
  const chars = Array.from({ length: 49 }, () => {
    return seedAlphabet[Math.floor(Math.random() * seedAlphabet.length)]
  }).join('')
  return `oo${chars}`
}

const handleControlAction = async (key: string) => {
  if (key === 'reset-controls') {
    resetControls(loadedControls.value)
    return
  }

  if (key === 'new-seed') {
    const seed = createSeed()
    utils.seed.set(seed)
    await router.replace({
      query: {
        ...route.query,
        seed
      }
    })
    viewerInstanceKey.value += 1
    return
  }

  actionNonce.value += 1
  actionRequest.value = { key, nonce: actionNonce.value }
}

const handleKeyboardShortcut = (event: KeyboardEvent) => {
  if (
    event.target instanceof HTMLInputElement ||
    event.target instanceof HTMLTextAreaElement ||
    event.target instanceof HTMLSelectElement ||
    (event.target instanceof HTMLElement && event.target.isContentEditable)
  ) {
    return
  }

  if (event.key.toLowerCase() === 'r') {
    event.preventDefault()
    void handleControlAction('reset-controls')
    return
  }

  if (event.key.toLowerCase() === 'n') {
    event.preventDefault()
    void handleControlAction('new-seed')
    return
  }

  if (event.key.toLowerCase() === 'd') {
    const hasDownloadAction = loadedActions.value.some((action) => action.key === 'download-svg')
    if (!hasDownloadAction) return
    event.preventDefault()
    void handleControlAction('download-svg')
  }
}

// Restore showControls state from localStorage
const showControls = ref(false)
onMounted(() => {
  const savedState = localStorage.getItem('showControls')
  if (savedState !== null) {
    showControls.value = savedState === 'true'
    isPanelExpanded.value = showControls.value
  }
  window.addEventListener('keydown', handleKeyboardShortcut)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyboardShortcut)
})

// Persist showControls state to localStorage
watch(showControls, (newValue) => {
  if (newValue) {
    isPanelExpanded.value = true
  }
  localStorage.setItem('showControls', newValue.toString())
})

watch(() => route.params.id, () => {
  loadedControls.value = []
  loadedActions.value = []
  actionRequest.value = null
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
