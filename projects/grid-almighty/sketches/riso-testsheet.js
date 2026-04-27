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

  draw(canvas, color, spacing, type, label) {
    const { v, curve, clr, rnd} = shortcuts(this.grid.utils)
    const { mm, pt } = canvas.print
    // const { color } = this.grid.utils

    // const fill = clr(color)
    const rows = this.grid.rows
    const opacity = (rows - (this.row)) / 10

    if (type === 'solid') {
      const gray = Math.round(255 * (1 - opacity))
      const fill = `rgb(${gray},${gray},${gray})`
      canvas.rect(this.tl(), this.width, this.height, fill)
      // canvas.rect(this.tl(), this.width, this.height, fill.withAlpha(opacity).toCss())
      canvas.text(String(opacity * 100), v(this.br().x + mm(1.5), this.br().y), color, label)
    } else if (type === 'halftone') {
      const density = (nx, ny) => opacity
      canvas.halftone(this.tl(), this.width, this.height, color, density, { spacing, rng: rnd })
      canvas.text(opacity.toFixed(1), v(this.br().x + mm(1.5), this.br().y), color, label)
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

  const color = '#000'
  const spacingMM = 0.15
  const spacing = mm(spacingMM)
  const offset = mm(4.5)

  const labelLeft = {
    fontFamily: 'Helvetica',
    fontSize: pt(7.2),
    fontWeight: 'bold',
  }
  const labelRight = { ...labelLeft, align: 'right' }

  const border = {
    top: mm(9),
    right: mm(9),
    bottom: mm(15),
    left: mm(6),
  }


  const gridSolid = new MyGrid({
    cols: 1,
    rows: 10,
    width: mm(30),
    height: mm(210),
    x: border.left,
    y: border.top + offset,
    utils,
  })

  const gridHalftone = new MyGrid({
    cols: 1,
    rows: 10,
    width: mm(30),
    height: mm(210),
    x: border.left + mm(40),
    y: border.top + offset,
    utils,
  })


  // DRAWING

  canvas.background('#fff')


  /* ------------------------------------------------------------------------------------------------ */
  canvas.text(
    'Solid', 
    v(border.left, border.top + mm(3)), 
    color, 
    labelLeft
  )

  gridSolid.forEach(cell => {
    cell.draw(canvas, color, spacing, 'solid', labelLeft)
  })


  /* ------------------------------------------------------------------------------------------------ */
  canvas.text(
    'FM Halftone',
    v(border.left + mm(40), border.top + mm(3)),
    color,
    labelLeft
  )

  canvas.text(
    spacingMM.toFixed(2),
    v(border.left + mm(40) + mm(30), border.top + mm(3)),
    color,
    labelRight
  )

  gridHalftone.forEach(cell => {
    cell.draw(canvas, color, spacing, 'halftone', labelLeft)
  })


  /* ------------------------------------------------------------------------------------------------ */
  const fmStripeWidth = mm(21)
  const fmStripeHeight = mm(210)
  const fmStripeGap = mm(3)


  canvas.text(
    'Linear',
    v(border.left + mm(80), border.top + mm(3)),
    color,
    labelLeft
  )
  canvas.halftone(
    v(border.left + mm(80), border.top + offset), 
    fmStripeWidth, fmStripeHeight, 
    color, 
    (nx, ny) => 1 - curve.linear(ny), 
    { spacing, rng: rnd }
  )


  canvas.text(
    'Ease Out',
    v(border.left + mm(80) + fmStripeWidth + fmStripeGap, border.top + mm(3)),
    color,
    labelLeft
  )
  canvas.halftone(
    v(border.left + mm(80) + fmStripeWidth + fmStripeGap, border.top + offset),
    fmStripeWidth, fmStripeHeight,
    color,
    (nx, ny) => 1 - curve.easeOut(ny),
    { spacing, rng: rnd }
  )


  canvas.text(
    'Ease In',
    v(border.left + mm(80) + (fmStripeWidth + fmStripeGap) * 2, border.top + mm(3)),
    color,
    labelLeft
  )
  canvas.halftone(
    v(border.left + mm(80) + (fmStripeWidth + fmStripeGap) * 2, border.top + offset),
    fmStripeWidth, fmStripeHeight,
    color,
    (nx, ny) => 1 - curve.easeIn(ny),
    { spacing, rng: rnd }
  )


  canvas.text(
    'Log',
    v(border.left + mm(80) + (fmStripeWidth + fmStripeGap) * 3, border.top + mm(3)),
    color,
    labelLeft
  )
  canvas.halftone(
    v(border.left + mm(80) + (fmStripeWidth + fmStripeGap) * 3, border.top + offset),
    fmStripeWidth, fmStripeHeight,
    color,
    (nx, ny) => 1 - curve.log(ny),
    { spacing, rng: rnd }
  )

  canvas.text(
    'Exp',
    v(border.left + mm(80) + (fmStripeWidth + fmStripeGap) * 4, border.top + mm(3)),
    color,
    labelLeft
  )
  canvas.halftone(
    v(border.left + mm(80) + (fmStripeWidth + fmStripeGap) * 4, border.top + offset),
    fmStripeWidth, fmStripeHeight,
    color,
    (nx, ny) => 1 - curve.exp(ny),
    { spacing, rng: rnd }
  )


  /* ------------------------------------------------------------------------------------------------ */
  canvas.text(
    'mm',
    v(border.left + mm(31.5), border.top + mm(234)),
    color,
    labelLeft
  )
  const strokeWidthsMM = [0.15, 0.2, 0.25, 0.3, 0.5, 0.6, 0.75, 1.0]
  const swRectW = mm(30)
  const swGap = offset
  const swXmm = border.left  // adjust to taste
  const swY = border.top + mm(240)  // label baseline

  strokeWidthsMM.forEach((swMM, i) => {
    const h = mm(swMM)
    const y = swY + i * swGap
    canvas.text(String(swMM), v(swXmm + swRectW + mm(1.5), y), color, labelLeft)
    canvas.rect(v(swXmm, y - h), swRectW, h, color)
  })
  
  
  canvas.text(
    'pt',
    v(border.left + mm(40) + mm(31.5), border.top + mm(234)),
    color,
    labelLeft
  )
  const strokeWidthsPT = [0.3, 0.6, 0.9, 1.2, 1.5, 1.8, 2.1, 2.4]
  const swXpt = border.left + mm(40) // adjust to taste

  strokeWidthsPT.forEach((swMM, i) => {
    const h = pt(swMM)
    const y = swY + i * swGap
    canvas.text(String(swMM), v(swXpt + swRectW + mm(1.5), y), color, labelLeft)
    canvas.rect(v(swXpt, y - h), swRectW, h, color)
  })

  
  /* ------------------------------------------------------------------------------------------------ */
  canvas.text('FM spacing', v(border.left + mm(80), border.top + mm(234)), color, labelLeft)
  // --- mm column (existing) ---
  canvas.text('mm', v(border.left + mm(80) + mm(31.5), border.top + mm(234)), color, labelLeft)

  const spacingVariantsMM = [0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6]
  const htRectW = mm(30)
  const htRectH = mm(4)
  const htXmm = border.left + mm(80)
  spacingVariantsMM.forEach((spMM, i) => {
    const y = swY + i * swGap
    canvas.text(String(spMM), v(htXmm + htRectW + mm(1.5), y), color, labelLeft)
    canvas.halftone(
      v(htXmm, y - htRectH),
      htRectW, htRectH,
      color,
      (nx, ny) => nx,
      { spacing: mm(spMM), rng: rnd }
    )
  })
  // --- pt column (new) ---
  canvas.text('pt', v(border.left + mm(80) + mm(40) + mm(31.5), border.top + mm(234)), color, labelLeft)

  const spacingVariantsPT = [0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1.2, 1.5] // same count as mm list
  const htXpt = border.left + mm(80) + mm(40)
  spacingVariantsPT.forEach((spPT, i) => {
    const y = swY + i * swGap
    canvas.text(String(spPT), v(htXpt + htRectW + mm(1.5), y), color, labelLeft)
    canvas.halftone(
      v(htXpt, y - htRectH),
      htRectW, htRectH,
      color,
      (nx, ny) => nx,
      { spacing: pt(spPT), rng: rnd }
    )
  })
}