import type { ProjectContext } from '~/types/project'
import type { GenerativeUtils } from '~/utils/generative'

export interface VeraLayerBaseContext {
  xPos: number
  yPos: number
  w: number
  h: number
  color: string
  layerUtils: GenerativeUtils
  drawLine: (x1: number, y1: number, x2: number, y2: number, color: string) => void
}

export interface Vera1DrawContext extends VeraLayerBaseContext {
  divisions: number
}

export interface Vera2DrawContext extends VeraLayerBaseContext {
  cols: number
  rows: number
  utils: ProjectContext['utils']
}
