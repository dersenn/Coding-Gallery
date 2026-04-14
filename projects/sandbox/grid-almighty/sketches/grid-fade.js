import { Grid, GridCell } from '~/types/project'
import { shortcuts } from '~/utils/shortcuts'
import { lightTheme } from '~/utils/theme'

class MyGrid extends Grid {
  createCell(config) {
    return new MyCell(config)
  }
}

class MyCell extends GridCell {
  constructor(config) {
    super(config)
  }

  draw(canvas, colors, maxLevel, spacing) {
    const { curve, rnd, shuffle } = shortcuts(this.grid.utils)
    // Alternate top→bottom vs bottom→top halftone fade by cell parity (local row/col).
    const topToBottom = (this.row + this.col) % 2 === 0
    const density = topToBottom
      ? (nx, ny) => 1 - curve.easeIn(ny)
      : (nx, ny) => curve.easeIn(nx)
      // : (nx, ny) => Math.pow(4.0 * ny * (1.0 - ny), 0.5)

    const fill = this.col % 2 === 0 && this.row % 2 === 0 ? colors[this.level] : colors[maxLevel + 1]
    // const fill = theme.palette[this.level]

    canvas.halftone(
      this.tl(),
      this.width, this.height,
      fill,
      density,
      { spacing, rng: rnd }
    )

  }
}

export function draw(context) {
  const { canvas, utils, controls: c } = context
  const { rndInt, pick, coin, pickMany } = shortcuts(utils)

  if (!canvas) return

  const cols = c.cols ?? pick([2, 4, 6])
  const rows = c.rows ?? pick([2, 4, 6])
  const maxLevel = c.maxLevel ?? 1

  const colors = pickMany(lightTheme.palette, maxLevel + 2)

  let spacing = c.spacing ?? 1
  spacing = canvas.pixelRatio < 2 ? spacing : spacing / 2
  
  const grid = new MyGrid({
    cols,
    rows,
    width: canvas.w,
    height: canvas.h,
    x: 0,
    y: 0,
    utils
  })

  const terminals = grid.subdivide({
    maxLevel,
    // condition: () => coin(50),
    rule: (cell) => {
      if (coin(50)) return false
      return { cols: rndInt(1, cols), rows: rndInt(1, rows)}
    }
  })

  canvas.background(lightTheme.background)

  terminals.forEach(cell => {
    cell.draw(canvas, colors, maxLevel, spacing)
  })

  // canvas.cellEdges(terminals, theme.annotation, 1, { strokeAlign: 'center', includeOuter: false })

}