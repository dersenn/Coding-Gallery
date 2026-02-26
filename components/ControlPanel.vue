<template>
  <div class="h-full flex flex-col p-4 font-medium text-sm text-white">
    <div class="mb-4 space-y-2">
      <button
        type="button"
        class="w-full px-3 py-2 rounded-md bg-white/20 hover:bg-white/30 transition-colors font-semibold"
        @click="emit('action', 'new-seed')"
      >
        New Seed
      </button>
      <div class="flex gap-2">
        <button
          type="button"
          class="flex-1 px-3 py-2 rounded-md bg-white/10 hover:bg-white/20 transition-colors"
          @click="emit('action', 'reset-controls')"
        >
          Reset
        </button>
        <button
          v-for="action in contextActions"
          :key="action.key"
          type="button"
          class="flex-1 px-3 py-2 rounded-md bg-white/10 hover:bg-white/20 transition-colors"
          @click="emit('action', action.key)"
        >
          {{ action.label }}
        </button>
      </div>
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
          <template v-for="control in section.controls" :key="control.key">
            <div v-if="isControlVisible(control)">
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
              @change="updateSelectControlValue(control.key, ($event.target as HTMLSelectElement).value)"
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

            <!-- Checkbox Group -->
            <div
              v-else-if="control.type === 'checkbox-group'"
              class="space-y-2"
            >
              <label
                v-for="option in getVisibleCheckboxOptions(control)"
                :key="option.value"
                class="flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="checkbox"
                  :checked="isCheckboxOptionSelected(control, option.value)"
                  @change="toggleCheckboxOption(control, option.value, ($event.target as HTMLInputElement).checked)"
                  class="w-4 h-4 rounded cursor-pointer accent-foreground"
                />
                <span
                  v-if="getCheckboxOptionSwatch(control, option)"
                  class="inline-block w-3 h-3 rounded border border-white/30"
                  :style="{ backgroundColor: getCheckboxOptionSwatch(control, option) }"
                />
                <span>{{ getCheckboxOptionLabel(control, option) }}</span>
              </label>
            </div>

            <!-- Color List -->
            <div
              v-else-if="control.type === 'color-list'"
              class="space-y-2"
            >
              <div
                v-for="(value, index) in getColorListValues(control.key)"
                :key="`${control.key}-${index}`"
                class="flex items-center gap-2"
              >
                <input
                  type="color"
                  :value="value"
                  @input="updateColorListValue(control.key, index, ($event.target as HTMLInputElement).value)"
                  class="flex-1 h-9 rounded cursor-pointer bg-black/30"
                />
                <button
                  type="button"
                  class="px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  :disabled="!canRemoveColor(control)"
                  @click="removeColorListValue(control, index)"
                >
                  -
                </button>
              </div>
              <button
                type="button"
                class="px-3 py-2 rounded-md bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                :disabled="!canAddColor(control)"
                @click="addColorListValue(control)"
              >
                Add color
              </button>
            </div>

            <!-- Color -->
            <input
              v-else-if="control.type === 'color'"
              type="color"
              :value="controlValues[control.key]"
              @input="updateControl(control.key, ($event.target as HTMLInputElement).value)"
              class="w-full h-10 rounded cursor-pointer bg-black/30 font-medium"
            />
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type {
  CheckboxGroupControlDefinition,
  ColorListControlDefinition,
  ControlDefinition,
  ControlGroupDefinition,
  ControlOptionDefinition,
  ControlValue,
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

const asArrayValue = (value: ControlValue | undefined): Array<string | number> => {
  if (!Array.isArray(value)) return []
  return value
}

const isCheckboxOptionSelected = (
  control: CheckboxGroupControlDefinition,
  optionValue: string | number
): boolean => {
  const selected = asArrayValue(controlValues.value[control.key])
  return selected.some((value) => String(value) === String(optionValue))
}

const toggleCheckboxOption = (
  control: CheckboxGroupControlDefinition,
  optionValue: string | number,
  checked: boolean
) => {
  const selected = asArrayValue(controlValues.value[control.key])
  const sample = control.default[0]
  const normalize = (value: string | number) => (
    typeof sample === 'number' ? Number(value) : String(value)
  )
  const current = selected.map(normalize)
  const target = normalize(optionValue)
  const next = checked
    ? (current.some((value) => value === target) ? current : [...current, target])
    : current.filter((value) => value !== target)

  updateControl(control.key, next as number[] | string[])
}

const resolveVisibleCountFromControlValue = (value: ControlValue | undefined): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.floor(value))
  }
  if (Array.isArray(value)) {
    return value.length
  }
  return null
}

const getVisibleCheckboxOptions = (control: CheckboxGroupControlDefinition) => {
  let visibleCount = control.options.length

  if (control.visibleCountFromSelectKey && control.visibleCountBySelectValue) {
    const selectValue = controlValues.value[control.visibleCountFromSelectKey]
    const mapped = control.visibleCountBySelectValue[String(selectValue)]
    if (mapped !== undefined) {
      visibleCount = Math.max(0, Math.floor(mapped))
    }
  }

  if (control.visibleCountFromKey && visibleCount <= 0) {
    const fallbackCount = resolveVisibleCountFromControlValue(controlValues.value[control.visibleCountFromKey])
    if (fallbackCount !== null) {
      visibleCount = fallbackCount
    }
  }

  return control.options.slice(0, Math.max(0, visibleCount))
}

