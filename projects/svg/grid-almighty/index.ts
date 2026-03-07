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
import { drawGridCore } from './layers/grid1.js'
import type { LayerDrawContext } from './layers/types'

type GridAlmightyLayer = 'grid-core'

interface GridAlmightyLayerRuntimeExtras extends Omit<LayerDrawContext, 'svg' | 'frame' | 'controls'> {
  getControls: () => ProjectContext['controls']
}

const LAYER_REGISTRY: SingleActiveSvgLayerRegistry<
  GridAlmightyLayer,
  LayerDrawContext
> = {
  // Single layer runtime; control scaffolding supports future layers.
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
        label: 'Short Side Divisions',
        key: 'grid_short_side_divisions',
        default: 60,
        min: 12,
        max: 90,
        step: 1
      }
    ]
  },
  {
    type: 'group',
    id: 'rules',
    label: 'Rules',
    collapsible: true,
    defaultOpen: true,
    controls: [
      {
        type: 'select',
        label: 'Rule Preset',
        key: 'rule_preset',
        default: 'auto',
        options: [
          { label: 'Auto', value: 'auto' },
          { label: 'Balanced', value: 'balanced' },
          { label: 'Chaotic', value: 'chaotic' },
          { label: 'Dense', value: 'dense' },
          { label: 'Sparse', value: 'sparse' }
        ]
      }
    ]
  },
  {
    type: 'group',
    id: 'noise',
    label: 'Noise',
    collapsible: true,
    defaultOpen: false,
    controls: [
      {
        type: 'slider',
        label: 'Noise Scale',
        key: 'noiseScale',
        default: 21,
        min: 2,
        max: 80,
        step: 1
      },
      {
        type: 'slider',
        label: 'Stretch X',
        key: 'stretchX',
        default: 1.2,
        min: 0.2,
        max: 3,
        step: 0.15
      },
      {
        type: 'slider',
        label: 'Stretch Y',
        key: 'stretchY',
        default: 0.75,
        min: 0.2,
        max: 3,
        step: 0.15
      },
      {
        type: 'slider',
        label: 'Amplitude',
        key: 'amplitude',
        default: 1.5,
        min: 0.1,
        max: 2.0,
        step: 0.1
      },
      {
        type: 'slider',
        label: 'Octaves',
        key: 'octaves',
        default: 1,
        min: 1,
        max: 4,
        step: 1
      },
      {
        type: 'slider',
        label: 'Lacunarity',
        key: 'lacunarity',
        default: 2.4,
        min: 1.5,
        max: 3.0,
        step: 0.1,
        visibleWhenSelectKey: 'octaves',
        visibleWhenSelectValues: [2, 3, 4]
      },
      {
        type: 'slider',
        label: 'Persistence',
        key: 'persistence',
        default: 0.9,
        min: 0.1,
        max: 1.0,
        step: 0.1,
        visibleWhenSelectKey: 'octaves',
        visibleWhenSelectValues: [2, 3, 4]
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
