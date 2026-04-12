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
    const { curve, rnd, v } = shortcuts(this.grid.utils)
    const halftoneDirection = 'tb'
    const density =
      halftoneDirection === 'tb'
        ? (_nx, ny) => 1 - curve.easeIn(ny)
        : (nx, _ny) => 1 - curve.easeIn(nx)

    const fill = this.col % 2 === 0 && this.row % 2 === 0 ? theme.palette[1] : theme.palette[3]

    canvas.halftone(
      this.tl(),
      this.width, this.height,
      fill,
      density,
      { spacing: 1, rng: rnd }
    )

  }
}

export function draw(context) {
  const { canvas, theme, utils, controls: c } = context
  const { rndInt } = shortcuts(utils)

  if (!canvas) return

  const cols = c.cols ?? rndInt(2, 4)
  const rows = c.rows ?? rndInt(2, 4)

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