import type { Canvas, ProjectContext, SingleActiveLayerFrame } from '~/types/project'
import type { ThemeTokens } from '~/utils/theme'
import type { shortcuts, SVG } from '~/types/project'

// Runtime-only dependencies injected into each layer draw function.
export interface LayerDrawContext {
  technique: 'svg' | 'canvas2d' | 'p5'
  svg?: SVG
  canvas?: Canvas
  ctx?: CanvasRenderingContext2D
  frame: SingleActiveLayerFrame
  theme: ThemeTokens
  utils: ProjectContext['utils']
  controls: ProjectContext['controls']
  v: ReturnType<typeof shortcuts>['v']
  rnd: ReturnType<typeof shortcuts>['rnd']
}
