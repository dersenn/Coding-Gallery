import type {
  CleanupFunction,
  ProjectActionDefinition,
  ProjectContext,
  ProjectControlDefinition,
  CanvasConfig,
  CanvasMode,
  InnerFrameResult
} from '~/types/project'
import type { GridCellConfig } from '~/utils/grid'
import type { ThemeTokens } from '~/utils/theme'
import {
  SVG,
  Grid,
  GridCell,
  shortcuts,
  resolveCanvas,
  resolveInnerFrame
} from '~/types/project'
import { syncControlState } from '~/composables/useControls'

type AnniLayer = 'anni-1' | 'anni-2'
type LayerCanvas = CanvasMode | CanvasConfig

// Runtime-only dependencies injected into each layer factory.
interface LayerRuntimeExtras {
  theme: ThemeTokens
  utils: ProjectContext['utils']
}

interface LayerDrawContext extends LayerRuntimeExtras {
  svg: SVG
  frame: InnerFrameResult
  v: ReturnType<typeof shortcuts>['v']
  rnd: ReturnType<typeof shortcuts>['rnd']
}

interface LayerDefinition {
  label: string
  canvas: LayerCanvas
  draw: (context: LayerDrawContext) => void
}

// Single source of truth for layer selection and simulated per-layer framing.
const LAYERS: Record<AnniLayer, LayerDefinition> = {
  'anni-1': { label: 'Anni 1', canvas: { mode: 'square' }, draw: drawAnni1 },
  'anni-2': { label: 'Anni 2', canvas: { mode: '2:3', padding: '6vmin' }, draw: drawAnni2 }
}

const LAYER_ENTRIES = Object.entries(LAYERS) as Array<[AnniLayer, LayerDefinition]>
const DEFAULT_LAYER = LAYER_ENTRIES[0]![0]

// ─── Layer 1 model + draw pipeline ─────────────────────────────────────────────
// Keep this split (Grid subclass + Cell subclass): it stays lightweight now and
// gives a clean seam for future per-layer divergence without utility wrappers.

class Anni1Grid extends Grid {
  svg!: SVG
  color!: string
  accentColor!: string
  rnd!: () => number
  /** Post-construction setup. Resolves colors and seeded rnd shortcut. */
  init(extras: { svg: SVG; theme: ThemeTokens; rnd: () => number }): this {
    this.svg = extras.svg
    this.color = extras.theme.palette[1] ?? extras.theme.foreground
    this.accentColor = extras.theme.palette[2] ?? extras.theme.foreground
    this.rnd = extras.rnd
    return this
  }
  protected override createCell(config: GridCellConfig): GridCell {
    return new Anni1Cell(config)
  }
}

class Anni1Cell extends GridCell {
  /** Draw this cell using seeded random color choice from grid runtime. */
  draw(): void {
    const g = this.grid as Anni1Grid
    const stroke = g.rnd() < 0.25 ? g.accentColor : g.color
    g.svg.makeRectAB(this.tl(), this.br(), 'none', stroke, 1)
    if (this.row === 3) {
      g.svg.makeCircle(this.center(), this.width * 0.2, 'none', stroke, 1)
    }
  }
}

function drawAnni1(context: LayerDrawContext): void {
  const { svg, frame, theme, utils, rnd, v } = context
  svg.makeRect(v(frame.x, frame.y), frame.width, frame.height, theme.background, 'none', 0)

  const grid = new Anni1Grid({
    cols: 8,
    rows: 8,
    width: frame.width,
    height: frame.height,
    x: frame.x,
    y: frame.y,
    utils
  }).init({ svg, theme, rnd })
  grid.forEach((cell) => (cell as Anni1Cell).draw())
}

// ─── Layer 2 model + draw pipeline ─────────────────────────────────────────────

function drawAnni2(context: LayerDrawContext): void {
  const { svg, frame, theme, utils, v } = context
  const accent = theme.palette[2] ?? theme.palette[0] ?? theme.foreground
  const lightAccent = theme.palette[3] ?? theme.foreground
  svg.makeRect(v(frame.x, frame.y), frame.width, frame.height, theme.background, 'none', 0)

  const cols = 6
  const rows = 9
  const cellW = frame.width / cols
  const cellH = frame.height / rows
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = frame.x + col * cellW
      const y = frame.y + row * cellH
      const cx = x + cellW / 2
      const cy = y + cellH / 2
      const radius = Math.min(cellW, cellH) * (0.2 + 0.5 * utils.noise.cell(col, row, 2))
      const stroke = (row + col) % 2 === 0 ? accent : lightAccent
      svg.makeCircle(v(cx, cy), radius, 'none', stroke, 1)
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
