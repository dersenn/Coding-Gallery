import type { GenerativeUtils } from '~/utils/generative'
import type { ThemeOverride, ThemeTokens } from '~/utils/theme'

export interface ControlDefinition {
  type: 'slider' | 'toggle' | 'select' | 'color'
  label: string
  key: string
  default: number | boolean | string
  group?: string
  order?: number
  min?: number
  max?: number
  step?: number
  options?: Array<{ label: string; value: string | number }>
}

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
  [key: string]: number | boolean | string
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
  controls?: ProjectControlDefinition[]
  github?: string
  hidden?: boolean  // Hide from gallery (still accessible via direct URL)
}

// Project module interface - all projects must export this
export interface ProjectModule {
  init: (container: HTMLElement, context: ProjectContext) => Promise<CleanupFunction>
  controls?: ProjectControlDefinition[] // Optional: controls can be defined in the module
  actions?: ProjectActionDefinition[] // Optional: contextual actions exposed by the module
  theme?: ThemeOverride // Optional: project-level theme overrides
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
export { SVG, Path, pPt } from '~/utils/svg'
export { shortcuts } from '~/utils/shortcuts'
export { Grid } from '~/utils/grid'
export { Cell } from '~/utils/cell'
export { Color } from '~/utils/color'
