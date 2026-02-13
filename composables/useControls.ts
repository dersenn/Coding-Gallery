import type { ControlDefinition, ControlValues } from '~/types/project'

export const useControls = () => {
  const route = useRoute()
  const router = useRouter()
  const controlValues = useState<ControlValues>('controlValues', () => ({}))

  const initializeControls = (controls?: ControlDefinition[]) => {
    if (!controls) {
      controlValues.value = {}
      return
    }

    const defaults: ControlValues = {}
    
    // First, set defaults
    controls.forEach(control => {
      defaults[control.key] = control.default
    })

    // Then, override with URL params if they exist
    controls.forEach(control => {
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

  const resetControls = (controls?: ControlDefinition[]) => {
    if (!controls) return
    
    // Remove control params from URL
    const newQuery = { ...route.query }
    controls.forEach(control => {
      delete newQuery[control.key]
    })
    router.replace({ query: newQuery })
    
    // Reset to defaults
    initializeControls(controls)
  }

  return {
    controlValues,
    initializeControls,
    updateControl,
    resetControls
  }
}