const getCheckboxSelectValue = (control: CheckboxGroupControlDefinition): string | null => {
  if (!control.visibleCountFromSelectKey) return null
  const value = controlValues.value[control.visibleCountFromSelectKey]
  return typeof value === 'string' || typeof value === 'number' ? String(value) : null
}

const getColorListByKey = (key: string | undefined): string[] => {
  if (!key) return []
  const value = controlValues.value[key]
  if (!Array.isArray(value)) return []
  return value
    .map((entry) => String(entry))
    .filter((entry) => /^#[0-9a-fA-F]{6}$/.test(entry))
}

const getCheckboxOptionIndex = (control: CheckboxGroupControlDefinition, option: ControlOptionDefinition): number => {
  return getVisibleCheckboxOptions(control)
    .findIndex((candidate) => String(candidate.value) === String(option.value))
}

const getCheckboxOptionLabel = (
  control: CheckboxGroupControlDefinition,
  option: ControlOptionDefinition
): string => {
  const selectValue = getCheckboxSelectValue(control)
  const optionIndex = getCheckboxOptionIndex(control, option)
  if (optionIndex < 0) return option.label

  if (selectValue && control.optionLabelsBySelectValue?.[selectValue]?.[optionIndex]) {
    return control.optionLabelsBySelectValue[selectValue]![optionIndex]!
  }

  if (selectValue && control.optionLabelsFromKeyBySelectValue?.[selectValue]) {
    const labels = getColorListByKey(control.optionLabelsFromKeyBySelectValue[selectValue])
    if (labels[optionIndex]) return labels[optionIndex]!
  }

  return option.label
}

const getCheckboxOptionSwatch = (
  control: CheckboxGroupControlDefinition,
  option: ControlOptionDefinition
): string | undefined => {
  const selectValue = getCheckboxSelectValue(control)
  const optionIndex = getCheckboxOptionIndex(control, option)
  if (optionIndex < 0) return option.swatch

  if (selectValue && control.optionSwatchesBySelectValue?.[selectValue]?.[optionIndex]) {
    return control.optionSwatchesBySelectValue[selectValue]![optionIndex]!
  }

  if (selectValue && control.optionSwatchesFromKeyBySelectValue?.[selectValue]) {
    const swatches = getColorListByKey(control.optionSwatchesFromKeyBySelectValue[selectValue])
    if (swatches[optionIndex]) return swatches[optionIndex]!
  }

  return option.swatch
}

const getColorListValues = (key: string): string[] => {
  const value = controlValues.value[key]
  if (!Array.isArray(value)) return []
  return value
    .map((entry) => String(entry))
    .filter((entry) => /^#[0-9a-fA-F]{6}$/.test(entry))
}

const isControlVisible = (control: ControlDefinition): boolean => {
  if (control.type !== 'color-list') return true
  if (!control.visibleWhenSelectKey) return true

  const selectValue = controlValues.value[control.visibleWhenSelectKey]
  if (selectValue === undefined) return false

  if (control.visibleWhenSelectValues && control.visibleWhenSelectValues.length > 0) {
    return control.visibleWhenSelectValues
      .some((value) => String(value) === String(selectValue))
  }

  if (control.visibleWhenSelectValue !== undefined) {
    return String(control.visibleWhenSelectValue) === String(selectValue)
  }

  return true
}

const canAddColor = (control: ColorListControlDefinition): boolean => {
  const values = getColorListValues(control.key)
  return control.maxItems === undefined || values.length < control.maxItems
}

const canRemoveColor = (control: ColorListControlDefinition): boolean => {
  const values = getColorListValues(control.key)
  const minItems = control.minItems ?? 1
  return values.length > minItems
}

const updateColorListValue = (key: string, index: number, value: string) => {
  const values = getColorListValues(key)
  if (index < 0 || index >= values.length) return
  values[index] = value
  updateControl(key, values)
}

const addColorListValue = (control: ColorListControlDefinition) => {
  if (!canAddColor(control)) return
  const values = getColorListValues(control.key)
  const fallback = values[values.length - 1] ?? '#ffffff'
  updateControl(control.key, [...values, fallback])
}

const removeColorListValue = (control: ColorListControlDefinition, index: number) => {
  if (!canRemoveColor(control)) return
  const values = getColorListValues(control.key)
  if (index < 0 || index >= values.length) return
  const next = values.filter((_, valueIndex) => valueIndex !== index)
  updateControl(control.key, next)
}

const updateSelectControlValue = (key: string, value: string) => {
  const current = controlValues.value[key]
  if (typeof current === 'number') {
    const parsed = Number.parseFloat(value)
    updateControl(key, Number.isFinite(parsed) ? parsed : current)
    return
  }

  updateControl(key, value)
}
</script>
