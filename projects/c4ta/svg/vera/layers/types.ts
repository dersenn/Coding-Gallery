import type { ProjectContext } from '~/types/project'
import type { ThemeTokens } from '~/utils/theme'
import type { shortcuts, SVG } from '~/types/project'

export interface LayerDrawContext {
  svg: SVG
  theme: ThemeTokens
  utils: ProjectContext['utils']
  controls: ProjectContext['controls']
  v: ReturnType<typeof shortcuts>['v']
  rnd: () => number
}
