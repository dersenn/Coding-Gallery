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
  activeSketchId?: string
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

const hasActiveSketchSelect = (controls: ProjectControlDefinition[]): boolean => {
  return flattenControls(controls).some((control) => {
    return control.type === 'select' && control.key === 'activeSketch'
  })
}

const buildAutoSketchControl = (definition: ProjectDefinition): SelectControlDefinition | undefined => {
  const sketches = definition.sketches ?? []
  if (sketches.length <= 1) return undefined

  const defaultLayer = sketches.find((sketch) => sketch.defaultActive)?.id ?? sketches[0]?.id
  if (!defaultLayer) return undefined

  return {
    type: 'select',
    label: 'Sketch',
    key: 'activeSketch',
    hideLabel: true,
    default: defaultLayer,
    options: sketches.map((sketch) => ({
      value: sketch.id,
      label: sketch.label ?? sketch.id
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
  const bySketchControls: ScopedProjectControls['bySketch'] = {}
  const bySketchActions: ScopedProjectActions['bySketch'] = {}

  ;(definition.sketches ?? []).forEach((sketch) => {
    bySketchControls[sketch.id] = [...(sketch.controls ?? [])]
    bySketchActions[sketch.id] = [...(sketch.actions ?? [])]
  })

  const autoLayerControl = hasActiveSketchSelect(sharedControls)
    ? undefined
    : buildAutoSketchControl(definition)
  if (autoLayerControl) {
    sharedControls.unshift(autoLayerControl)
  }

  return {
    controls: {
      shared: sharedControls,
      bySketch: bySketchControls,
      activeSketchControl: autoLayerControl
    },
    actions: {
      shared: [...(definition.actions ?? [])],
      bySketch: bySketchActions
    }
  }
}

export const resolveEffectiveScopedControls = (
  activeSketchId: string | undefined,
  scopedControls: ScopedProjectControls
): ProjectControlDefinition[] => {
  const layerControls = activeSketchId ? (scopedControls.bySketch[activeSketchId] ?? []) : []
  return [...scopedControls.shared, ...layerControls]
}

export const resolveEffectiveScopedActions = (
  args: ResolveEffectiveActionsArgs
): ProjectActionDefinition[] => {
  const layerActions = args.activeSketchId
    ? (args.scopedActions.bySketch[args.activeSketchId] ?? [])
    : []
  return [...args.scopedActions.shared, ...layerActions].filter((action) => {
    return supportsAction(action, args.capabilities)
  })
}
