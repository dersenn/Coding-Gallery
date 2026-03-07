import type { ProjectContext, SingleActiveSvgLayerFrame } from '~/types/project'
import type { ThemeTokens } from '~/utils/theme'
import type { shortcuts, SVG } from '~/types/project'

// Runtime-only dependencies injected into each layer draw function.
export interface LayerDrawContext {
  svg: SVG
  frame: SingleActiveSvgLayerFrame
  theme: ThemeTokens
  utils: ProjectContext['utils']
  controls: ProjectContext['controls']
  v: ReturnType<typeof shortcuts>['v']
  rnd: ReturnType<typeof shortcuts>['rnd']
}
