import { Grid, GridCell } from '~/types/project'
import { shortcuts } from '~/utils/shortcuts'

class MyGrid extends Grid {
  createCell(config) {
    return new MyCell(config)
  }
}

class MyCell extends GridCell {
  constructor(config) {
    super(config)
  }

  draw(canvas, theme) {
    const { curve, rnd } = shortcuts(this.grid.utils)
    // Alternate top→bottom vs bottom→top halftone fade by cell parity (local row/col).
    const topToBottom = (this.row + this.col) % 2 === 0
    const density = topToBottom
      ? (_nx, ny) => 1 - curve.easeIn(ny)
      : (_nx, ny) => curve.easeOut(ny)

    const fill = this.col % 2 === 0 && this.row % 2 === 0 ? theme.palette[1] : theme.palette[3]

    canvas.halftone(
      this.tl(),
      this.width, this.height,
      fill,
      density,
      { spacing: 0.5, rng: rnd }
    )

  }
}

export function draw(context) {
  const { canvas, theme, utils, controls: c } = context
  const { rndInt, pick } = shortcuts(utils)

  if (!canvas) return

  const cols = c.cols ?? pick([2, 4, 6, 8])
  const rows = c.rows ?? pick([2, 4, 6, 8])

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
    maxLevel: 1,
    chance: 50,
    rule: (cell) => {
      return { cols: rndInt(1, 6), rows: rndInt(1, rows)}
    }
  })

  terminals.forEach(cell => {
    cell.draw(canvas, theme)
  })

  // canvas.cellEdges(terminals, theme.annotation, 1, { strokeAlign: 'center', includeOuter: false })

}