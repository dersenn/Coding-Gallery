import type {
  CleanupFunction,
  ProjectActionDefinition,
  ProjectContext,
  ProjectControlDefinition,
  SingleActiveSvgLayerRegistry,
  SingleActiveSvgLayerCreateArgs
} from '~/types/project'
import type { GridCellConfig } from '~/utils/grid'
import type { ThemeTokens } from '~/utils/theme'
import {
  SVG,
  Grid,
  GridCell,
  shortcuts,
  resolveCanvas,
  createSingleActiveSvgLayerManager,
  createSingleActiveSvgLayerSetup
} from '~/types/project'
import { syncControlState } from '~/composables/useControls'

type AnniLayer = 'anni-1' | 'anni-2'

// Runtime-only dependencies injected into each layer factory.
interface LayerRuntimeExtras {
  theme: ThemeTokens
  utils: ProjectContext['utils']
}

type VecFactory = ReturnType<typeof shortcuts>['v']

// Single source of truth for layered composition setup:
// - control labels/options
// - per-layer canvas sizing/aspect/padding
// - per-layer runtime factory
const LAYER_REGISTRY: SingleActiveSvgLayerRegistry<AnniLayer, LayerRuntimeExtras> = {
  'anni-1': {
    label: 'Anni 1',
    canvas: { mode: 'square' },
    createRuntime: createAnni1Layer
  },
  'anni-2': {
    label: 'Anni 2',
    canvas: { mode: '2:3', padding: '6vmin' },
    createRuntime: createAnni2Layer
  }
}

// Derived helper outputs used by controls + runtime manager wiring.
const LAYER_SETUP = createSingleActiveSvgLayerSetup(LAYER_REGISTRY)

// ─── Layer 1 model + draw pipeline ─────────────────────────────────────────────
// Keep this split (Grid subclass + Cell subclass): it stays lightweight now and
// gives a clean seam for future per-layer divergence without utility wrappers.

class Anni1Grid extends Grid {
  svg!: SVG
  color!: string
  /** Post-construction setup. Resolves color from theme.palette[0]. */
  init(extras: { svg: SVG; theme: ThemeTokens }): this {
    this.svg = extras.svg
    this.color = extras.theme.palette[1] ?? extras.theme.foreground
    return this
  }
  protected override createCell(config: GridCellConfig): GridCell {
    return new Anni1Cell(config)
  }
}

class Anni1Cell extends GridCell {
  /** Draw this cell: rect outline tl→br using grid's svg and color. */
  draw(): void {
    const g = this.grid as Anni1Grid
    g.svg.makeRectAB(this.tl(), this.br(), 'none', g.color, 1)
    if (this.row === 3) {
      g.svg.makeCircle(this.center(), this.width * 0.2, 'none', g.color, 1)
    }
  }
}

function drawAnni1(
  svg: SVG,
  width: number,
  height: number,
  theme: ThemeTokens,
  utils: ProjectContext['utils'],
  v: VecFactory
): void {
  svg.stage.replaceChildren()
  svg.makeRect(v(0, 0), width, height, theme.background, 'none', 0)
  const grid = new Anni1Grid({
    cols: 8,
    rows: 8,
    width,
    height,
    x: 0,
    y: 0,
    utils
  }).init({ svg, theme })
  grid.forEach((cell) => (cell as Anni1Cell).draw())
}

function createAnni1Layer(args: SingleActiveSvgLayerCreateArgs<AnniLayer> & LayerRuntimeExtras) {
  const { parent, width, height, theme, utils } = args
  // Bind once per layer runtime; add more aliases here when needed.
  const { v } = shortcuts(utils)
  const svg = new SVG({ parent, id: 'anni-layer1', width, height })

  const draw = () => {
    drawAnni1(svg, width, height, theme, utils, v)
  }

  return {
    exportName: 'anni-layer1',
    svg,
    draw,
    destroy: () => {
      svg.stage.remove()
    }
  }
}

// ─── Layer 2 model + draw pipeline ─────────────────────────────────────────────

function drawAnni2(
  svg: SVG,
  width: number,
  height: number,
  theme: ThemeTokens,
  utils: ProjectContext['utils'],
  v: VecFactory
): void {
  const accent = theme.palette[2] ?? theme.palette[0] ?? theme.foreground
  const lightAccent = theme.palette[3] ?? theme.foreground
  svg.stage.replaceChildren()
  svg.makeRect(v(0, 0), width, height, theme.background, 'none', 0)

  const cols = 6
  const rows = 9
  const cellW = width / cols
  const cellH = height / rows
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = col * cellW
      const y = row * cellH
      const cx = x + cellW / 2
      const cy = y + cellH / 2
      const radius = Math.min(cellW, cellH) * (0.2 + 0.5 * utils.noise.cell(col, row, 2))
      const stroke = (row + col) % 2 === 0 ? accent : lightAccent
      svg.makeCircle(v(cx, cy), radius, 'none', stroke, 1)
    }
  }
}

function createAnni2Layer(args: SingleActiveSvgLayerCreateArgs<AnniLayer> & LayerRuntimeExtras) {
  const { parent, width, height, theme, utils } = args
  // Bind once per layer runtime; add more aliases here when needed.
  const { v } = shortcuts(utils)
  const svg = new SVG({ parent, id: 'anni-layer2', width, height })

  const draw = () => {
    drawAnni2(svg, width, height, theme, utils, v)
  }

  return {
    exportName: 'anni-layer2',
    svg,
    draw,
    destroy: () => {
      svg.stage.remove()
    }
  }
}

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
        default: LAYER_SETUP.defaultLayerId,
        options: LAYER_SETUP.options
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

  // Local mutable state mirrors control values used by this sketch.
  const controlState = {
    activeLayer: (controls.activeLayer as AnniLayer | undefined) ?? LAYER_SETUP.defaultLayerId
  }

  // 1) Resolve base frame once.
  const base = resolveCanvas(container, canvas)
  const baseEl = base.el

  // Bind framework runtime extras to per-layer factories.
  const layerDefinitions = LAYER_SETUP.createLayerDefinitions({ theme, utils })
  const layerManager = createSingleActiveSvgLayerManager<AnniLayer>({
    parent: baseEl,
    width: base.width,
    height: base.height,
    initialLayerId: controlState.activeLayer,
    layers: layerDefinitions
  })

  // Draw is deterministic per user interaction by resetting seed first.
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
    if (baseEl !== container) {
      baseEl.remove()
    }
  }
}
