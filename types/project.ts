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

export interface Project {
  id: string
  title: string
  description: string
  date: string
  tags: string[]
  thumbnail?: string
  libraries: string[]
  entryFile: string
  controls?: ControlDefinition[]
  github?: string
}

export interface ControlValues {
  [key: string]: number | boolean | string
}
