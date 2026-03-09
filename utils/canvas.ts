import { Vec } from './generative'
import { Color } from './color'

export interface CanvasCreateConfig {
  parent: HTMLElement
  id: string
  width?: number
  height?: number
  alpha?: boolean
  defaults?: CanvasDefaultStyle
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

export interface CanvasDefaultStyle extends CanvasStyle {
  background?: string
  text?: string
}

interface CanvasDefaults {
  fill: string
  stroke: string
  strokeW: number
  lineCap: CanvasLineCap
  lineJoin: CanvasLineJoin
  background: string
  text: string
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

const resolveCssColor = (value: string | null | undefined): string | undefined => {
  if (!value) return undefined
  const parsed = Color.parse(value)
  if (!parsed) return undefined
  return parsed.toCss('rgba')
}

const resolveCanvasDefaults = (
  parent: HTMLElement,
  overrides?: CanvasDefaultStyle
): CanvasDefaults => {
  const computed = getComputedStyle(parent)
  const computedColor = resolveCssColor(computed.color)
  const computedBackground = Color.parse(computed.backgroundColor)

  return {
    fill: overrides?.fill ?? computedColor ?? 'transparent',
    stroke: overrides?.stroke ?? computedColor ?? '#000',
    strokeW: overrides?.strokeW ?? 1,
    lineCap: overrides?.lineCap ?? 'butt',
    lineJoin: overrides?.lineJoin ?? 'miter',
    background: overrides?.background
      ?? ((computedBackground && computedBackground.a > 0) ? computedBackground.toCss('rgba') : undefined)
      ?? '#000000',
    text: overrides?.text ?? computedColor ?? '#000'
  }
}

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

    this.def = resolveCanvasDefaults(this.parent, setup.defaults)

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

  background(fill: string = this.def.background): void {
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
    a: Vec,
    b: Vec,
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
    at: Vec,
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
    at: Vec,
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
    center: Vec,
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
    at: Vec,
    fill: string = this.def.text,
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
