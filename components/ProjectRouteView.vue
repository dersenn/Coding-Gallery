<template>
  <div
    class="fixed inset-0 overflow-hidden font-medium project-route"
    :data-project-theme="chromePrefersTheme"
  >
    <!-- Full-screen sketch (z-0) -->
    <Transition name="page" mode="out-in">
      <ProjectViewer
        v-if="project"
        :key="viewerInstanceKey"
        :project="project"
        :action-request="actionRequest"
        class="absolute inset-0"
        @controls-loaded="handleControlsLoaded"
        @actions-loaded="handleActionsLoaded"
        @effective-prefers-theme="handleEffectivePrefersTheme"
      />
    </Transition>

    <!-- Overlay navigation (top-left) -->
    <div class="absolute top-0 left-0 z-10">
      <NuxtLink
        :to="backToGalleryLink"
        class="project-overlay-type inline-flex items-center gap-2 p-4 rounded-lg transition text-2xl font-medium opacity-90 hover:opacity-70"
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
        class="flex flex-col transition-all duration-300 ease-out"
        :class="canShowControlsUI && isPanelExpanded
          ? `h-full ${showControls ? 'project-panel-surface backdrop-blur-sm' : ''}`
          : ''"
      >
        <div class="self-end flex flex-col items-end gap-1 p-4">
          <div class="flex items-center gap-3">
            <h1 class="project-overlay-type text-2xl leading-tight">{{ project.title }}</h1>
            <UButton
              v-if="pauseEnabled"
              :icon="paused ? 'i-heroicons-play' : 'i-heroicons-pause'"
              @click="togglePause()"
              size="xl"
              color="neutral"
              variant="ghost"
            />
            <UButton
              v-if="canShowControlsUI"
              :icon="showControls ? 'i-heroicons-eye-slash' : 'i-heroicons-adjustments-horizontal'"
              @click="showControls = !showControls"
              size="xl"
              color="neutral"
              variant="ghost"
            />
          </div>
          <select
            v-if="hasMultipleSketches"
            :value="String(controlValues.activeSketch ?? '')"
            class="project-overlay-type text-sm bg-transparent border-none p-0 cursor-pointer opacity-60 hover:opacity-100 transition-opacity"
            @change="handleSketchSelect(($event.target as HTMLSelectElement).value)"
          >
            <option
              v-for="opt in sketchOptions"
              :key="String(opt.value)"
              :value="String(opt.value)"
            >{{ opt.label }}</option>
          </select>
        </div>

        <Transition name="slide-left" @after-leave="handleControlsAfterLeave">
          <div v-if="canShowControlsUI && showControls" class="flex-1 min-h-0">
            <ControlPanel
              :controls="controlsForPanel"
              :context-actions="visibleActions"
              :panel-state-key="project.id"
              class="h-full"
              @action="handleControlAction"
            />
          </div>
        </Transition>
      </div>
    </div>

    <div
      v-if="project"
      class="absolute inset-x-0 bottom-0 z-10 flex justify-center pb-3 pointer-events-none"
    >
      <div class="project-shortcut-pill pointer-events-auto flex flex-wrap items-center justify-center gap-x-3 gap-y-1 px-3 py-1.5 rounded-full backdrop-blur-sm text-[11px]">
        <template v-for="hint in shortcutHints" :key="hint.key">
          <button
            class="whitespace-nowrap bg-transparent border-none p-0 text-inherit font-inherit leading-none cursor-pointer hover:opacity-70 transition-opacity"
            @click="hint.action()"
          >
            <span class="font-mono project-text-muted">[{{ hint.key }}]</span>
            {{ hint.label }}
          </button>
        </template>
        <span class="whitespace-nowrap">
          <span class="project-text-muted">seed: </span>
          <span class="font-mono">{{ currentSeed }}</span>
        </span>
      </div>
    </div>

    <!-- Project not found message -->
    <div v-if="!project" class="absolute inset-0 flex items-center justify-center">
      <UCard class="project-not-found-card backdrop-blur-md border">
        <p class="text-sm">Project not found</p>
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

