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
import { drawAnni1 } from './layers/anni1'
import { drawAnni2 } from './layers/anni2'
import type { LayerDrawContext } from './layers/types'

type AnniLayer = 'anni-1' | 'anni-2'

interface AnniLayerRuntimeExtras extends Omit<LayerDrawContext, 'svg' | 'frame' | 'controls'> {
  getControls: () => ProjectContext['controls']
}

const LAYER_REGISTRY: SingleActiveSvgLayerRegistry<
  AnniLayer,
  LayerDrawContext
> = {
  'anni-1': { 
    label: 'Orange, Black and White (1926/27)', 
    canvas: { mode: '2:3', padding: '3vmin' }, 
    draw: drawAnni1 
  },
  'anni-2': { 
    label: 'Anni 2', 
    canvas: { mode: '1:1', padding: '3vmin' }, 
    draw: drawAnni2 
  }
}

const LAYER_SETUP = singleActiveSvgLayerSetup<
  AnniLayer,
  AnniLayerRuntimeExtras,
  LayerDrawContext
>({
  registry: LAYER_REGISTRY,
  resolveRuntimeName: (id) => `anni-${id}`,
  createContext: ({ svg, frame, args }) => {
    const { theme, utils, v, rnd, getControls } = args
    return { svg, frame, theme, utils, v, rnd, controls: getControls() }
  }
})

// ─── Controls ───────────────────────────────────────────────────────────────────

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
    id: 'anni-1',
    label: 'Composition Settings',
    collapsible: true,
    defaultOpen: false,
    visibleWhenSelectKey: 'activeLayer',
    visibleWhenSelectValue: 'anni-1',
    controls: [
      {
        type: 'slider',
        label: 'Rows',
        key: 'anni1_rows',
        default: 6,
        min: 1,
        max: 18,
        step: 1
      }
    ]
  }
]

// ─── Actions and base canvas ────────────────────────────────────────────────────

export const actions: ProjectActionDefinition[] = [
  { key: 'download-svg', label: 'Download SVG' }
]

const ROOT_CANVAS_CONFIG = { mode: 'square' as const, padding: '3vmin' }
export const container = ROOT_CANVAS_CONFIG

/**
 * Anni
 *
 * Single-active layered SVG sketch:
 * - base container resolved once from project `canvas` config
 * - active layer chosen by control and mounted by layer manager
 * - each layer resolves its own canvas (aspect/padding) independently
 */
export async function init(
  container: HTMLElement,
  context: ProjectContext
): Promise<CleanupFunction> {
  // Framework-provided runtime surface for control + action wiring.
  const { controls, utils, theme, onControlChange, registerAction } = context
  const { v, rnd } = shortcuts(utils)

  // Local mutable state mirrors control values used by this sketch.
  const controlState = {
    ...controls,
    activeLayer: (controls.activeLayer as AnniLayer | undefined) ?? LAYER_SETUP.defaultLayerId
  } as ProjectContext['controls'] & { activeLayer: AnniLayer }

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

  // Re-draw whenever control values change (including active layer selection).
  onControlChange((nextControls) => {
    syncControlState(controlState, nextControls)
    draw()
  })

  // Action targets whichever layer is currently active.
  registerAction('download-svg', () => {
    layerManager.exportActiveSvg(utils.seed.current)
  })

  // Ensure current layer runtime and wrapper nodes are fully cleaned up.
  return () => {
    layerManager.destroy()
  }
}
