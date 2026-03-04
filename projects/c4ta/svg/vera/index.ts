import type {
  CleanupFunction,
  ProjectActionDefinition,
  ProjectContext,
  ProjectControlDefinition
} from '~/types/project'
import { SVG, Cell, shortcuts, resolveCanvas } from '~/types/project'
import { Vec } from '~/utils/generative'
import { syncControlState } from '~/composables/useControls'
import { createGenerativeUtils } from '~/utils/generative'
import type { GenerativeUtils } from '~/utils/generative'

type VeraLayer = 'vera1' | 'vera2'

/**
 * Vera (C4TA — computational line studies)
 *
 * A series of independently toggleable layers, each exploring a different
 * rule system for line placement within an overlapping tile grid.
 * Intended as a growing exercise in computational composition.
 *
 * Layer inventory:
 * - Vera 1: constrained motif selection (4 candidates per tile)
 * - Vera 2: one diagonal per tile from a random left-edge point to a random right-edge point
 */

const TILE_OVERLAP_FACTOR = 3
const DEFAULT_DIVISIONS = 12

export const controls: ProjectControlDefinition[] = [
  {
    type: 'group',
    id: 'composition',
    label: 'Composition',
    collapsible: true,
    defaultOpen: true,
    controls: [
      {
        type: 'checkbox-group',
        label: 'Sketches',
        key: 'enabledLayers',
        default: ['vera1'],
        options: [
          { label: 'Vera 1', value: 'vera1' },
          { label: 'Vera 2', value: 'vera2' }
        ]
      }
    ]
  }
]

export const actions: ProjectActionDefinition[] = [
  { key: 'download-svg', label: 'Download SVG' }
]

export const canvas = 'square'

