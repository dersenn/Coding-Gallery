import { Grid, GridCell } from '~/types/project'
import { shortcuts } from '~/utils/shortcuts'
import { lightTheme, defaultTheme } from '~/utils/theme'



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
    const { curve, rnd, rndInt } = shortcuts(this.grid.utils)
    const { mm } = canvas.print

    const fill = (this.col + this.row) % 2 === 0 ? colors[0] : colors[1]

    // const parity = (this.col + this.row) % 3
    const parity = rndInt(0, 3)
    let density
    switch (parity) {
      case 0:
        density = (nx, ny) => 1 - curve.easeIn(ny)
        break
      case 1:
        density = (nx, ny) => curve.easeIn(ny)
        break
      case 2:
        density = (nx, ny) => curve.log(ny, parity)
        break
      default:
        // density = (nx, ny) => {
        //   const angle = Math.PI / 3
        //   const t = nx * Math.cos(angle) + ny * Math.sin(angle)
        //   return curve.easeIn(t)
        // }
        density = (nx, ny) => 0.9
        break
    }
    
    canvas.withContext(ctx => {
      ctx.globalCompositeOperation = 'multiply'

      canvas.halftone(
        this.tl(),
        this.width, this.height,
        fill,
        density,
        { spacing, rng: rnd }
      )
    })

    // canvas.halftone(
    //   this.tl(),
    //   this.width, this.height,
    //   fill,
    //   density,
    //   { spacing, rng: rnd }
    // )

  }
}



export function draw(context) {
  const { canvas, utils, controls: c } = context
  const { v, pick, pickMany } = shortcuts(utils)
  if (!canvas) return

  const { mm, pt, drawTrimBox } = canvas.print

  const border = {
    top: mm(9),
    right: mm(9),
    bottom: mm(15),
    left: mm(9),
  }

  const maxLevel = 1
  const halftoneSpacing = mm(.15)

  const colors = pickMany(lightTheme.palette, maxLevel + 1)
  const cols = pick([2, 3, 4])

  const grid = new MyGrid({
    cols: cols,
    rows: (cols * 2) - 1,
    width: canvas.w - border.left - border.right,
    height: canvas.h - border.top - border.bottom,
    x: border.left,
    y: border.top,
    utils,
  })

  const terminals = grid.subdivide({
    maxLevel: maxLevel,
    rule: (cell) => {
      if ((cell.col + cell.row) % 2 === 0) 
        return { cols: 2, rows: cell.row % 2 === 0 ? 2 : 3 }
      // return { cols: 6, rows: cell.row % 2 === 0 ? 3 : 2 }
      return { cols: 6, rows: cell.row % 2 === 0 ? 6 : 4 }
    }
  })


  // DRAWING

  canvas.background(lightTheme.background)

  terminals.forEach(cell => {
    cell.draw(canvas, colors, maxLevel, halftoneSpacing)
  })

  canvas.text(utils.seed.current, v(mm(9), mm(287)), colors[0], { fontSize: pt(12), fontFamily: 'Helvetica' })

  // drawTrimBox(canvas.ctx)
}