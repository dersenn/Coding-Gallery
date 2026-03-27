import type { GenerativeUtils } from '~/utils/generative'
import type { ThemeOverride, ThemeTokens } from '~/utils/theme'
import type { ContainerMode, ContainerConfig } from '~/utils/container'

export type Technique = 'svg' | 'canvas2d' | 'p5'

export type ControlPrimitiveValue = number | boolean | string
export type ControlArrayValue = Array<string | number>
export type ControlValue = ControlPrimitiveValue | ControlArrayValue

export interface ControlOptionDefinition {
  label: string
  value: string | number
  swatch?: string
}

export interface ConditionalVisibilityDefinition {
  visibleWhenSelectKey?: string
  visibleWhenSelectValue?: ControlPrimitiveValue
  visibleWhenSelectValues?: ControlPrimitiveValue[]
}

interface BaseControlDefinition extends ConditionalVisibilityDefinition {
  label: string
  key: string
  hideLabel?: boolean
  group?: string
  order?: number
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

export interface ControlGroupDefinition extends ConditionalVisibilityDefinition {
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

export interface ProjectActionDefinition extends ConditionalVisibilityDefinition {
  key: string
  label: string
  scope?: 'shared' | 'layer'
  layerId?: string
}

export interface ScopedProjectControls {
  shared: ProjectControlDefinition[]
  byLayer: Record<string, ProjectControlDefinition[]>
  activeLayerControl?: SelectControlDefinition
}

export interface ScopedProjectActions {
  shared: ProjectActionDefinition[]
  byLayer: Record<string, ProjectActionDefinition[]>
}

export interface RuntimeActionCapabilities {
  canDownloadSvg: boolean
  canDownloadPng: boolean
}

export interface ProjectLayerDefinition {
  id: string
  label?: string
  technique: Technique
  container?: ContainerMode | ContainerConfig
  module: string
  controls?: ProjectControlDefinition[]
  actions?: ProjectActionDefinition[]
  defaultActive?: boolean
}

export interface ProjectMetadata {
  id: string
  title: string
  description: string
  date: string
  tags: string[]
  thumbnail?: string
  prefersTheme?: 'dark' | 'light' // Optional per-project UI/sketch theme preference
  noControls?: boolean // Hide controls panel/toggle for sketches without controls
  github?: string
  hidden?: boolean  // Hide from gallery (still accessible via direct URL)
}

export interface ProjectIndexEntry extends ProjectMetadata {
  configFile: string // Path to canonical project definition (e.g., '/projects/svg/foo/project.config.ts')
}

export interface ProjectDefinition extends ProjectMetadata {
  techniques?: string[]
  defaultTechnique?: Technique
  container?: ContainerMode | ContainerConfig
  controls?: ProjectControlDefinition[]
  actions?: ProjectActionDefinition[]
  layers?: ProjectLayerDefinition[]
  libraries?: string[]
  /**
   * Optional escape hatch for advanced/custom sketches.
   * Prefer metadata-driven layer/runtime bootstrap where possible.
   */
  init?: (container: HTMLElement, context: ProjectContext) => Promise<CleanupFunction>
  theme?: ThemeOverride
  supportedTechniques?: string[]
}

/**
 * @deprecated Use ProjectDefinition in `project.config.ts`.
 * Legacy init-first project modules are being phased out.
 */
export interface ProjectModule {
  init: (container: HTMLElement, context: ProjectContext) => Promise<CleanupFunction>
  controls?: ProjectControlDefinition[]
  actions?: ProjectActionDefinition[]
  theme?: ThemeOverride
  container?: ContainerMode | ContainerConfig
  supportedTechniques?: Technique[]
  defaultTechnique?: Technique
  layers?: ProjectLayerDefinition[]
}

// Compatibility alias during migration.
export type Project = ProjectIndexEntry

export interface ProjectContext {
  controls: ControlValues
  utils: GenerativeUtils
  theme: ThemeTokens
  onControlChange: (callback: (controls: ControlValues) => void) => void
  registerAction: (key: string, handler: () => void) => void
  runtime?: {
    paused: boolean
    enablePause?: () => void
    togglePause: () => void
    onPauseChange: (callback: (paused: boolean) => void) => CleanupFunction
  }
}

export type CleanupFunction = () => void

// Re-export common types for convenience in project files
export type { Vec } from '~/utils/generative'
export { quadBezControlPoint, splineControlPoints, quadBezHandles, splineHandles } from '~/utils/generative'
export { SVG, Path, PathBuilder } from '~/utils/svg'
export { shortcuts } from '~/utils/shortcuts'
export { Grid, GridCell } from '~/utils/grid'
export type { GridConfig, GridCellConfig, GridCellSizing, GridFit, GridAlign } from '~/utils/grid'
export { Cell } from '~/utils/cell'
export { Color } from '~/utils/color'
export { Canvas, createCanvas2D, draw } from '~/utils/canvas'
export type {
  CanvasCreateConfig,
  CanvasDefaultStyle,
  CanvasStyle,
  CanvasTextOptions,
  CanvasExportOptions,
  CanvasRectOptions,
  CanvasRectSnapMode,
  CanvasStrokeAlign,
  CanvasGridLinesOptions,
  CanvasCellEdgesOptions,
  CanvasCellBoundsLike
} from '~/utils/canvas'
export { resolveContainer } from '~/utils/container'
export { resolveInnerFrame } from '~/utils/container'
export { createFrameTransform } from '~/utils/container'
export type {
  ContainerMode,
  ContainerConfig,
  ContainerResult,
  InnerFrameResult,
  FrameTransform
} from '~/utils/container'
export {
  singleActiveLayerManager,
  singleActiveLayerSetup
} from '~/runtime/layerRuntime'
export type {
  LayerCanvas,
  LayerTechniqueRuntime,
  SingleActiveLayerFrame,
  SingleActiveLayerRuntime,
  SingleActiveLayerCreateArgs,
  SingleActiveLayerDefinition,
  SingleActiveLayerManagerArgs,
  SingleActiveLayerManager,
  SingleActiveLayerRegistryEntry,
  SingleActiveLayerRegistry,
  SingleActiveLayerSetupArgs,
  SingleActiveLayerSelectOption,
  SingleActiveLayerSetup
} from '~/runtime/layerRuntime'
