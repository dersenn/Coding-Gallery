import { Vec } from './generative'

export interface PointLike {
  x: number
  y: number
}

export interface CanvasCreateConfig {
  parent: HTMLElement
  id: string
  width?: number
  height?: number
  alpha?: boolean
}

export interface CanvasStyle {
  fill?: string | null
  stroke?: string | null
  strokeW?: number
  lineCap?: CanvasLineCap
  lineJoin?: CanvasLineJoin
}

export interface CanvasTextOptions {
  align?: CanvasTextAlign
  baseline?: CanvasTextBaseline
  fontSize?: number
  fontFamily?: string
  fontWeight?: string
}

export interface CanvasExportOptions {
  projectId?: string
  seed?: string | number
}

interface CanvasDefaults {
  fill: string
  stroke: string
  strokeW: number
  lineCap: CanvasLineCap
  lineJoin: CanvasLineJoin
}

const applyStyle = (ctx: CanvasRenderingContext2D, style: CanvasStyle): void => {
  if (style.fill !== undefined) {
    ctx.fillStyle = style.fill ?? 'transparent'
  }
  if (style.stroke !== undefined) {
    ctx.strokeStyle = style.stroke ?? 'transparent'
  }
  if (style.strokeW !== undefined) {
    ctx.lineWidth = style.strokeW
  }
  if (style.lineCap !== undefined) {
    ctx.lineCap = style.lineCap
  }
  if (style.lineJoin !== undefined) {
    ctx.lineJoin = style.lineJoin
  }
}

const clampDimension = (value: number): number => Math.max(1, Math.round(value))

export class Canvas {
  parent: HTMLElement
  id: string
  w: number
  h: number
  c: Vec
  el: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  def: CanvasDefaults

  constructor(setup: CanvasCreateConfig) {
    this.parent = setup.parent
    this.id = setup.id
    this.w = clampDimension(setup.width ?? this.parent.clientWidth)
    this.h = clampDimension(setup.height ?? this.parent.clientHeight)
    this.c = new Vec(this.w / 2, this.h / 2)

    this.def = {
      fill: 'transparent',
      stroke: '#000',
      strokeW: 1,
      lineCap: 'butt',
      lineJoin: 'miter'
    }

    this.el = document.createElement('canvas')
    this.el.id = this.id
    this.el.width = this.w
    this.el.height = this.h
    this.parent.append(this.el)

    const ctx = this.el.getContext('2d', { alpha: setup.alpha ?? true })
    if (!ctx) {
      throw new Error('Unable to create 2D canvas context')
    }
    this.ctx = ctx
    applyStyle(this.ctx, this.def)
  }

  resize(width: number, height: number): void {
    this.w = clampDimension(width)
    this.h = clampDimension(height)
    this.c = new Vec(this.w / 2, this.h / 2)
    this.el.width = this.w
    this.el.height = this.h
    applyStyle(this.ctx, this.def)
  }

  clear(): void {
    this.ctx.clearRect(0, 0, this.w, this.h)
  }

  background(fill: string): void {
    this.ctx.save()
    this.ctx.fillStyle = fill
    this.ctx.fillRect(0, 0, this.w, this.h)
    this.ctx.restore()
  }

  fill(fill: string | null): void {
    this.def.fill = fill ?? 'transparent'
  }

  stroke(stroke: string | null): void {
    this.def.stroke = stroke ?? 'transparent'
  }

  strokeWeight(weight: number): void {
    this.def.strokeW = weight
  }

  line(
    a: PointLike,
    b: PointLike,
    stroke: string = this.def.stroke,
    strokeW: number = this.def.strokeW
  ): void {
    this.ctx.save()
    applyStyle(this.ctx, { stroke, strokeW, fill: 'transparent', lineCap: this.def.lineCap, lineJoin: this.def.lineJoin })
    this.ctx.beginPath()
    this.ctx.moveTo(a.x, a.y)
    this.ctx.lineTo(b.x, b.y)
    this.ctx.stroke()
    this.ctx.restore()
  }

  circle(
    at: PointLike,
    r: number = 5,
    fill: string = this.def.fill,
    stroke: string = this.def.stroke,
    strokeW: number = this.def.strokeW
  ): void {
    this.ctx.save()
    applyStyle(this.ctx, { fill, stroke, strokeW, lineCap: this.def.lineCap, lineJoin: this.def.lineJoin })
    this.ctx.beginPath()
    this.ctx.arc(at.x, at.y, Math.max(0, r), 0, Math.PI * 2)
    if (fill !== 'transparent') this.ctx.fill()
    if (stroke !== 'transparent' && strokeW > 0) this.ctx.stroke()
    this.ctx.restore()
  }

  rect(
    at: PointLike,
    width: number,
    height: number,
    fill: string = this.def.fill,
    stroke: string = this.def.stroke,
    strokeW: number = this.def.strokeW
  ): void {
    this.ctx.save()
    applyStyle(this.ctx, { fill, stroke, strokeW, lineCap: this.def.lineCap, lineJoin: this.def.lineJoin })
    if (fill !== 'transparent') {
      this.ctx.fillRect(at.x, at.y, width, height)
    }
    if (stroke !== 'transparent' && strokeW > 0) {
      this.ctx.strokeRect(at.x, at.y, width, height)
    }
    this.ctx.restore()
  }

  rectC(
    center: PointLike,
    width: number,
    height: number,
    fill: string = this.def.fill,
    stroke: string = this.def.stroke,
    strokeW: number = this.def.strokeW
  ): void {
    this.rect(
      new Vec(center.x - width / 2, center.y - height / 2),
      width,
      height,
      fill,
      stroke,
      strokeW
    )
  }

  text(
    value: string,
    at: PointLike,
    fill: string = this.def.stroke,
    options: CanvasTextOptions = {}
  ): void {
    this.ctx.save()
    this.ctx.fillStyle = fill
    this.ctx.textAlign = options.align ?? 'start'
    this.ctx.textBaseline = options.baseline ?? 'alphabetic'

    const fontSize = options.fontSize ?? 12
    const fontWeight = options.fontWeight ?? '400'
    const fontFamily = options.fontFamily ?? 'system-ui, sans-serif'
    this.ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`
    this.ctx.fillText(value, at.x, at.y)
    this.ctx.restore()
  }

  withContext(draw: (ctx: CanvasRenderingContext2D) => void): void {
    this.ctx.save()
    draw(this.ctx)
    this.ctx.restore()
  }

  save(options: CanvasExportOptions = {}): void {
    const { projectId, seed } = options
    const baseName = projectId ?? this.id
    const safeSeed = seed === undefined ? '' : `-${String(seed)}`
    const filename = `${baseName}${safeSeed}.png`

    const link = document.createElement('a')
    link.download = filename
    link.href = this.el.toDataURL('image/png')
    link.click()
  }
}

export const createCanvas2D = (config: CanvasCreateConfig): Canvas => {
  return new Canvas(config)
}

export const draw = (
  target: Canvas | CanvasRenderingContext2D,
  callback: (ctx: CanvasRenderingContext2D) => void
): void => {
  const ctx = target instanceof Canvas ? target.ctx : target
  ctx.save()
  callback(ctx)
  ctx.restore()
}
