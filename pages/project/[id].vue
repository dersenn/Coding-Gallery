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
      :class="canShowControlsUI && isPanelExpanded ? 'bottom-0 w-80' : 'w-auto'"
    >
      <div
        class="flex flex-col text-white transition-all duration-300 ease-out"
        :class="canShowControlsUI && isPanelExpanded
          ? `h-full ${showControls ? 'bg-black/50 backdrop-blur-md' : ''}`
          : ''"
      >
        <div
          class="self-end flex items-center gap-3 p-4"
        >
          <h1 class="text-2xl leading-tight">{{ project.title }}</h1>
          <UButton
            v-if="canShowControlsUI"
            :icon="showControls ? 'i-heroicons-eye-slash' : 'i-heroicons-adjustments-horizontal'"
            @click="showControls = !showControls"
            size="xl"
            color="neutral"
            variant="ghost"
          />
        </div>

        <Transition name="slide-left" @after-leave="handleControlsAfterLeave">
          <div v-if="canShowControlsUI && showControls" class="flex-1 min-h-0">
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
import type {
  CheckboxGroupControlDefinition,
  ProjectActionDefinition,
  ProjectControlDefinition,
  SelectControlDefinition
} from '~/types/project'
import { flattenControls } from '~/composables/useControls'

const route = useRoute()
const router = useRouter()
const { getProjectById } = useProjectLoader()
const { utils } = useGenerativeUtils()
const { controlValues, resetControls } = useControls()

const project = computed(() => getProjectById(route.params.id as string))
const canShowControlsUI = computed(() => !!project.value && !project.value.noControls)
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
    await resetControls(loadedControls.value)
    return
  }

  if (key === 'new-seed') {
    const seed = createSeed()
    utils.seed.set(seed)
    await router.push({
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

const getRandomIndices = (availableCount: number, selectionCount: number): string[] => {
  const max = Math.max(0, Math.floor(availableCount))
  const target = Math.min(Math.max(0, Math.floor(selectionCount)), max)
  const pool = Array.from({ length: max }, (_, index) => index)
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j]!, pool[i]!]
  }
  return pool.slice(0, target).sort((a, b) => a - b).map(String)
}

const getPearlymatsReloadColorSelection = (): string[] | null => {
  if (project.value?.id !== 'pearlymats') return null

  const controls = flattenControls(loadedControls.value)
  const colorCheckboxGroup = controls.find(
    (control): control is CheckboxGroupControlDefinition =>
      control.type === 'checkbox-group' && control.key === 'selectedPaletteIndices'
  )
  if (!colorCheckboxGroup) return null
  const selectedValues = controlValues.value.selectedPaletteIndices
  const selectedCountFromState = Array.isArray(selectedValues) ? selectedValues.length : 0
  const defaultSelectionCount = Array.isArray(colorCheckboxGroup.default)
    ? colorCheckboxGroup.default.length
    : 0
  const targetSelectionCount = selectedCountFromState > 0
    ? selectedCountFromState
    : (defaultSelectionCount > 0 ? defaultSelectionCount : 3)

  let availableCount = colorCheckboxGroup.options.length
  if (colorCheckboxGroup.visibleCountFromSelectKey && colorCheckboxGroup.visibleCountBySelectValue) {
    const paletteControl = controls.find(
      (control): control is SelectControlDefinition =>
        control.type === 'select' && control.key === colorCheckboxGroup.visibleCountFromSelectKey
    )
    const queryPaletteValue = route.query[colorCheckboxGroup.visibleCountFromSelectKey]
    const currentPaletteValue = Array.isArray(queryPaletteValue)
      ? queryPaletteValue[0]
      : queryPaletteValue
    const resolvedPaletteValue = currentPaletteValue ?? paletteControl?.default
    const mappedCount = resolvedPaletteValue !== undefined
      ? colorCheckboxGroup.visibleCountBySelectValue[String(resolvedPaletteValue)]
      : undefined
    if (mappedCount !== undefined) {
      availableCount = Math.max(0, Math.floor(mappedCount))
    }
  }

  return getRandomIndices(availableCount, targetSelectionCount)
}

const handleKeyboardShortcut = async (event: KeyboardEvent) => {
  // Preserve browser/system shortcuts such as Cmd+R / Ctrl+R.
  if (event.metaKey || event.ctrlKey || event.altKey) {
    return
  }

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
    const randomReloadSelection = getPearlymatsReloadColorSelection()
    if (randomReloadSelection) {
      await router.push({
        query: {
          ...route.query,
          selectedPaletteIndices: randomReloadSelection
        }
      })
    }
    viewerInstanceKey.value += 1
    return
  }

  if (event.key.toLowerCase() === 'n') {
    event.preventDefault()
    void handleControlAction('new-seed')
    return
  }

  if (event.key.toLowerCase() === 'd') {
    event.preventDefault()
    void handleControlAction('reset-controls')
    return
  }

  if (event.key.toLowerCase() === 's') {
    const hasDownloadAction = loadedActions.value.some((action) => action.key === 'download-svg')
    if (!hasDownloadAction) return
    event.preventDefault()
    void handleControlAction('download-svg')
  }
}

// Restore showControls state from localStorage
const showControls = ref(false)
const restoreShowControlsPreference = () => {
  if (!canShowControlsUI.value) {
    showControls.value = false
    isPanelExpanded.value = false
    return
  }

  const savedState = localStorage.getItem('showControls')
  if (savedState !== null) {
    showControls.value = savedState === 'true'
    isPanelExpanded.value = showControls.value
  }
}

onMounted(() => {
  restoreShowControlsPreference()
  window.addEventListener('keydown', handleKeyboardShortcut)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyboardShortcut)
})

// Persist showControls state to localStorage
watch(showControls, (newValue) => {
  if (!canShowControlsUI.value) {
    isPanelExpanded.value = false
    return
  }

  if (newValue) {
    isPanelExpanded.value = true
  }
  localStorage.setItem('showControls', newValue.toString())
})

watch(canShowControlsUI, () => {
  restoreShowControlsPreference()
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
