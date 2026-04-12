import { Vec } from './generative'
import { Color, type GradientStop } from './color'

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

export type CanvasFill = string | CanvasGradient | CanvasPattern
export type CanvasRectSnapMode = 'device' | 'none'
export type CanvasStrokeAlign = 'center' | 'inside'

export interface CanvasStyle {
  fill?: CanvasFill | null
  stroke?: CanvasFill | null
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

export interface CanvasRectOptions {
  snap?: CanvasRectSnapMode
  strokeAlign?: CanvasStrokeAlign
}

export interface CanvasGridLinesOptions extends CanvasRectOptions {
  includeOuter?: boolean
}

export interface CanvasCellEdgesOptions extends CanvasRectOptions {
  includeOuter?: boolean
}

export interface CanvasCellBoundsLike {
  x: number
  y: number
  width: number
  height: number
}

export interface CanvasDefaultStyle extends CanvasStyle {
  background?: string
  text?: string
}

export interface GrainOptions {
  alpha?: number
  blend?: GlobalCompositeOperation
  animated?: boolean
  rng?: () => number
}

export interface GrainFillOptions {
  intensity?: number
  rng?: () => number
}

export type HalftoneDitherMode = 'stochastic' | 'ordered'

export interface HalftoneOptions {
  spacing?: number
  rng?: () => number
  /**
   * `stochastic` (default): `rng() < density` per sample (same as legacy halftone).
   * `ordered`: 8×8 Bayer threshold, no per-dot RNG — deterministic crosshatch-like dither.
   */
  dither?: HalftoneDitherMode
  /** Same as `Canvas.rect` / `resolveRectBounds` — default follows canvas `rectSnap`. */
  snap?: CanvasRectSnapMode
}

/** 8×8 Bayer index matrix (0–63). */
const BAYER8: readonly number[][] = [
  [0, 48, 12, 60, 3, 51, 15, 63],
  [32, 16, 44, 28, 35, 19, 47, 31],
  [8, 56, 4, 52, 11, 59, 7, 55],
  [40, 24, 36, 20, 43, 27, 39, 23],
  [3, 35, 11, 43, 1, 33, 9, 41],
  [51, 19, 59, 27, 49, 17, 57, 25],
  [15, 47, 7, 39, 13, 45, 5, 37],
  [63, 31, 55, 23, 61, 29, 53, 21],
]

interface CanvasDefaults {
  fill: CanvasFill
  stroke: CanvasFill
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

interface SegmentEdge {
  x1: number
  y1: number
  x2: number
  y2: number
  count: number
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

const resolveStopColor = (color: string | Color): string =>
  color instanceof Color ? color.toCss() : color

const applyStops = (gradient: CanvasGradient, stops: GradientStop[]): CanvasGradient => {
  stops.forEach(([pos, color]) => gradient.addColorStop(pos, resolveStopColor(color)))
  return gradient
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
  private grainCache: HTMLCanvasElement | null = null
  private halftoneScratch: HTMLCanvasElement | null = null
  private halftoneImageData: ImageData | null = null
  private halftoneImageDataW = 0
  private halftoneImageDataH = 0

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

  snapX(x: number): number {
    const t = this.ctx.getTransform()
    if (!isAxisAligned(t) || t.a <= 0) return x
    return (Math.round(canonicalEdge(t.a * x + t.e)) - t.e) / t.a
  }

  snapY(y: number): number {
    const t = this.ctx.getTransform()
    if (!isAxisAligned(t) || t.d <= 0) return y
    return (Math.round(canonicalEdge(t.d * y + t.f)) - t.f) / t.d
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
    this.ctx.fillStyle = fill
    this.ctx.fillRect(0, 0, this.w, this.h)
  }

  fill(fill: CanvasFill | null): void {
    this.def.fill = fill ?? 'transparent'
  }

  stroke(stroke: CanvasFill | null): void {
    this.def.stroke = stroke ?? 'transparent'
  }

  strokeWeight(weight: number): void {
    this.def.strokeW = weight
  }

  line(
    a: Vec,
    b: Vec,
    stroke: CanvasFill = this.def.stroke,
    strokeW: number = this.def.strokeW
  ): void {
    applyStyle(this.ctx, { stroke, strokeW, fill: 'transparent', lineCap: this.def.lineCap, lineJoin: this.def.lineJoin })
    this.ctx.beginPath()
    this.ctx.moveTo(a.x, a.y)
    this.ctx.lineTo(b.x, b.y)
    this.ctx.stroke()
  }

  circle(
    at: Vec,
    r: number = 5,
    fill: CanvasFill = this.def.fill,
    stroke: CanvasFill = this.def.stroke,
    strokeW: number = this.def.strokeW
  ): void {
    applyStyle(this.ctx, { fill, stroke, strokeW, lineCap: this.def.lineCap, lineJoin: this.def.lineJoin })
    this.ctx.beginPath()
    this.ctx.arc(at.x, at.y, Math.max(0, r), 0, Math.PI * 2)
    if (fill !== 'transparent') this.ctx.fill()
    if (stroke !== 'transparent' && strokeW > 0) this.ctx.stroke()
  }

  ellipse(
    at: Vec,
    rx: number,
    ry: number,
    rotation: number = 0,
    fill: CanvasFill = this.def.fill,
    stroke: CanvasFill = this.def.stroke,
    strokeW: number = this.def.strokeW
  ): void {
    applyStyle(this.ctx, { fill, stroke, strokeW, lineCap: this.def.lineCap, lineJoin: this.def.lineJoin })
    this.ctx.beginPath()
    this.ctx.ellipse(at.x, at.y, Math.max(0, rx), Math.max(0, ry), rotation, 0, Math.PI * 2)
    if (fill !== 'transparent') this.ctx.fill()
    if (stroke !== 'transparent' && strokeW > 0) this.ctx.stroke()
  }

  rect(
    at: Vec,
    width: number,
    height: number,
    fill: CanvasFill = this.def.fill,
    stroke: CanvasFill = this.def.stroke,
    strokeW: number = this.def.strokeW,
    options: CanvasRectOptions = {}
  ): void {
    const bounds = this.resolveRectBounds(at, width, height, options)
    const strokeAlign = options.strokeAlign ?? 'center'
    applyStyle(this.ctx, { fill, stroke, strokeW, lineCap: this.def.lineCap, lineJoin: this.def.lineJoin })
    if (fill !== 'transparent') {
      this.ctx.fillRect(bounds.x, bounds.y, bounds.width, bounds.height)
    }
    if (stroke !== 'transparent' && strokeW > 0) {
      if (strokeAlign === 'inside') {
        const inset = strokeW / 2
        const strokeWidth = bounds.width - strokeW
        const strokeHeight = bounds.height - strokeW
        if (strokeWidth > 0 && strokeHeight > 0) {
          this.ctx.strokeRect(bounds.x + inset, bounds.y + inset, strokeWidth, strokeHeight)
        }
      } else {
        this.ctx.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height)
      }
    }
  }