const props = defineProps<{
  projectId: string
}>()

const route = useRoute()
const router = useRouter()
const { getProjectById } = useProjectLoader()
const { utils } = useGenerativeUtils()
const { controlValues, resetSketchControls, resetAllControls } = useControls()
const { paused, pauseEnabled, togglePause } = usePlayback()

const project = computed(() => getProjectById(props.projectId))
const basePageTitle = "Things I've Coded…"
useHead(() => ({
  title: project.value ? `${basePageTitle} ${project.value.title}` : basePageTitle
}))
const canShowControlsUI = computed(() => !!project.value && !project.value.noControls)
const loadedControls = ref<ProjectControlDefinition[]>([])
const loadedActions = ref<ProjectActionDefinition[]>([])
const isActionVisible = (action: ProjectActionDefinition): boolean => {
  if (!action.visibleWhenSelectKey) return true
  const selectedValue = controlValues.value[action.visibleWhenSelectKey]
  if (selectedValue === undefined) return false
  if (action.visibleWhenSelectValues && action.visibleWhenSelectValues.length > 0) {
    return action.visibleWhenSelectValues.some((value) => String(value) === String(selectedValue))
  }
  if (action.visibleWhenSelectValue !== undefined) {
    return String(action.visibleWhenSelectValue) === String(selectedValue)
  }
  return true
}
const visibleActions = computed(() => loadedActions.value.filter((action) => isActionVisible(action)))
const isPanelExpanded = ref(false)
const viewerInstanceKey = ref(0)
const actionRequest = ref<{ key: string; nonce: number } | null>(null)
const actionNonce = ref(0)
const activeSketchControl = computed(() =>
  flattenControls(loadedControls.value).find(
    (c): c is SelectControlDefinition => c.type === 'select' && c.key === 'activeSketch'
  ) ?? null
)
const sketchOptions = computed(() => activeSketchControl.value?.options ?? [])
const hasMultipleSketches = computed(() => sketchOptions.value.length > 1)
const controlsForPanel = computed(() =>
  loadedControls.value.filter(
    (c) => !(c.type === 'select' && c.key === 'activeSketch')
  )
)
const handleSketchSelect = (sketchId: string) => {
  viewerInstanceKey.value += 1
  void router.push({ query: { ...route.query, activeSketch: sketchId } })
}

const hasSvgDownloadAction = computed(() => {
  return visibleActions.value.some((action) => action.key === 'download-svg')
})
const hasPngDownloadAction = computed(() => {
  return visibleActions.value.some((action) => action.key === 'download-png')
})

const shortcutHints = computed(() => {
  const hints: Array<{ key: string; label: string; action: () => void }> = [
    { key: 'n', label: 'new seed', action: () => { void handleControlAction('new-seed') } },
  ]
  if (pauseEnabled.value) {
    hints.push({ key: 'space', label: paused.value ? 'play' : 'pause', action: togglePause })
  }
  if (canShowControlsUI.value) {
    hints.push({ key: 'd', label: 'reset sketch', action: () => { void handleControlAction('reset-sketch-controls') } })
  }
  if (hasSvgDownloadAction.value) {
    hints.push({ key: 's', label: 'save SVG', action: () => { void handleControlAction('download-svg') } })
  } else if (hasPngDownloadAction.value) {
    hints.push({ key: 's', label: 'save PNG', action: () => { void handleControlAction('download-png') } })
  }
  return hints
})
const currentSeed = computed(() => {
  const querySeed = route.query.seed
  if (typeof querySeed === 'string' && querySeed.length > 0) return querySeed
  if (Array.isArray(querySeed) && typeof querySeed[0] === 'string' && querySeed[0].length > 0) {
    return querySeed[0]
  }
  const runtimeSeed = utils.seed.current
  if (typeof runtimeSeed === 'string' && runtimeSeed.length > 0) return runtimeSeed
  return '—'
})
const backToGalleryLink = computed(() => {
  const tokenFromQuery = route.query.showHidden
  const showHiddenToken = typeof tokenFromQuery === 'string'
    ? tokenFromQuery
    : (Array.isArray(tokenFromQuery) && typeof tokenFromQuery[0] === 'string' ? tokenFromQuery[0] : '')

  if (showHiddenToken.length > 0) {
    return {
      path: '/',
      query: {
        showHidden: showHiddenToken
      }
    }
  }

  return {
    path: '/'
  }
})
const chromePrefersTheme = ref<'dark' | 'light'>('dark')

