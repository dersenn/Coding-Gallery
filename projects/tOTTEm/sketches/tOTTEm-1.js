import { shortcuts } from '~/utils/shortcuts'
import { Cell } from '~/utils/cell'

export function draw(context) {
  const { canvas, utils, controls: c } = context
  const { v, rnd, rndRange, divLength } = shortcuts(utils)
  const { mm } = canvas.print
  if (!canvas) return

  // SETUP

  const border = {
    top: mm(9),
    right: mm(9),
    bottom: mm(15),
    left: mm(6),
  }

  const nSegments = 7

  const pillar = {
    h: canvas.h - border.top - border.bottom,
    w: canvas.w / 2,
    x: canvas.c.x,
    y: border.top,
  }

  // divide the pillar height into nSegments random slices
  const pts = divLength(
    v(pillar.x, pillar.y),
    v(pillar.x, pillar.y + pillar.h),
    nSegments,
    { mode: 'rnd', includeEndpoints: true, rng: rnd }
  )

  // build a Cell for each slice
  const segments = []
  for (let i = 0; i < pts.length - 1; i++) {
    const w = rndRange(mm(10), pillar.w)
    segments.push(new Cell({
      x: pillar.x - w / 2,
      y: pts[i].y,
      width: w,
      height: pts[i + 1].y - pts[i].y,
      index: i,
    }))
  }

  // DRAWING

  canvas.background('#fff')

  for (const seg of segments) {
      canvas.rect(seg.tl(), seg.width, seg.height, '#000')
  }
}