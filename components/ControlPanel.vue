<template>
  <div class="h-full flex flex-col p-4 font-medium text-sm text-white">
    <div class="mb-4 flex flex-wrap gap-2">
      <button
        type="button"
        class="px-3 py-2 rounded-md bg-white/10 hover:bg-white/20 transition-colors"
        @click="emit('action', 'new-seed')"
      >
        New Seed
      </button>
      <button
        type="button"
        class="px-3 py-2 rounded-md bg-white/10 hover:bg-white/20 transition-colors"
        @click="emit('action', 'reset-controls')"
      >
        Reset
      </button>
      <button
        v-for="action in contextActions"
        :key="action.key"
        type="button"
        class="px-3 py-2 rounded-md bg-white/10 hover:bg-white/20 transition-colors"
        @click="emit('action', action.key)"
      >
        {{ action.label }}
      </button>
    </div>

    <div class="flex-1 min-h-0 overflow-y-auto space-y-4">
      <div
        v-for="section in normalizedSections"
        :key="section.id"
        class="rounded-md"
        :class="section.label || section.collapsible ? 'bg-white/5 p-3' : ''"
      >
        <button
          v-if="section.collapsible"
          type="button"
          class="w-full flex items-center justify-between text-left"
          @click="toggleSection(section.id)"
        >
          <span class="text-xs uppercase tracking-wide">{{ section.label }}</span>
          <span class="text-sm text-white/70">{{ isSectionOpen(section) ? '−' : '+' }}</span>
        </button>
        <div
          v-else-if="section.label"
          class="text-xs uppercase tracking-wide text-white/80"
        >
          {{ section.label }}
        </div>

        <div
          v-show="isSectionOpen(section)"
          class="space-y-4"
          :class="section.label || section.collapsible ? 'mt-3' : ''"
        >
          <div v-for="control in section.controls" :key="control.key">
            <label
              v-if="control.type !== 'toggle'"
              class="flex items-center justify-between font-medium mb-2"
            >
              <span>{{ control.label }}</span>
              <span v-if="control.type === 'slider'" class="font-medium">
                {{ controlValues[control.key] }}
              </span>
            </label>

            <!-- Slider -->
            <div v-if="control.type === 'slider'" class="space-y-2">
              <input
                type="range"
                :min="control.min"
                :max="control.max"
                :step="control.step"
                :value="controlValues[control.key]"
                @input="updateControl(control.key, parseFloat(($event.target as HTMLInputElement).value))"
                class="w-full accent-foreground font-medium"
              />
            </div>

            <!-- Toggle -->
            <label v-else-if="control.type === 'toggle'" class="flex items-center gap-2 cursor-pointer font-medium">
              <input
                type="checkbox"
                :checked="controlValues[control.key] as boolean"
                @change="updateControl(control.key, ($event.target as HTMLInputElement).checked)"
                class="w-5 h-5 rounded cursor-pointer accent-foreground"
              />
              <span class="font-medium">{{ control.label }}</span>
            </label>

            <!-- Select -->
            <select
              v-else-if="control.type === 'select'"
              :value="controlValues[control.key]"
              @change="updateControl(control.key, ($event.target as HTMLSelectElement).value)"
              class="w-full px-3 py-2 bg-black/30 rounded-md focus:outline-none focus:ring-2 focus:ring-foreground text-white font-medium"
            >
              <option
                v-for="option in control.options"
                :key="option.value"
                :value="option.value"
                class="bg-gray-900"
              >
                {{ option.label }}
              </option>
            </select>

            <!-- Color -->
            <input
              v-else-if="control.type === 'color'"
              type="color"
              :value="controlValues[control.key]"
              @input="updateControl(control.key, ($event.target as HTMLInputElement).value)"
              class="w-full h-10 rounded cursor-pointer bg-black/30 font-medium"
            />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type {
  ControlDefinition,
  ControlGroupDefinition,
  ProjectActionDefinition,
  ProjectControlDefinition
} from '~/types/project'

const props = defineProps<{
  controls: ProjectControlDefinition[]
  contextActions?: ProjectActionDefinition[]
  panelStateKey?: string
}>()

const { controlValues, updateControl } = useControls()
const contextActions = computed(() => props.contextActions ?? [])
const openSections = ref<Record<string, boolean>>({})
const panelStateStorageKey = computed(() => {
  if (!props.panelStateKey) return null
  return `controlSections:${props.panelStateKey}`
})

interface ControlSection {
  id: string
  label: string | null
  controls: ControlDefinition[]
  collapsible: boolean
  defaultOpen: boolean
}

const readPersistedSections = (): Record<string, boolean> => {
  if (!import.meta.client || !panelStateStorageKey.value) return {}

  const raw = localStorage.getItem(panelStateStorageKey.value)
  if (!raw) return {}

  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return {}
    }

    const validEntries = Object.entries(parsed).filter((entry): entry is [string, boolean] => {
      return typeof entry[0] === 'string' && typeof entry[1] === 'boolean'
    })

    return Object.fromEntries(validEntries)
  } catch {
    return {}
  }
}

const persistSections = (sections: Record<string, boolean>) => {
  if (!import.meta.client || !panelStateStorageKey.value) return

  try {
    localStorage.setItem(panelStateStorageKey.value, JSON.stringify(sections))
  } catch {
    // Ignore storage errors (quota/private mode) to keep panel functional.
  }
}

const isControlGroup = (
  control: ProjectControlDefinition
): control is ControlGroupDefinition => control.type === 'group'

const normalizedSections = computed<ControlSection[]>(() => {
  const sections: ControlSection[] = []
  const sectionsById = new Map<string, ControlSection>()
  const hasExplicitGroups = props.controls.some((control) => isControlGroup(control))

  const ensureSection = (id: string, label: string | null, collapsible: boolean, defaultOpen: boolean) => {
    const existing = sectionsById.get(id)
    if (existing) return existing

    const section: ControlSection = { id, label, controls: [], collapsible, defaultOpen }
    sectionsById.set(id, section)
    sections.push(section)
    return section
  }

  props.controls.forEach((control) => {
    if (isControlGroup(control)) {
      sections.push({
        id: `group:${control.id}`,
        label: control.label,
        controls: control.controls,
        collapsible: control.collapsible ?? true,
        defaultOpen: control.defaultOpen ?? true
      })
      return
    }

    if (control.group) {
      ensureSection(`meta:${control.group}`, control.group, true, true).controls.push(control)
      return
    }

    ensureSection('default', hasExplicitGroups ? 'General' : null, false, true).controls.push(control)
  })

  return sections.filter((section) => section.controls.length > 0)
})

watch(
  normalizedSections,
  (sections) => {
    if (sections.length === 0) {
      openSections.value = {}
      return
    }

    const persisted = readPersistedSections()
    const next: Record<string, boolean> = {}

    sections.forEach((section) => {
      const persistedValue = persisted[section.id]
      if (persistedValue !== undefined) {
        next[section.id] = persistedValue
        return
      }

      const currentValue = openSections.value[section.id]
      if (currentValue !== undefined) {
        next[section.id] = currentValue
        return
      }

      next[section.id] = section.defaultOpen
    })

    openSections.value = next
    persistSections(next)
  },
  { immediate: true }
)

const isSectionOpen = (section: ControlSection) => !section.collapsible || openSections.value[section.id] !== false

const toggleSection = (sectionId: string) => {
  openSections.value[sectionId] = !(openSections.value[sectionId] !== false)
  persistSections(openSections.value)
}

const emit = defineEmits<{
  action: [key: string]
}>()
</script>
