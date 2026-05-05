import { shortcuts } from '~/utils/shortcuts'
import { Cell } from '~/utils/cell'
import { Vec } from '~/utils/generative'
import { lightTheme } from '~/utils/theme'

class TotemCell extends Cell {
  constructor(config) {
    super(config)
    this.density = config.density
    this.pillarX = config.pillarX
    this.pillarW = config.pillarW
    this.leftEdge = config.leftEdge
    this.rightEdge = config.rightEdge
    this.spacing = .5
    this.color = {
      pillar: lightTheme.palette[0],
      sidecarLeft: lightTheme.palette[1],
      sidecarRight: lightTheme.palette[2],
    }
  }

draw(canvas, rnd) {
  //pillar
  canvas.halftone(this.tl(), this.width, this.height, this.color.pillar, this.density, { rng: rnd, spacing: this.spacing })

  // sidecar left
  canvas.halftone(
    new Vec(this.leftEdge, this.y),
    this.x - this.leftEdge,
    this.height,
    this.color.sidecarLeft,
    (nx) => 1 - nx,
    { rng: rnd, spacing: this.spacing }
  )
  // sidecar right
  canvas.halftone(
    new Vec(this.x + this.width, this.y),
    this.rightEdge - (this.x + this.width),
    this.height,
    this.color.sidecarRight,
    (nx) => nx,
    { rng: rnd, spacing: this.spacing }
  )
}

}

export function draw(context) {
  const { canvas, utils, controls: c } = context
  const { v, rnd, rndRange, divLength, pick } = shortcuts(utils)
  const { mm } = canvas.print
  if (!canvas) return

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

  const pts = divLength(
    v(pillar.x, pillar.y),
    v(pillar.x, pillar.y + pillar.h),
    nSegments,
    { mode: 'rnd', includeEndpoints: true, rng: rnd, minSegmentLength: mm(20) }
  )

  const densities = [
    (nx, ny) => nx,
    (nx, ny) => 1 - nx,
    (nx, ny) => nx * nx,
    (nx, ny) => Math.abs(nx * 2 - 1),       // dark edges, bright center
    (nx, ny) => 1 - Math.abs(nx * 2 - 1),   // bright edges, dark center
  ]

  const segments = pts.slice(0, -1).map((pt, i) => {
    const w = rndRange(mm(10), pillar.w)
    return new TotemCell({
      x: pillar.x - w / 2,
      y: pt.y,
      width: w,
      height: pts[i + 1].y - pt.y,
      index: i,
      pillarX: pillar.x,
      pillarW: pillar.w,
      leftEdge: border.left,
      rightEdge: canvas.w - border.right,
      density: pick(densities),
    })
  })



  // DRAWING

  canvas.background('#fff')
  segments.forEach(seg => seg.draw(canvas, rnd)) 
}