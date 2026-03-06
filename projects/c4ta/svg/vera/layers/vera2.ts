import { Cell } from '~/types/project'
import { Vec } from '~/utils/generative'
import type { LayerDrawContext } from './types'

const TILE_OVERLAP_FACTOR = 3
const DEFAULT_DIVISIONS = 12

// One diagonal per tile: a random point on the left edge connected to a random
// point on the right edge, sampled independently via divLength.
export function drawVera2({
  utils,
  svg,
  theme,
  v,
  rnd
}: LayerDrawContext): void {
  const xPos = 0
  const yPos = 0
  const w = svg.w
  const h = svg.h
  const color = theme.palette[2] ?? '#ff0000'
  const cols = DEFAULT_DIVISIONS
  const rows = DEFAULT_DIVISIONS
  const tileW = (w * TILE_OVERLAP_FACTOR) / (-cols + 3 + cols * TILE_OVERLAP_FACTOR)
  const tileH = (h * TILE_OVERLAP_FACTOR) / (-rows + 3 + rows * TILE_OVERLAP_FACTOR)
  const xOverlap = tileW / TILE_OVERLAP_FACTOR
  const yOverlap = tileH / TILE_OVERLAP_FACTOR

  const startX = xPos + xOverlap
  const startY = yPos + yOverlap
  const yOffsetSteps = Math.max(1, Math.floor(h / rows))
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
        [tile.tl(), new Vec(tile.tr().x, varPt.y)],  // top-left -> (right, random y)
        [new Vec(tile.tl().x, varPt.y), tile.tr()]   // (left, random y) -> top-right
      ] as const
      const [p1, p2] = positions[Math.floor(rnd() * 2)]!
      svg.makeLine(v(p1.x, p1.y), v(p2.x, p2.y), color, w * 0.002)
    }
  }
}