  rectC(
    center: Vec,
    width: number,
    height: number,
    fill: CanvasFill = this.def.fill,
    stroke: CanvasFill = this.def.stroke,
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

  /**
   * Draw a uniform grid line overlay for a rectangular area.
   *
   * Useful when cell interiors are filled separately and grid lines should be
   * rendered once per boundary (avoids doubled center seams from per-cell stroke).
   */
  gridLines(
    at: Vec,
    width: number,
    height: number,
    cols: number,
    rows: number,
    stroke: CanvasFill = this.def.stroke,
    strokeW: number = this.def.strokeW,
    options: CanvasGridLinesOptions = {}
  ): void {
    if (stroke === 'transparent' || strokeW <= 0) return

    const safeCols = Math.max(1, Math.floor(cols))
    const safeRows = Math.max(1, Math.floor(rows))
    const includeOuter = options.includeOuter ?? true
    const strokeAlign = options.strokeAlign ?? 'inside'
    const bounds = this.resolveRectBounds(at, width, height, options)
    const colStep = bounds.width / safeCols
    const rowStep = bounds.height / safeRows

    applyStyle(this.ctx, { fill: 'transparent', stroke, strokeW, lineCap: this.def.lineCap, lineJoin: this.def.lineJoin })
    this.ctx.beginPath()

    const startCol = includeOuter ? 0 : 1
    const endCol = includeOuter ? safeCols : safeCols - 1
    for (let col = startCol; col <= endCol; col++) {
      let x = bounds.x + col * colStep
      if (strokeAlign === 'inside') {
        if (col === 0) x += strokeW / 2
        if (col === safeCols) x -= strokeW / 2
      }
      this.ctx.moveTo(x, bounds.y)
      this.ctx.lineTo(x, bounds.y + bounds.height)
    }

    const startRow = includeOuter ? 0 : 1
    const endRow = includeOuter ? safeRows : safeRows - 1
    for (let row = startRow; row <= endRow; row++) {
      let y = bounds.y + row * rowStep
      if (strokeAlign === 'inside') {
        if (row === 0) y += strokeW / 2
        if (row === safeRows) y -= strokeW / 2
      }
      this.ctx.moveTo(bounds.x, y)
      this.ctx.lineTo(bounds.x + bounds.width, y)
    }

    this.ctx.stroke()
  }

  /**
   * Draw deduplicated edges for an arbitrary set of axis-aligned cell bounds.
   *
   * Designed for recursive/irregular subdivisions where a uniform cols/rows
   * overlay is not sufficient. Shared cell boundaries are drawn once.
   */
  cellEdges(
    cells: CanvasCellBoundsLike[],
    stroke: CanvasFill = this.def.stroke,
    strokeW: number = this.def.strokeW,
    options: CanvasCellEdgesOptions = {}
  ): void {
    if (stroke === 'transparent' || strokeW <= 0 || cells.length === 0) return

    const includeOuter = options.includeOuter ?? true
    const strokeAlign = options.strokeAlign ?? 'inside'
    const edges = new Map<string, SegmentEdge>()

    let minX = Number.POSITIVE_INFINITY
    let maxX = Number.NEGATIVE_INFINITY
    let minY = Number.POSITIVE_INFINITY
    let maxY = Number.NEGATIVE_INFINITY

    const registerEdge = (x1: number, y1: number, x2: number, y2: number) => {
      const ax = canonicalEdge(x1)
      const ay = canonicalEdge(y1)
      const bx = canonicalEdge(x2)
      const by = canonicalEdge(y2)
      const forward = ax < bx || (ax === bx && ay <= by)
      const sx = forward ? ax : bx
      const sy = forward ? ay : by
      const ex = forward ? bx : ax
      const ey = forward ? by : ay
      const key = `${sx},${sy}|${ex},${ey}`
      const edge = edges.get(key)
      if (edge) {
        edge.count += 1
      } else {
        edges.set(key, { x1: sx, y1: sy, x2: ex, y2: ey, count: 1 })
      }
    }

    for (const cell of cells) {
      const bounds = this.resolveRectBounds(
        new Vec(cell.x, cell.y),
        cell.width,
        cell.height,
        options
      )
      const left = canonicalEdge(bounds.x)
      const right = canonicalEdge(bounds.x + bounds.width)
      const top = canonicalEdge(bounds.y)
      const bottom = canonicalEdge(bounds.y + bounds.height)
      minX = Math.min(minX, left)
      maxX = Math.max(maxX, right)
      minY = Math.min(minY, top)
      maxY = Math.max(maxY, bottom)

      registerEdge(left, top, right, top)
      registerEdge(right, top, right, bottom)
      registerEdge(left, bottom, right, bottom)
      registerEdge(left, top, left, bottom)
    }

    applyStyle(this.ctx, { fill: 'transparent', stroke, strokeW, lineCap: this.def.lineCap, lineJoin: this.def.lineJoin })
    this.ctx.beginPath()

    for (const edge of edges.values()) {
      const vertical = edge.x1 === edge.x2
      const horizontal = edge.y1 === edge.y2
      if (!vertical && !horizontal) continue

      const isOuter = vertical
        ? edge.x1 === minX || edge.x1 === maxX
        : edge.y1 === minY || edge.y1 === maxY

      if (!includeOuter && isOuter) continue

      let { x1, y1, x2, y2 } = edge
      if (strokeAlign === 'inside' && isOuter) {
        if (vertical && edge.x1 === minX) {
          x1 += strokeW / 2
          x2 += strokeW / 2
        } else if (vertical && edge.x1 === maxX) {
          x1 -= strokeW / 2
          x2 -= strokeW / 2
        } else if (horizontal && edge.y1 === minY) {
          y1 += strokeW / 2
          y2 += strokeW / 2
        } else if (horizontal && edge.y1 === maxY) {
          y1 -= strokeW / 2
          y2 -= strokeW / 2
        }
      }

      this.ctx.moveTo(x1, y1)
      this.ctx.lineTo(x2, y2)
    }

    this.ctx.stroke()
  }

  text(
    value: string,
    at: Vec,
    fill: string = this.def.text,
    options: CanvasTextOptions = {}
  ): void {
    this.ctx.fillStyle = fill
    this.ctx.textAlign = options.align ?? 'start'
    this.ctx.textBaseline = options.baseline ?? 'alphabetic'
    const fontSize = options.fontSize ?? 12
    const fontWeight = options.fontWeight ?? '400'
    const fontFamily = options.fontFamily ?? 'system-ui, sans-serif'
    this.ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`
    this.ctx.fillText(value, at.x, at.y)
  }

  withContext(draw: (ctx: CanvasRenderingContext2D) => void): void {
    this.ctx.save()
    draw(this.ctx)
    this.ctx.restore()
  }

  linearGradient(from: Vec, to: Vec, stops: GradientStop[]): CanvasGradient {
    return applyStops(
      this.ctx.createLinearGradient(from.x, from.y, to.x, to.y),
      stops
    )
  }

  radialGradient(
    center: Vec,
    outerRadius: number,
    stops: GradientStop[],
    innerRadius: number = 0,
    focalPoint?: Vec
  ): CanvasGradient {
    const focal = focalPoint ?? center
    return applyStops(
      this.ctx.createRadialGradient(focal.x, focal.y, innerRadius, center.x, center.y, outerRadius),
      stops
    )
  }

  conicGradient(center: Vec, stops: GradientStop[], startAngle: number = 0): CanvasGradient {
    return applyStops(
      this.ctx.createConicGradient(startAngle, center.x, center.y),
      stops
    )
  }

  grain(at: Vec, width: number, height: number, options: GrainOptions = {}): void {
    const {
      alpha = 0.08,
      blend = 'overlay',
      animated = false,
      rng = Math.random
    } = options

    const w = Math.ceil(width)
    const h = Math.ceil(height)

    const needsRebuild = animated
      || !this.grainCache
      || this.grainCache.width !== w
      || this.grainCache.height !== h

    if (needsRebuild) {
      const offscreen = this.grainCache ?? document.createElement('canvas')
      offscreen.width = w
      offscreen.height = h
      const octx = offscreen.getContext('2d')!
      const data = octx.createImageData(w, h)
      for (let i = 0; i < data.data.length; i += 4) {
        const val = rng() * 255
        data.data[i] = val
        data.data[i + 1] = val
        data.data[i + 2] = val
        data.data[i + 3] = 255
      }
      octx.putImageData(data, 0, 0)
      this.grainCache = offscreen
    }

    this.withContext(ctx => {
      ctx.globalAlpha = alpha
      ctx.globalCompositeOperation = blend
      ctx.drawImage(this.grainCache!, at.x, at.y)
    })
  }

  grainFill(
    draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void,
    at: Vec,
    width: number,
    height: number,
    options: GrainFillOptions = {}
  ): CanvasPattern {
    const { intensity = 0.15, rng = Math.random } = options
    const w = Math.ceil(width)
    const h = Math.ceil(height)

    const offscreen = document.createElement('canvas')
    offscreen.width = w
    offscreen.height = h
    const octx = offscreen.getContext('2d')!

    draw(octx, w, h)

    const imageData = octx.getImageData(0, 0, w, h)
    const pixels = imageData.data
    for (let i = 3; i < pixels.length; i += 4) {
      const current = pixels[i] ?? 255
      pixels[i] = Math.round(current * (1 - intensity + rng() * intensity * 2))
    }
    octx.putImageData(imageData, 0, 0)

    const pattern = this.ctx.createPattern(offscreen, 'no-repeat')!
    pattern.setTransform(new DOMMatrix().translate(this.snapX(at.x), this.snapY(at.y)))
    return pattern
  }

halftone(
  at: Vec,
  width: number,
  height: number,
  color: string,
  density: (nx: number, ny: number) => number,
  options: HalftoneOptions = {}
): void {
  const { spacing = 4, rng = Math.random, dither = 'stochastic', snap } = options
  const rectOpts = snap !== undefined ? { snap } : undefined
  const bounds = this.resolveRectBounds(at, width, height, rectOpts)
  const t = this.ctx.getTransform()
  const axisOk = isAxisAligned(t) && t.a > 0 && t.d > 0

  let destX: number
  let destY: number
  let destW: number
  let destH: number
  let wPx: number
  let hPx: number
  let destFromDevicePx = false
  let leftPxForDraw = 0
  let topPxForDraw = 0

  if (axisOk) {
    destX = bounds.x
    destY = bounds.y
    destW = bounds.width
    destH = bounds.height
    const leftPx = Math.round(canonicalEdge(t.a * bounds.x + t.e))
    const rightPx = Math.max(leftPx + 1, Math.round(canonicalEdge(t.a * (bounds.x + bounds.width) + t.e)))
    const topPx = Math.round(canonicalEdge(t.d * bounds.y + t.f))
    const bottomPx = Math.max(topPx + 1, Math.round(canonicalEdge(t.d * (bounds.y + bounds.height) + t.f)))
    wPx = Math.max(1, rightPx - leftPx)
    hPx = Math.max(1, bottomPx - topPx)
    destFromDevicePx = true
    leftPxForDraw = leftPx
    topPxForDraw = topPx
  } else {
    destX = this.snapX(at.x)
    destY = this.snapY(at.y)
    destW = Math.max(1, Math.ceil(width))
    destH = Math.max(1, Math.ceil(height))
    wPx = Math.max(1, Math.ceil(width))
    hPx = Math.max(1, Math.ceil(height))
  }

  if (wPx <= 0 || hPx <= 0) return

  const parsed = Color.parse(color)
  if (!parsed || parsed.a <= 0) return

  const r = parsed.r
  const g = parsed.g
  const b = parsed.b
  const aByte = Math.round(parsed.a * 255)

  if (!this.halftoneScratch) {
    this.halftoneScratch = document.createElement('canvas')
  }
  // FIX 1: size scratch to exactly wPx × hPx — avoids iOS Safari drawImage
  // source-clip bugs that occur when the scratch canvas is larger than the read region.
  if (this.halftoneScratch.width !== wPx) this.halftoneScratch.width = wPx
  if (this.halftoneScratch.height !== hPx) this.halftoneScratch.height = hPx

  let imageData = this.halftoneImageData
  if (!imageData || this.halftoneImageDataW !== wPx || this.halftoneImageDataH !== hPx) {
    imageData = new ImageData(wPx, hPx)
    this.halftoneImageData = imageData
    this.halftoneImageDataW = wPx
    this.halftoneImageDataH = hPx
  }

  const data = imageData.data
  data.fill(0)

  const safeSpacing = Math.max(1, spacing)
  const stepX =
    safeSpacing <= 1 ? 1 : Math.max(1, Math.round((safeSpacing * wPx) / Math.max(1e-12, destW)))
  const stepY =
    safeSpacing <= 1 ? 1 : Math.max(1, Math.round((safeSpacing * hPx) / Math.max(1e-12, destH)))
  const invWp = 1 / wPx
  const invHp = 1 / hPx

  for (let py = 0; py < hPx; py += stepY) {
    for (let px = 0; px < wPx; px += stepX) {
      const nx = (px + 0.5) * invWp
      const ny = (py + 0.5) * invHp
      const d = density(nx, ny)
      let on: boolean
      if (dither === 'ordered') {
        const lx = nx * destW
        const ly = ny * destH
        const ix = (Math.floor(lx / safeSpacing) % 8 + 8) % 8
        const iy = (Math.floor(ly / safeSpacing) % 8 + 8) % 8
        const thresh = (BAYER8[iy]![ix]! + 0.5) / 64
        on = d > thresh
      } else {
        // FIX 2: removed hiResStochastic Bayer jitter — the 8-device-px period
        // created visible horizontal bands on mobile DPR ≥ 2. Pure stochastic
        // is sufficient; more device pixels per cell means better averaging anyway.
        on = rng() < d
      }
      if (!on) continue

      const xMax = Math.min(px + stepX, wPx)
      const yMax = Math.min(py + stepY, hPx)
      for (let yy = py; yy < yMax; yy++) {
        let i = (yy * wPx + px) * 4
        for (let xx = px; xx < xMax; xx++) {
          data[i] = r
          data[i + 1] = g
          data[i + 2] = b
          data[i + 3] = aByte
          i += 4
        }
      }
    }
  }

  const sctx = this.halftoneScratch.getContext('2d')!
  sctx.putImageData(imageData, 0, 0)

  this.withContext(ctx => {
    const prevSmooth = ctx.imageSmoothingEnabled
    const prevQuality = ctx.imageSmoothingQuality
    ctx.imageSmoothingEnabled = false
    ctx.imageSmoothingQuality = 'low'
    if (destFromDevicePx) {
      const dx = (leftPxForDraw - t.e) / t.a
      const dy = (topPxForDraw - t.f) / t.d
      const dw = wPx / t.a
      const dh = hPx / t.d
      ctx.drawImage(this.halftoneScratch!, 0, 0, wPx, hPx, dx, dy, dw, dh)
    } else {
      ctx.drawImage(this.halftoneScratch!, 0, 0, wPx, hPx, destX, destY, destW, destH)
    }
    ctx.imageSmoothingQuality = prevQuality
    ctx.imageSmoothingEnabled = prevSmooth
  })
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