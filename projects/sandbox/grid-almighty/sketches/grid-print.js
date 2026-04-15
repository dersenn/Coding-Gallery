import { shortcuts } from '~/utils/shortcuts'
import { lightTheme } from '~/utils/theme'


export function draw(context) {
  const { canvas, utils, controls: c } = context
  const { v, rnd, curve } = shortcuts(utils)

  if (!canvas) return
  const { mm, pt, trimWidth, trimHeight, drawTrimBox } = canvas.print

  canvas.background(lightTheme.background)
  // canvas.rect(v(mm(10), mm(10)), mm(50), mm(30), 'red')

  canvas.halftone(
    v(mm(10), mm(10)),
    mm(50), mm(297-20),
    '#000',
    (nx, ny) => 1 - curve.easeIn(ny),
    { spacing: mm(.3), rng: rnd }
  )

  // drawTrimBox(canvas.ctx)
}