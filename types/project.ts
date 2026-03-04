import type { GenerativeUtils } from '~/utils/generative'
import type { ThemeOverride, ThemeTokens } from '~/utils/theme'
import type { CanvasMode, CanvasConfig } from '~/utils/canvas'

export type ControlPrimitiveValue = number | boolean | string
export type ControlArrayValue = Array<string | number>
export type ControlValue = ControlPrimitiveValue | ControlArrayValue

export interface ControlOptionDefinition {
  label: string
  value: string | number
  swatch?: string
}

interface BaseControlDefinition {
  label: string
  key: string
  group?: string
  order?: number
  visibleWhenSelectKey?: string
  visibleWhenSelectValue?: ControlPrimitiveValue
  visibleWhenSelectValues?: ControlPrimitiveValue[]
}

export interface SliderControlDefinition extends BaseControlDefinition {
  type: 'slider'
  default: number
  min: number
  max: number
  step: number
}

export interface ToggleControlDefinition extends BaseControlDefinition {
  type: 'toggle'
  default: boolean
}

export interface SelectControlDefinition extends BaseControlDefinition {
  type: 'select'
  default: string | number
  options: ControlOptionDefinition[]
}

export interface ColorControlDefinition extends BaseControlDefinition {
  type: 'color'
  default: string
}

export interface CheckboxGroupControlDefinition extends BaseControlDefinition {
  type: 'checkbox-group'
  default: Array<string | number>
  options: ControlOptionDefinition[]
  visibleCountFromSelectKey?: string
  visibleCountBySelectValue?: Record<string, number>
  visibleCountFromKey?: string
  optionLabelsBySelectValue?: Record<string, string[]>
  optionLabelsFromKeyBySelectValue?: Record<string, string>
  optionSwatchesBySelectValue?: Record<string, string[]>
  optionSwatchesFromKeyBySelectValue?: Record<string, string>
}

export interface ColorListControlDefinition extends BaseControlDefinition {
  type: 'color-list'
  default: string[]
  minItems?: number
  maxItems?: number
}

export type ControlDefinition =
  | SliderControlDefinition
  | ToggleControlDefinition
  | SelectControlDefinition
  | ColorControlDefinition
  | CheckboxGroupControlDefinition
  | ColorListControlDefinition

export interface ControlGroupDefinition {
  type: 'group'
  id: string
  label: string
  controls: ControlDefinition[]
  collapsible?: boolean
  defaultOpen?: boolean
  order?: number
}

export type ProjectControlDefinition = ControlDefinition | ControlGroupDefinition

export interface ControlValues {
  [key: string]: ControlValue
}

export interface ProjectActionDefinition {
  key: string
  label: string
}

export interface Project {
  id: string
  title: string
  description: string
  date: string
  tags: string[]
  thumbnail?: string
  libraries: string[]
  entryFile: string  // Path to JS/TS module (e.g., '/projects/noise-field/index.ts')
  prefersTheme?: 'dark' | 'light' // Optional per-project UI/sketch theme preference
  controls?: ProjectControlDefinition[]
  noControls?: boolean // Hide controls panel/toggle for sketches without controls
  github?: string
  hidden?: boolean  // Hide from gallery (still accessible via direct URL)
}

// Project module interface - all projects must export this
export interface ProjectModule {
  init: (container: HTMLElement, context: ProjectContext) => Promise<CleanupFunction>
  controls?: ProjectControlDefinition[] // Optional: controls can be defined in the module
  actions?: ProjectActionDefinition[] // Optional: contextual actions exposed by the module
  theme?: ThemeOverride // Optional: project-level theme overrides
  canvas?: CanvasMode | CanvasConfig // Optional: declarative canvas sizing intent ('full' | 'square' | '4:3' | …)
}

export interface ProjectContext {
  controls: ControlValues
  utils: GenerativeUtils
  theme: ThemeTokens
  onControlChange: (callback: (controls: ControlValues) => void) => void
  registerAction: (key: string, handler: () => void) => void
}

export type CleanupFunction = () => void

// Re-export common types for convenience in project files
export type { Vec } from '~/utils/generative'
export { quadBezControlPoint, splineControlPoints, quadBezHandles, splineHandles } from '~/utils/generative'
export { SVG, Path, pPt, PathBuilder } from '~/utils/svg'
export { shortcuts } from '~/utils/shortcuts'
export { Grid, GridCell } from '~/utils/grid'
export { Cell } from '~/utils/cell'
export { Color } from '~/utils/color'
export { resolveCanvas } from '~/utils/canvas'
export { resolveInnerFrame } from '~/utils/canvas'
export type { CanvasMode, CanvasConfig, CanvasResult, InnerFrameResult } from '~/utils/canvas'
export {
  createSingleActiveSvgLayerManager,
  createSingleActiveSvgLayerSetup
} from '~/utils/layerRuntime'
export type {
  LayerCanvas,
  SingleActiveSvgLayerRuntime,
  SingleActiveSvgLayerCreateArgs,
  SingleActiveSvgLayerDefinition,
  CreateSingleActiveSvgLayerManagerArgs,
  SingleActiveSvgLayerManager,
  SingleActiveSvgLayerRegistryEntry,
  SingleActiveSvgLayerRegistry,
  SingleActiveSvgLayerSelectOption,
  SingleActiveSvgLayerSetup
} from '~/utils/layerRuntime'
