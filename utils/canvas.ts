import { Vec } from './generative'
import { Color } from './color'

export interface CanvasCreateConfig {
  parent: HTMLElement
  id: string
  width?: number
  height?: number
  alpha?: boolean
  pixelRatio?: number | 'auto'
  rectSnap?: CanvasRectSnapMode
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

export type CanvasRectSnapMode = 'device' | 'none'

export interface CanvasRectOptions {
  snap?: CanvasRectSnapMode
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

interface RectBounds {
  x: number
  y: number
  width: number
  height: number
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
const EDGE_SNAP_PRECISION = 1_000_000
const AXIS_ALIGN_EPSILON = 1e-9
const canonicalEdge = (value: number): number => Math.round(value * EDGE_SNAP_PRECISION) / EDGE_SNAP_PRECISION
const isAxisAligned = (transform: DOMMatrix): boolean =>
  Math.abs(transform.b) <= AXIS_ALIGN_EPSILON && Math.abs(transform.c) <= AXIS_ALIGN_EPSILON
const normalizeRect = (x: number, y: number, width: number, height: number): RectBounds => {
  const left = width >= 0 ? x : x + width
  const top = height >= 0 ? y : y + height
  return { x: left, y: top, width: Math.abs(width), height: Math.abs(height) }
}

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
  pixelRatio: number
  c: Vec
  el: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  def: CanvasDefaults
  rectSnapDefault: CanvasRectSnapMode

  private resolvePixelRatio(value: CanvasCreateConfig['pixelRatio']): number {
    if (typeof value === 'number') {
      return Number.isFinite(value) && value > 0 ? value : 1
    }
    if (typeof window === 'undefined') return 1
    const dpr = window.devicePixelRatio || 1
    return Number.isFinite(dpr) && dpr > 0 ? dpr : 1
  }

  constructor(setup: CanvasCreateConfig) {
    this.parent = setup.parent
    this.id = setup.id
    this.pixelRatio = this.resolvePixelRatio(setup.pixelRatio ?? 'auto')
    this.w = clampDimension(setup.width ?? this.parent.clientWidth)
    this.h = clampDimension(setup.height ?? this.parent.clientHeight)
    this.c = new Vec(this.w / 2, this.h / 2)
    this.rectSnapDefault = setup.rectSnap ?? 'device'

    this.def = resolveCanvasDefaults(this.parent, setup.defaults)

    this.el = document.createElement('canvas')
    this.el.id = this.id
    this.parent.append(this.el)

    const ctx = this.el.getContext('2d', { alpha: setup.alpha ?? true })
    if (!ctx) {
      throw new Error('Unable to create 2D canvas context')
    }
    this.ctx = ctx
    this.resize(this.w, this.h)
  }

  private resolveRectBounds(
    at: Vec,
    width: number,
    height: number,
    options?: CanvasRectOptions
  ): RectBounds {
    const snapMode = options?.snap ?? this.rectSnapDefault
    if (snapMode === 'none') {
      return { x: at.x, y: at.y, width, height }
    }

    const transform = this.ctx.getTransform()
    if (!isAxisAligned(transform) || transform.a <= 0 || transform.d <= 0) {
      return { x: at.x, y: at.y, width, height }
    }

    const normalized = normalizeRect(at.x, at.y, width, height)
    const leftPx = Math.round(canonicalEdge(transform.a * normalized.x + transform.e))
    const rightRaw = transform.a * (normalized.x + normalized.width) + transform.e
    const rightPx = Math.max(leftPx + 1, Math.round(canonicalEdge(rightRaw)))
    const topPx = Math.round(canonicalEdge(transform.d * normalized.y + transform.f))
    const bottomRaw = transform.d * (normalized.y + normalized.height) + transform.f
    const bottomPx = Math.max(topPx + 1, Math.round(canonicalEdge(bottomRaw)))

    return {
      x: (leftPx - transform.e) / transform.a,
      y: (topPx - transform.f) / transform.d,
      width: (rightPx - leftPx) / transform.a,
      height: (bottomPx - topPx) / transform.d
    }
  }

  resize(width: number, height: number): void {
    this.w = clampDimension(width)
    this.h = clampDimension(height)
    this.c = new Vec(this.w / 2, this.h / 2)

    // Keep logical drawing units in CSS pixels, but scale backing store for DPR.
    this.el.width = Math.max(1, Math.round(this.w * this.pixelRatio))
    this.el.height = Math.max(1, Math.round(this.h * this.pixelRatio))
    this.el.style.width = `${this.w}px`
    this.el.style.height = `${this.h}px`

    this.ctx.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0)
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
    strokeW: number = this.def.strokeW,
    options: CanvasRectOptions = {}
  ): void {
    const bounds = this.resolveRectBounds(at, width, height, options)
    this.ctx.save()
    applyStyle(this.ctx, { fill, stroke, strokeW, lineCap: this.def.lineCap, lineJoin: this.def.lineJoin })
    if (fill !== 'transparent') {
      this.ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height)
    }
    if (stroke !== 'transparent' && strokeW > 0) {
      this.ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height)
    }
    this.ctx.restore()
  }

  rectC(
    center: Vec,
    width: number,
    height: number,
    fill: string = this.def.fill,
    stroke: string = this.def.stroke,
    strokeW: number = this.def.strokeW,
    options: CanvasRectOptions = {}
  ): void {
    this.rect(
      new Vec(center.x - width / 2, center.y - height / 2),
      width,
      height,
      fill,
      stroke,
      strokeW,
      options
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
