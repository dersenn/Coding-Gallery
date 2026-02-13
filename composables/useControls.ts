import type { ControlDefinition, ControlValues } from '~/types/project'

export const useControls = () => {
  const controlValues = useState<ControlValues>('controlValues', () => ({}))

  const initializeControls = (controls?: ControlDefinition[]) => {
    if (!controls) {
      controlValues.value = {}
      return
    }

    const defaults: ControlValues = {}
    controls.forEach(control => {
      defaults[control.key] = control.default
    })
    controlValues.value = defaults
  }

  const updateControl = (key: string, value: number | boolean | string) => {
    controlValues.value[key] = value
    
    // Dispatch custom event for iframe projects to listen to
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('control-change', {
        detail: { key, value, all: controlValues.value }
      }))
    }
  }

  const resetControls = (controls?: ControlDefinition[]) => {
    initializeControls(controls)
  }

  return {
    controlValues,
    initializeControls,
    updateControl,
    resetControls
  }
}
