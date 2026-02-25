import type {
  ControlDefinition,
  ControlGroupDefinition,
  ControlValues,
  ProjectControlDefinition
} from '~/types/project'

type ControlPrimitive = number | boolean | string

export const syncControlState = <T extends Record<string, ControlPrimitive>>(
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
        // Parse based on control type
        switch (control.type) {
          case 'slider':
            defaults[control.key] = parseFloat(urlValue as string)
            break
          case 'toggle':
            defaults[control.key] = urlValue === 'true'
            break
          case 'color':
          case 'select':
            defaults[control.key] = urlValue as string
            break
        }
      }
    })

    controlValues.value = defaults
  }

  const updateControl = (key: string, value: number | boolean | string) => {
    controlValues.value[key] = value
    
    // Persist to URL
    const newQuery = { ...route.query, [key]: value.toString() }
    router.replace({ query: newQuery })
  }

  const resetControls = (controls?: ProjectControlDefinition[]) => {
    const leafControls = flattenControls(controls)
    if (!leafControls.length) return
    
    // Remove control params from URL
    const newQuery = { ...route.query }
    leafControls.forEach(control => {
      delete newQuery[control.key]
    })
    router.replace({ query: newQuery })
    
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
