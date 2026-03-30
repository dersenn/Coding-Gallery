import { Grid } from '~/types/project'
import { shortcuts } from '~/utils/shortcuts'

export function draw(context) {
  const { canvas, theme, utils, controls: c } = context
  const { v, map, simplex2 } = shortcuts(utils)

  if (!canvas) return

  const rows = c.rows ?? 12
  const minSplit = Math.min(c.minSplit ?? 1, c.maxSplit ?? 12)
  const maxSplit = Math.max(c.minSplit ?? 1, c.maxSplit ?? 12)
  const waveFreq = c.waveFreq ?? 1.0
  const useNoise = c.useNoise ?? false
  const bg = c.sketchBackground || theme.background
  const fg = c.sketchForeground || theme.foreground

  canvas.background(bg)

  const grid = new Grid({ cols: 1, rows, width: canvas.w, height: canvas.h, x: 0, y: 0, utils })

  const terminals = grid.subdivide({
    maxLevel: 1,
    rule: (cell) => {
      const t = rows > 1 ? cell.row / (rows - 1) : 0.5

      const density = useNoise
        ? (simplex2(t * waveFreq * 3, 0) + 1) / 2
        : (Math.sin(t * Math.PI * waveFreq) + 1) / 2

      const count = Math.round(map(density, 0, 1, minSplit, maxSplit))
      return { cols: Math.max(1, count), rows: 1 }
    }
  })

  terminals.forEach(cell => {
    const fill = (cell.row + cell.col) % 2 === 0 ? fg : bg
    canvas.rect(v(cell.x, cell.y), cell.width, cell.height, fill, 'transparent', 0)
  })

  if (c.showGrid) {
    canvas.cellEdges(terminals, theme.annotation, 1, { strokeAlign: 'center', includeOuter: false })
  }
}