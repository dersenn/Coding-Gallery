import type {
  ControlDefinition,
  ControlGroupDefinition,
  ProjectActionDefinition,
  ProjectControlDefinition,
  ProjectDefinition,
  RuntimeActionCapabilities,
  ScopedProjectActions,
  ScopedProjectControls,
  SelectControlDefinition
} from '~/types/project'

interface NormalizeScopedProjectConfigResult {
  controls: ScopedProjectControls
  actions: ScopedProjectActions
}

interface ResolveEffectiveActionsArgs {
  activeLayerId?: string
  scopedActions: ScopedProjectActions
  capabilities: RuntimeActionCapabilities
}

const isControlGroup = (
  control: ProjectControlDefinition
): control is ControlGroupDefinition => control.type === 'group'

const flattenControls = (controls: ProjectControlDefinition[]): ControlDefinition[] => {
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

const hasActiveLayerSelect = (controls: ProjectControlDefinition[]): boolean => {
  return flattenControls(controls).some((control) => {
    return control.type === 'select' && control.key === 'activeLayer'
  })
}

const buildAutoLayerControl = (definition: ProjectDefinition): SelectControlDefinition | undefined => {
  const layers = definition.layers ?? []
  if (layers.length <= 1) return undefined

  const defaultLayer = layers.find((layer) => layer.defaultActive)?.id ?? layers[0]?.id
  if (!defaultLayer) return undefined

  return {
    type: 'select',
    label: 'Layer',
    key: 'activeLayer',
    hideLabel: true,
    default: defaultLayer,
    options: layers.map((layer) => ({
      value: layer.id,
      label: layer.label ?? layer.id
    }))
  }
}

const supportsAction = (
  action: ProjectActionDefinition,
  capabilities: RuntimeActionCapabilities
): boolean => {
  if (action.key === 'download-svg') return capabilities.canDownloadSvg
  if (action.key === 'download-png') return capabilities.canDownloadPng
  return true
}

export const normalizeScopedProjectConfig = (
  definition: ProjectDefinition
): NormalizeScopedProjectConfigResult => {
  const sharedControls = [...(definition.controls ?? [])]
  const byLayerControls: ScopedProjectControls['byLayer'] = {}
  const byLayerActions: ScopedProjectActions['byLayer'] = {}

  ;(definition.layers ?? []).forEach((layer) => {
    byLayerControls[layer.id] = [...(layer.controls ?? [])]
    byLayerActions[layer.id] = [...(layer.actions ?? [])]
  })

  const autoLayerControl = hasActiveLayerSelect(sharedControls)
    ? undefined
    : buildAutoLayerControl(definition)
  if (autoLayerControl) {
    sharedControls.unshift(autoLayerControl)
  }

  return {
    controls: {
      shared: sharedControls,
      byLayer: byLayerControls,
      activeLayerControl: autoLayerControl
    },
    actions: {
      shared: [...(definition.actions ?? [])],
      byLayer: byLayerActions
    }
  }
}

export const resolveEffectiveScopedControls = (
  activeLayerId: string | undefined,
  scopedControls: ScopedProjectControls
): ProjectControlDefinition[] => {
  const layerControls = activeLayerId ? (scopedControls.byLayer[activeLayerId] ?? []) : []
  return [...scopedControls.shared, ...layerControls]
}

export const resolveEffectiveScopedActions = (
  args: ResolveEffectiveActionsArgs
): ProjectActionDefinition[] => {
  const layerActions = args.activeLayerId
    ? (args.scopedActions.byLayer[args.activeLayerId] ?? [])
    : []
  return [...args.scopedActions.shared, ...layerActions].filter((action) => {
    return supportsAction(action, args.capabilities)
  })
}
