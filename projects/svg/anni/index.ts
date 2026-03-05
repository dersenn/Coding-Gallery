import type {
  CleanupFunction,
  ProjectActionDefinition,
  ProjectContext,
  ProjectControlDefinition,
  CanvasConfig,
  CanvasMode
} from '~/types/project'
import {
  SVG,
  shortcuts,
  resolveCanvas,
  resolveInnerFrame
} from '~/types/project'
import { syncControlState } from '~/composables/useControls'
import { drawAnni1 } from './layers/anni1'
import { drawAnni2 } from './layers/anni2'
import type { LayerDrawContext } from './layers/types'

type AnniLayer = 'anni-1' | 'anni-2'
type LayerCanvas = CanvasMode | CanvasConfig

interface LayerDefinition {
  label: string
  canvas: LayerCanvas
  draw: (context: LayerDrawContext) => void
}

// Single source of truth for layer selection and simulated per-layer framing.
const LAYERS: Record<AnniLayer, LayerDefinition> = {
  'anni-1': { label: 'Orange, Black and White', canvas: { mode: '2:3', padding: '3vmin' }, draw: drawAnni1 },
  'anni-2': { label: 'Anni 2', canvas: { mode: '2:3', padding: '6vmin' }, draw: drawAnni2 }
}

const LAYER_ENTRIES = Object.entries(LAYERS) as Array<[AnniLayer, LayerDefinition]>
const DEFAULT_LAYER = LAYER_ENTRIES[0]![0]

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
        default: DEFAULT_LAYER,
        options: LAYER_ENTRIES.map(([id, entry]) => ({ label: entry.label, value: id }))
      }
    ]
  }
]

// ─── Actions and base canvas ────────────────────────────────────────────────────

export const actions: ProjectActionDefinition[] = [
  { key: 'download-svg', label: 'Download SVG' }
]

export const canvas = { mode: 'square' as const, padding: '3vmin' }

/**
 * Anni
 *
 * Single-active layered SVG sketch:
 * - base canvas frame resolved once from project `canvas`
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
    activeLayer: (controls.activeLayer as AnniLayer | undefined) ?? DEFAULT_LAYER
  }

  const { el, width, height } = resolveCanvas(container, canvas)
  const svg = new SVG({ parent: el, id: 'anni', width, height })

  // Draw is deterministic per user interaction by resetting seed first.
  const draw = () => {
    utils.seed.reset()
    svg.stage.replaceChildren()
    svg.makeRect(v(0, 0), svg.w, svg.h, theme.background, 'none', 0)

    const activeLayer = LAYERS[controlState.activeLayer]
    if (!activeLayer) {
      throw new Error(`Unknown selected layer: ${controlState.activeLayer}`)
    }
    const frame = resolveInnerFrame(svg.w, svg.h, activeLayer.canvas)
    activeLayer.draw({ svg, frame, theme, utils, v, rnd })
  }

  draw()

  // Re-draw whenever control values change (including active layer selection).
  onControlChange((nextControls) => {
    syncControlState(controlState, nextControls)
    draw()
  })

  // Action targets whichever layer is currently active.
  registerAction('download-svg', () => {
    svg.save(utils.seed.current, `anni-${controlState.activeLayer}`)
  })

  // Ensure current layer runtime and wrapper nodes are fully cleaned up.
  return () => {
    svg.stage.remove()
  }
}