watch(
  project,
  (next) => {
    chromePrefersTheme.value = next?.prefersTheme ?? 'dark'
  },
  { immediate: true }
)

const handleEffectivePrefersTheme = (pref: 'dark' | 'light') => {
  chromePrefersTheme.value = pref
}

// Handle controls loaded from module
const handleControlsLoaded = (controls: ProjectControlDefinition[]) => {
  loadedControls.value = controls || []
}

const handleActionsLoaded = (actions: ProjectActionDefinition[]) => {
  loadedActions.value = (actions || []).map((action) => (
    action.key === 'download-svg'
      ? { ...action, label: 'Save SVG' }
      : action.key === 'download-png'
        ? { ...action, label: 'Save PNG' }
      : action
  ))
}

const seedAlphabet = '123456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ'
const createSeed = () => {
  const chars = Array.from({ length: 49 }, () => {
    return seedAlphabet[Math.floor(Math.random() * seedAlphabet.length)]
  }).join('')
  return `oo${chars}`
}

const handleControlAction = async (key: string) => {
  if (key === 'reset-controls' || key === 'reset-sketch-controls') {
    await resetSketchControls({ preserveKeys: ['activeSketch'] })
    return
  }

  if (key === 'reset-all-controls') {
    await resetAllControls({ preserveKeys: ['activeSketch'] })
    return
  }

  if (key === 'new-seed') {
    const seed = createSeed()
    utils.seed.set(seed)
    viewerInstanceKey.value += 1
    await router.push({
      query: {
        ...route.query,
        seed
      }
    })
    return
  }

  actionNonce.value += 1
  actionRequest.value = { key, nonce: actionNonce.value }
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

  if (pauseEnabled.value && event.code === 'Space') {
    event.preventDefault()
    togglePause()
    return
  }

  if (event.key.toLowerCase() === 'n') {
    event.preventDefault()
    void handleControlAction('new-seed')
    return
  }

  if (event.key.toLowerCase() === 'd') {
    event.preventDefault()
    void handleControlAction('reset-sketch-controls')
    return
  }

  if (event.key.toLowerCase() === 's') {
    if (!hasSvgDownloadAction.value && !hasPngDownloadAction.value) return
    event.preventDefault()
    void handleControlAction(hasSvgDownloadAction.value ? 'download-svg' : 'download-png')
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

watch(() => props.projectId, () => {
  loadedControls.value = []
  loadedActions.value = []
  actionRequest.value = null
})

const handleControlsAfterLeave = () => {
  isPanelExpanded.value = false
}
</script>

<style scoped>
.project-route {
  background-color: var(--project-page-bg);
  color: var(--project-text);
}

.project-overlay-type {
  text-shadow: var(--project-overlay-shadow);
}

.project-panel-surface {
  background-color: var(--project-panel-bg);
}

.project-shortcut-pill {
  background-color: var(--project-chip-bg);
  color: var(--project-text-faint);
}

.project-text-muted {
  color: var(--project-text-muted);
}

.project-not-found-card {
  background-color: var(--project-card-bg);
  border-color: var(--project-border);
  color: var(--project-text);
}

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
