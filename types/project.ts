import type { GenerativeUtils } from '~/utils/generative'

export interface ControlDefinition {
  type: 'slider' | 'toggle' | 'select' | 'color'
  label: string
  key: string
  default: number | boolean | string
  min?: number
  max?: number
  step?: number
  options?: Array<{ label: string; value: string | number }>
}

export interface ControlValues {
  [key: string]: number | boolean | string
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
  controls?: ControlDefinition[]
  github?: string
  hidden?: boolean  // Hide from gallery (still accessible via direct URL)
}

// Project module interface - all projects must export this
export interface ProjectModule {
  init: (container: HTMLElement, context: ProjectContext) => Promise<CleanupFunction>
  controls?: ControlDefinition[] // Optional: controls can be defined in the module
}

export interface ProjectContext {
  controls: ControlValues
  utils: GenerativeUtils
  onControlChange: (callback: (controls: ControlValues) => void) => void
}

export type CleanupFunction = () => void

// Re-export common types for convenience in project files
export type { Vec } from '~/utils/generative'
export { SVG, Path, pPt } from '~/utils/svg'
export { shortcuts } from '~/utils/shortcuts'
