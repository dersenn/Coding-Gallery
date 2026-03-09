import type {
  CleanupFunction,
  ProjectActionDefinition,
  ProjectContext,
  ProjectControlDefinition,
  SingleActiveSvgLayerRegistry
} from '~/types/project'
import {
  shortcuts,
  resolveContainer,
  singleActiveSvgLayerManager,
  singleActiveSvgLayerSetup
} from '~/types/project'
import { syncControlState } from '~/composables/useControls'
import { drawGridCore } from './layers/grid1.js'
import { drawGridGrowth } from './layers/grid2.js'
import type { LayerDrawContext } from './layers/types'

type GridAlmightyLayer = 'grid-core' | 'grid-growth'

interface GridAlmightyLayerRuntimeExtras extends Omit<LayerDrawContext, 'svg' | 'frame' | 'controls'> {
  getControls: () => ProjectContext['controls']
}

const LAYER_REGISTRY: SingleActiveSvgLayerRegistry<
  GridAlmightyLayer,
  LayerDrawContext
> = {
  // Single-active layer runtime.
  'grid-core': {
    label: 'Grid Core',
    canvas: { mode: 'full' },
    draw: drawGridCore
  },
  'grid-growth': {
    label: 'Grid Growth',
    canvas: { mode: 'full' },
    draw: drawGridGrowth
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
    id: 'composition',
    label: 'Composition',
    collapsible: true,
    defaultOpen: true,
    controls: [
      {
        type: 'select',
        label: 'Layer',
        key: 'activeLayer',
        hideLabel: true,
        default: LAYER_SETUP.defaultLayerId,
        options: LAYER_SETUP.options
      }
    ]
  },
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
    id: 'growth',
    label: 'Growth',
    collapsible: true,
    defaultOpen: true,
    visibleWhenSelectKey: 'activeLayer',
    visibleWhenSelectValue: 'grid-growth',
    controls: [
      {
        type: 'slider',
        label: 'Seed Count',
        key: 'growth_seed_count',
        default: 8,
        min: 1,
        max: 64,
        step: 1
      },
      {
        type: 'slider',
        label: 'Growth Chance',
        key: 'growth_chance',
        default: 68,
        min: 1,
        max: 100,
        step: 1
      },
      {
        type: 'select',
        label: 'Neighborhood',
        key: 'growth_neighborhood',
        default: '8',
        options: [
          { label: '8 Neighbors', value: '8' },
          { label: '4 Neighbors', value: '4' }
        ]
      },
      {
        type: 'slider',
        label: 'Max Passes',
        key: 'growth_max_passes',
        default: 420,
        min: 10,
        max: 2000,
        step: 10
      },
      {
        type: 'slider',
        label: 'Target Fill',
        key: 'growth_target_fill',
        default: 100,
        min: 10,
        max: 100,
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
    visibleWhenSelectKey: 'activeLayer',
    visibleWhenSelectValue: 'grid-core',
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
      },
      {
        type: 'toggle',
        label: 'Single Rule',
        key: 'rule_single_mode',
        default: false
      },
      {
        type: 'toggle',
        label: 'Single Color',
        key: 'rule_single_color',
        default: false
      }
    ]
  },
  {
    type: 'group',
    id: 'noise',
    label: 'Noise',
    collapsible: true,
    defaultOpen: false,
    visibleWhenSelectKey: 'activeLayer',
    visibleWhenSelectValue: 'grid-core',
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
export const container = ROOT_CANVAS_CONFIG

export async function init(
  container: HTMLElement,
  context: ProjectContext
): Promise<CleanupFunction> {
  const { controls, utils, theme, onControlChange, registerAction } = context
  const { v, rnd } = shortcuts(utils)

  const controlState = {
    ...controls,
    activeLayer: (controls.activeLayer as GridAlmightyLayer | undefined) ?? LAYER_SETUP.defaultLayerId
  } as ProjectContext['controls'] & { activeLayer: GridAlmightyLayer }

  const { el: baseContainer, width, height } = resolveContainer(container, ROOT_CANVAS_CONFIG)
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
