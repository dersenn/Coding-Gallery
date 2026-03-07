import type {
  CleanupFunction,
  ProjectActionDefinition,
  ProjectContext,
  ProjectControlDefinition,
  SingleActiveSvgLayerRegistry
} from '~/types/project'
import {
  shortcuts,
  resolveCanvas,
  singleActiveSvgLayerManager,
  singleActiveSvgLayerSetup
} from '~/types/project'
import { syncControlState } from '~/composables/useControls'
import { drawGridCore } from './layers/anni1'
import type { LayerDrawContext } from './layers/types'

type GridAlmightyLayer = 'grid-core'

interface GridAlmightyLayerRuntimeExtras extends Omit<LayerDrawContext, 'svg' | 'frame' | 'controls'> {
  getControls: () => ProjectContext['controls']
}

const LAYER_REGISTRY: SingleActiveSvgLayerRegistry<
  GridAlmightyLayer,
  LayerDrawContext
> = {
  'grid-core': {
    label: 'Grid Core',
    canvas: { mode: 'full' },
    draw: drawGridCore
  }
}

const LAYER_SETUP = singleActiveSvgLayerSetup<
  GridAlmightyLayer,
  GridAlmightyLayerRuntimeExtras,
  LayerDrawContext
>({
  registry: LAYER_REGISTRY,
  resolveRuntimeName: (id) => `grid-almighty-${id}`,
  createContext: ({ svg, frame, args }) => {
    const { theme, utils, v, rnd, getControls } = args
    return { svg, frame, theme, utils, v, rnd, controls: getControls() }
  }
})

export const controls: ProjectControlDefinition[] = [
  {
    type: 'group',
    id: 'grid',
    label: 'Grid',
    collapsible: true,
    defaultOpen: true,
    controls: [
      {
        type: 'slider',
        label: 'Rows',
        key: 'grid_rows',
        default: 8,
        min: 1,
        max: 40,
        step: 1
      }
    ]
  }
]

export const actions: ProjectActionDefinition[] = [
  { key: 'download-svg', label: 'Download SVG' }
]

const ROOT_CANVAS_CONFIG = { mode: 'full' as const }
export const canvas = ROOT_CANVAS_CONFIG

export async function init(
  container: HTMLElement,
  context: ProjectContext
): Promise<CleanupFunction> {
  const { controls, utils, theme, onControlChange, registerAction } = context
  const { v, rnd } = shortcuts(utils)

  const controlState = {
    ...controls,
    activeLayer: LAYER_SETUP.defaultLayerId
  } as ProjectContext['controls'] & { activeLayer: GridAlmightyLayer }

  const { el: baseContainer, width, height } = resolveCanvas(container, ROOT_CANVAS_CONFIG)
  const layerManager = singleActiveSvgLayerManager({
    parent: baseContainer,
    width,
    height,
    initialLayerId: controlState.activeLayer,
    layers: LAYER_SETUP.createLayerDefinitions({
      theme,
      utils,
      v,
      rnd,
      getControls: () => controlState
    })
  })

  const draw = () => {
    utils.seed.reset()
    layerManager.setActiveLayer(controlState.activeLayer)
    layerManager.draw()
  }

  draw()

  onControlChange((nextControls) => {
    syncControlState(controlState, nextControls)
    draw()
  })

  registerAction('download-svg', () => {
    layerManager.exportActiveSvg(utils.seed.current)
  })

  return () => {
    layerManager.destroy()
  }
}