export async function init(
  container: HTMLElement,
  context: ProjectContext
): Promise<CleanupFunction> {
  const { controls, utils, theme, onControlChange, registerAction } = context
  const { v } = shortcuts(utils)

  const controlState = {
    enabledLayers: controls.enabledLayers as VeraLayer[]
  }

  const { el, width, height } = resolveCanvas(container, canvas)
  const svg = new SVG({ parent: el, id: 'vera', width, height })

  // Stroke scales proportionally with canvas size.
  const strokeWidth = width * 0.002

  const vera1Color = theme.palette[0] ?? '#0000ff'
  const vera2Color = theme.palette[2] ?? '#ff0000'

  const drawLine = (x1: number, y1: number, x2: number, y2: number, color: string) => {
    svg.makeLine(v(x1, y1), v(x2, y2), color, strokeWidth)
  }

  // ─── Layer: Vera 1 ───────────────────────────────────────────────────────────
  // Constrained motif selection: one line per tile from 4 fixed candidates.
  const drawVera1 = (xPos: number, yPos: number, w: number, h: number, divisions: number, layerUtils: GenerativeUtils) => {
    const cols = divisions
    const rows = cols
    const tileW = (w * TILE_OVERLAP_FACTOR) / (-cols + 3 + cols * TILE_OVERLAP_FACTOR)
    const tileH = (h * TILE_OVERLAP_FACTOR) / (-rows + 3 + rows * TILE_OVERLAP_FACTOR)
    const xOverlap = tileW / TILE_OVERLAP_FACTOR
    const yOverlap = tileH / TILE_OVERLAP_FACTOR

    // Overlap grid starts one overlap unit in, matching original composition framing.
    const startX = xPos + xOverlap
    const startY = yPos + yOverlap
    const rnd = () => layerUtils.seed.random()

    for (let x = 0; x < cols; x++) {
      const xOff = startX + x * (tileW - xOverlap)
      for (let y = 0; y < rows; y++) {
        const yOff = startY + y * (tileH - yOverlap)
        const tile = new Cell({ x: xOff, y: yOff, width: tileW, height: tileH, row: y, col: x })

        // Four motif candidates — diagonal, anti-diagonal, vertical center, horizontal center.
        const c = tile.center()
        const positions = [
          [tile.tl(), tile.br()],
          [tile.bl(), tile.tr()],
          [{ x: c.x, y: tile.y }, { x: c.x, y: tile.y + tile.height }],
          [{ x: tile.x, y: c.y }, { x: tile.x + tile.width, y: c.y }]
        ] as const
        const index = Math.floor(rnd() * positions.length)
        const [p1, p2] = positions[index]!
        drawLine(p1.x, p1.y, p2.x, p2.y, vera1Color)
      }
    }
  }

  // ─── Layer: Vera 2 ───────────────────────────────────────────────────────────
  // One diagonal per tile: a random point on the left edge connected to a random
  // point on the right edge, sampled independently via divLength.
  const drawVera2 = (xPos: number, yPos: number, w: number, h: number, cols: number, rows: number, layerUtils: GenerativeUtils) => {
    const tileW = (w * TILE_OVERLAP_FACTOR) / (-cols + 3 + cols * TILE_OVERLAP_FACTOR)
    const tileH = (h * TILE_OVERLAP_FACTOR) / (-rows + 3 + rows * TILE_OVERLAP_FACTOR)
    const xOverlap = tileW / TILE_OVERLAP_FACTOR
    const yOverlap = tileH / TILE_OVERLAP_FACTOR

    const startX = xPos + xOverlap
    const startY = yPos + yOverlap
    const yOffsetSteps = Math.max(1, Math.floor(h / rows))
    const rnd = () => layerUtils.seed.random()

    for (let x = 0; x < cols; x++) {
      const xOff = startX + x * (tileW - xOverlap)
      for (let y = 0; y < rows; y++) {
        // Per-cell random jitter multiplier: tiles with larger row index drift further
        // down on average, but small jitter values pack them near the top (condensation).
        const yJitter = Math.floor(rnd() * yOffsetSteps)
        const yOff = startY + y * yJitter
        const tile = new Cell({ x: xOff, y: yOff, width: tileW, height: tileH, row: y, col: x })

        // One endpoint is always at the tile's top edge (anchoring the straight top);
        // the other is at a random height along the opposite edge via divLength.
        // The diagonal direction (left-anchored or right-anchored) is chosen randomly.
        const varPt = utils.math.divLength(tile.tl(), tile.bl(), 2, { mode: 'randomSorted', rng: rnd })[0]!
        const positions = [
          [tile.tl(), new Vec(tile.tr().x, varPt.y)],  // top-left → (right, random y)
          [new Vec(tile.tl().x, varPt.y), tile.tr()]   // (left, random y) → top-right
        ] as const
        const [p1, p2] = positions[Math.floor(rnd() * 2)]!
        drawLine(p1.x, p1.y, p2.x, p2.y, vera2Color)
      }
    }
  }

  const draw = () => {
    const seed = utils.seed.current
    // Each layer gets its own PRNG stream from the same project seed.
    // Toggling one layer cannot affect the other's random sequence.
    const v1rnd = createGenerativeUtils(seed)
    const v2rnd = createGenerativeUtils(seed)

    svg.stage.replaceChildren()
    svg.makeRect(v(0, 0), svg.w, svg.h, theme.background, 'none', 0)

    // Render order keeps Vera 1 on top when both are enabled, matching migration baseline.
    const enabledLayers = new Set(controlState.enabledLayers)
    if (enabledLayers.has('vera2')) {
      drawVera2(0, 0, svg.w, svg.h, DEFAULT_DIVISIONS, DEFAULT_DIVISIONS, v2rnd)
    }
    if (enabledLayers.has('vera1')) {
      drawVera1(0, 0, svg.w, svg.h, DEFAULT_DIVISIONS, v1rnd)
    }
  }

  draw()

  onControlChange((nextControls) => {
    syncControlState(controlState, nextControls)
    draw()
  })

  registerAction('download-svg', () => {
    svg.save(utils.seed.current, 'vera')
  })

  return () => {
    svg.stage.remove()
  }
}
