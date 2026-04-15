import { shortcuts } from '~/utils/shortcuts'


export function draw(context) {
  const { canvas, utils, controls: c } = context
  const { v, rnd, curve } = shortcuts(utils)

  if (!canvas) return
  const { mm, pt, trimWidth, trimHeight, drawTrimBox } = canvas.print

  canvas.background('#fff')

  canvas.halftone(
    v(mm(10), mm(10)),
    mm(50), mm(297-20),
    '#000',
    (nx, ny) => 1 - curve.easeIn(ny),
    { spacing: mm(.3), rng: rnd }
  )

  // drawTrimBox(canvas.ctx)
}