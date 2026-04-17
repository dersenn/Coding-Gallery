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
    const { v, curve, rnd, rndInt, map, norm } = shortcuts(this.grid.utils)

    const topToBottom = (this.row + this.col) % 2 === 0

    const density = topToBottom
      ? (nx, ny) => 1 - curve.easeIn(ny)
      : (nx, ny) => curve.easeIn(ny)

    const fill = (this.col + this.row) % 2 === 0 ? colors[0] : colors[1]

    // canvas.rect(v(this.x, this.y), this.width, this.height, fill, 'transparent', 0)

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
  const { v, rnd, curve, pickMany } = shortcuts(utils)
  if (!canvas) return

  const { mm, drawTrimBox } = canvas.print

  const border = {
    top: mm(9),
    right: mm(9),
    bottom: mm(15),
    left: mm(9),
  }

  const maxLevel = 1

  const colors = pickMany(lightTheme.palette, maxLevel + 1)

  const grid = new MyGrid({
    cols: 3,
    rows: 5,
    width: canvas.w - border.left - border.right,
    height: canvas.h - border.top - border.bottom,
    x: border.left,
    y: border.top,
    utils,
  })

  const terminals = grid.subdivide({
    maxLevel: 1,
    rule: (cell) => {
      if ((cell.col + cell.row) % 2 === 0) 
        return { cols: 2, rows: cell.row % 2 === 0 ? 2 : 3 }
      // return { cols: 6, rows: cell.row % 2 === 0 ? 3 : 2 }
      return { cols: 6, rows: cell.row % 2 === 0 ? 6 : 4 }
    }
  })



  canvas.background(lightTheme.background)


  terminals.forEach(cell => {
    cell.draw(canvas, colors, maxLevel, 1)
  })

 
  

  // canvas.halftone(
  //   v(mm(10), mm(10)),
  //   mm(50), mm(297-20),
  //   '#000',
  //   (nx, ny) => 1 - curve.easeIn(ny),
  //   { spacing: mm(.3), rng: rnd }
  // )

  // drawTrimBox(canvas.ctx)
}