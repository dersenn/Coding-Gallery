import { Cell } from '~/types/project'
import type { LayerDrawContext } from './types'

const TILE_OVERLAP_FACTOR = 3
const DEFAULT_DIVISIONS = 12

// Constrained motif selection: one line per tile from 4 fixed candidates.
export function drawVera1({
  svg,
  theme,
  v,
  rnd
}: LayerDrawContext): void {
  const xPos = 0
  const yPos = 0
  const w = svg.w
  const h = svg.h
  const color = theme.palette[0] ?? '#0000ff'
  const divisions = DEFAULT_DIVISIONS
  const cols = divisions
  const rows = cols
  const tileW = (w * TILE_OVERLAP_FACTOR) / (-cols + 3 + cols * TILE_OVERLAP_FACTOR)
  const tileH = (h * TILE_OVERLAP_FACTOR) / (-rows + 3 + rows * TILE_OVERLAP_FACTOR)
  const xOverlap = tileW / TILE_OVERLAP_FACTOR
  const yOverlap = tileH / TILE_OVERLAP_FACTOR

  // Overlap grid starts one overlap unit in, matching original composition framing.
  const startX = xPos + xOverlap
  const startY = yPos + yOverlap
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
      svg.makeLine(v(p1.x, p1.y), v(p2.x, p2.y), color, w * 0.002)
    }
  }
}
