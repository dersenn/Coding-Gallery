import { Grid, GridCell } from '~/types/project'
import { shortcuts } from '~/utils/shortcuts'

class MyGrid extends Grid {
  createCell(config) {
    return new MyCell(config)
  }
}

class MyCell extends GridCell {
  draw(canvas, theme, settings) {
    const fill = (this.row + this.col) % 2 === 0 ? settings.fg : settings.bg
    const isWide = this.width >= this.height

    if (isWide) {
      const r = Math.min(this.width, this.height) / 2
      const center = this.center()
      canvas.ellipse(center, this.width / 2, this.height / 2, 0, fill, 'transparent', 0)
    } else {
      canvas.rect(this.tl(), this.width, this.height, fill, 'transparent', 0)
    }
  }
}

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

  const grid = new MyGrid({ cols: 1, rows, width: canvas.w, height: canvas.h, x: 0, y: 0, utils })

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

  const settings = { fg, bg }
  terminals.forEach(cell => cell.draw(canvas, theme, settings))


  if (c.showGrid) {
    canvas.cellEdges(terminals, theme.annotation, 1, { strokeAlign: 'center', includeOuter: false })
  }
}