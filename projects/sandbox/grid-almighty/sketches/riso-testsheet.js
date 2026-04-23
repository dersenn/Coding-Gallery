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

  draw(canvas, color, gap, type) {
    const { v, curve, clr, rnd} = shortcuts(this.grid.utils)
    const { mm, pt } = canvas.print
    // const { color } = this.grid.utils

    const fill = clr(color)
    const opacity = (this.row + 1) / 10

    if (type === 'solid') {
      canvas.rect(this.tl(), this.width, this.height, fill.withAlpha(opacity).toCss())
      canvas.text(String(opacity * 100), v(this.br().x + mm(1.5), this.br().y), color, { fontSize: pt(9), fontFamily: 'Helvetica' })
    } else if (type === 'halftone') {
      const density = (nx, ny) => opacity
      canvas.halftone(this.tl(), this.width, this.height, color, density, { spacing: mm(0.15), rng: rnd })
      canvas.text(opacity.toFixed(1), v(this.br().x + mm(1.5), this.br().y), color, { fontSize: pt(9), fontFamily: 'Helvetica' })
    }

    // canvas.withContext(ctx => {
    //   ctx.globalCompositeOperation = 'multiply'

    //   canvas.halftone(
    //     this.tl(),
    //     this.width, this.height,
    //     fill,
    //     density,
    //     { spacing, rng: rnd }
    //   )
    // })

  }
}



export function draw(context) {
  const { canvas, utils, controls: c } = context
  const { v, rnd, curve } = shortcuts(utils)
  if (!canvas) return

  const { mm, pt, drawTrimBox } = canvas.print

  const border = {
    top: mm(9),
    right: mm(9),
    bottom: mm(15),
    left: mm(9),
  }

  const color = '#000'
  const gap = mm(3)

  const gridSolid = new MyGrid({
    cols: 1,
    rows: 10,
    width: mm(30),
    height: mm(210),
    x: border.left,
    y: border.top,
    utils,
  })

  const gridHalftone = new MyGrid({
    cols: 1,
    rows: 10,
    width: mm(30),
    height: mm(210),
    x: border.left + mm(40),
    y: border.top,
    utils,
  })


  // DRAWING

  canvas.background('#fff')

  gridSolid.forEach(cell => {
    cell.draw(canvas, color, gap, 'solid')
  })

  gridHalftone.forEach(cell => {
    cell.draw(canvas, color, gap, 'halftone')
  })

  canvas.halftone(
    v(border.left + mm(80), border.top), 
    mm(30), mm(210), 
    color, 
    (nx, ny) => curve.linear(ny), 
    { spacing: mm(0.15), rng: rnd }
  )

  canvas.halftone(
    v(border.left + mm(120), border.top),
    mm(30), mm(210),
    color,
    (nx, ny) => curve.easeIn(ny),
    { spacing: mm(0.15), rng: rnd }
  )

  canvas.halftone(
    v(border.left + mm(160), border.top),
    mm(30), mm(210),
    color,
    (nx, ny) => curve.easeOut(ny),
    { spacing: mm(0.15), rng: rnd }
  )


  // drawTrimBox(canvas.ctx)
}