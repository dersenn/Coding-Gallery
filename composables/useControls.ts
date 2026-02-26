import type {
  ControlDefinition,
  ControlGroupDefinition,
  ControlPrimitiveValue,
  ControlValue,
  ControlValues,
  ProjectControlDefinition
} from '~/types/project'

export const syncControlState = <T extends Record<string, ControlValue>>(
  state: T,
  incoming: ControlValues
) => {
  (Object.keys(state) as Array<keyof T>).forEach((key) => {
    const value = incoming[key as string]
    if (value !== undefined) {
      state[key] = value as T[typeof key]
    }
  })
}

const isControlGroup = (
  control: ProjectControlDefinition
): control is ControlGroupDefinition => control.type === 'group'

export const flattenControls = (
  controls?: ProjectControlDefinition[]
): ControlDefinition[] => {
  if (!controls) return []

  const flattened: ControlDefinition[] = []
  controls.forEach((control) => {
    if (isControlGroup(control)) {
      flattened.push(...control.controls)
      return
    }
    flattened.push(control)
  })

  return flattened
}

export const useControls = () => {
  const route = useRoute()
  const router = useRouter()
  const controlValues = useState<ControlValues>('controlValues', () => ({}))

  const normalizeQueryValues = (value: string | string[] | null | undefined): string[] => {
    if (value === undefined || value === null) return []
    if (Array.isArray(value)) return value.filter((entry): entry is string => typeof entry === 'string')
    if (value === '') return []
    if (value.includes(',')) {
      return value
        .split(',')
        .map((entry) => entry.trim())
        .filter((entry) => entry.length > 0)
    }
    return [value]
  }

  const coerceScalarWithDefault = (sample: ControlPrimitiveValue, value: string): ControlPrimitiveValue => {
    if (typeof sample === 'number') {
      const parsed = Number.parseFloat(value)
      return Number.isFinite(parsed) ? parsed : sample
    }
    if (typeof sample === 'boolean') {
      return value === 'true'
    }
    return value
  }

  const parseControlValueFromQuery = (control: ControlDefinition, value: string | string[] | null | undefined): ControlValue => {
    if (control.type === 'checkbox-group' || control.type === 'color-list') {
      const values = normalizeQueryValues(value)
      if (!control.default.length) return values

      const sample = control.default[0]
      if (typeof sample === 'number') {
        return values
          .map((entry) => Number.parseFloat(entry))
          .filter((entry) => Number.isFinite(entry))
      }
      return values
    }

    const normalized = normalizeQueryValues(value)
    if (!normalized.length) return control.default
    return coerceScalarWithDefault(control.default as ControlPrimitiveValue, normalized[0]!)
  }

  const serializeControlValueForQuery = (value: ControlValue): string | string[] => {
    if (Array.isArray(value)) return value.map((entry) => String(entry))
    return String(value)
  }

  const initializeControls = (controls?: ProjectControlDefinition[]) => {
    const leafControls = flattenControls(controls)
    if (!leafControls.length) {
      controlValues.value = {}
      return
    }

    const defaults: ControlValues = {}
    
    // First, set defaults
    leafControls.forEach(control => {
      defaults[control.key] = control.default
    })

    // Then, override with URL params if they exist
    leafControls.forEach(control => {
      const urlValue = route.query[control.key]
      if (urlValue !== undefined && urlValue !== null) {
        defaults[control.key] = parseControlValueFromQuery(control, urlValue as string | string[] | null)
      }
    })

    controlValues.value = defaults
  }

  const updateControl = (key: string, value: ControlValue) => {
    controlValues.value[key] = value
    
    // Persist to URL
    const newQuery = { ...route.query, [key]: serializeControlValueForQuery(value) }
    router.replace({ query: newQuery })
  }

  const resetControls = async (controls?: ProjectControlDefinition[]) => {
    const leafControls = flattenControls(controls)
    if (!leafControls.length) return
    
    // Remove control params from URL
    const newQuery = { ...route.query }
    leafControls.forEach(control => {
      delete newQuery[control.key]
    })
    await router.replace({ query: newQuery })
    
    // Reset to defaults
    initializeControls(leafControls)
  }

  return {
    controlValues,
    initializeControls,
    updateControl,
    resetControls
  }
}
