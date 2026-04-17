import { Vec } from './generative'
import { Color, type GradientStop } from './color'
import { type PrintContractConfig, type PrintContract, createPrintContract } from './print'


/**
 * Canvas 2D helper used by the `canvas2d` sketch runtime (`context.canvas`).
 *
 * - **Units:** `w` and `h` are logical **CSS pixels**; the element’s backing store uses
 *   {@link Canvas.pixelRatio} so drawing stays sharp on HiDPI screens.
 * - **Rects:** Prefer {@link Canvas.rect} / {@link Canvas.rectC} over raw `ctx.fillRect`
 *   for consistent seam control and optional **device-pixel snapping**
 *   ({@link CanvasRectOptions.snap} / {@link Canvas.rectSnapDefault}).
 * - **Style:** {@link Canvas.fill}, {@link Canvas.stroke}, and {@link Canvas.strokeWeight}
 *   update default paint on {@link Canvas.def}; primitives default to those when you omit
 *   color arguments.
 */

export interface CanvasCreateConfig {
  parent: HTMLElement
  id: string
  width?: number
  height?: number
  alpha?: boolean
  pixelRatio?: number | 'auto'
  rectSnap?: CanvasRectSnapMode
  defaults?: CanvasDefaultStyle
  print?: PrintContractConfig   // opt-in: enables print resolution mode
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

/** Options for {@link Canvas.halftone}. */
export interface HalftoneOptions {
  /** Dot pitch in **logical pixels** (default `4`). */
  spacing?: number
  /** Seeded `() => [0, 1)` for deterministic dither; defaults to `Math.random`. */
  rng?: () => number
}

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

/**
 * Owns one `<canvas>`, its 2D context, logical dimensions, and default styles.
 * Sketch code typically receives an instance as `canvas` in `draw(context)`.
 */
export class Canvas {
  /** Host element the canvas node is appended to. */
  parent: HTMLElement
  /** DOM id assigned to the canvas element. */
  id: string
  /** Logical width in CSS pixels. */
  w: number
  /** Logical height in CSS pixels. */
  h: number
  /** Device pixel ratio applied between logical size and bitmap size. */
  pixelRatio: number
  /** Center of the logical canvas `(w/2, h/2)`. */
  c: Vec
  /** The underlying `<canvas>` element. */
  el: HTMLCanvasElement
  /** 2D rendering context (logical units after constructor `resize`). */
  ctx: CanvasRenderingContext2D
  /** Default fill, stroke, stroke weight, background, and text colors. */
  def: CanvasDefaults
  /** Default rect snap mode when per-call `options.snap` is omitted. */
  rectSnapDefault: CanvasRectSnapMode

  print: PrintContract | null = null

  private grainCache: HTMLCanvasElement | null = null

  private resolvePixelRatio(value: CanvasCreateConfig['pixelRatio']): number {
    if (typeof value === 'number') {
      return Number.isFinite(value) && value > 0 ? value : 1
    }
    if (typeof window === 'undefined') return 1
    const dpr = window.devicePixelRatio || 1
    return Number.isFinite(dpr) && dpr > 0 ? dpr : 1
  }

  /**
   * Creates the canvas, appends it to `setup.parent`, applies DPR scaling, and
   * seeds {@link Canvas.def} from computed styles plus optional `setup.defaults`.
   */
  constructor(setup: CanvasCreateConfig) {
    if (setup.print) {
      const contract = createPrintContract(setup.print)
      this.print = contract
      setup = {
        ...setup,
        width:      contract.trimWidth,
        height:     contract.trimHeight,
        pixelRatio: 1,   // DPI is already baked in; no DPR on top
        rectSnap:   setup.rectSnap ?? 'none',
      }
    }
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



  /** Snap a logical **x** to the device pixel grid when the current transform is axis-aligned. */
  snapX(x: number): number {
    const t = this.ctx.getTransform()
    if (!isAxisAligned(t) || t.a <= 0) return x
    return (Math.round(canonicalEdge(t.a * x + t.e)) - t.e) / t.a
  }

  /** Snap a logical **y** to the device pixel grid when the current transform is axis-aligned. */
  snapY(y: number): number {
    const t = this.ctx.getTransform()
    if (!isAxisAligned(t) || t.d <= 0) return y
    return (Math.round(canonicalEdge(t.d * y + t.f)) - t.f) / t.d
  }

  /** Resize logical dimensions and rebuild the backing store transform. */
  resize(width: number, height: number): void {
    this.w = clampDimension(width)
    this.h = clampDimension(height)
    this.c = new Vec(this.w / 2, this.h / 2)

    if (this.print) {
      this.el.width = this.print.canvasWidth
      this.el.height = this.print.canvasHeight
      this.el.style.width = '100%'
      this.el.style.height = '100%'
      this.el.style.display = 'block'
      this.ctx.setTransform(1, 0, 0, 1, this.print.trimX, this.print.trimY)
    } else {
      // existing behavior unchanged
      this.el.width  = Math.max(1, Math.round(this.w * this.pixelRatio))
      this.el.height = Math.max(1, Math.round(this.h * this.pixelRatio))
      this.el.style.width  = `${this.w}px`
      this.el.style.height = `${this.h}px`
      this.ctx.setTransform(this.pixelRatio, 0, 0, this.pixelRatio, 0, 0)
    }
    applyStyle(this.ctx, this.def)
  }

  /** Clear the full logical bitmap (transparent pixels when the context is created with alpha). */
  clear(): void {
    this.ctx.clearRect(0, 0, this.w, this.h)
  }

  /** Paint the entire logical canvas with a solid color (defaults to {@link Canvas.def}.background). */
  background(fill: string = this.def.background): void {
    this.ctx.fillStyle = fill
    this.ctx.fillRect(0, 0, this.w, this.h)
  }

  /** Set default fill for subsequent primitives (`null` → transparent). */
  fill(fill: CanvasFill | null): void {
    this.def.fill = fill ?? 'transparent'
  }

  /** Set default stroke for subsequent primitives (`null` → transparent). */
  stroke(stroke: CanvasFill | null): void {
    this.def.stroke = stroke ?? 'transparent'
  }

  /** Set default stroke width in **logical pixels**. */
  strokeWeight(weight: number): void {
    this.def.strokeW = weight
  }

  /** Stroke a segment from `a` to `b` in logical space. */
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

  /** Draw a circle centered at `at` with radius `r` (logical pixels). */
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

  /** Draw an axis-aligned ellipse centered at `at`. */
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

  /**
   * Fill and/or stroke an axis-aligned rectangle with top-left at `at`.
   * Honors {@link CanvasRectOptions.snap} and {@link CanvasRectOptions.strokeAlign}.
   */
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

  /** Same as {@link Canvas.rect} but positioned by **center** instead of top-left. */
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

  /** Draw single-line text at `at` using {@link CanvasTextOptions} for alignment and font. */
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

  /** `ctx.save()`, run `draw`, then `ctx.restore()` — safe for temporary transforms/styles. */
  withContext(draw: (ctx: CanvasRenderingContext2D) => void): void {
    this.ctx.save()
    draw(this.ctx)
    this.ctx.restore()
  }

  /** Build a linear gradient in logical space; pass result as `fill` or `stroke`. */
  linearGradient(from: Vec, to: Vec, stops: GradientStop[]): CanvasGradient {
    return applyStops(
      this.ctx.createLinearGradient(from.x, from.y, to.x, to.y),
      stops
    )
  }

  /** Build a radial gradient in logical space. */
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

  /** Build a conic gradient around `center` starting at `startAngle` (radians). */
  conicGradient(center: Vec, stops: GradientStop[], startAngle: number = 0): CanvasGradient {
    return applyStops(
      this.ctx.createConicGradient(startAngle, center.x, center.y),
      stops
    )
  }

  /**
   * Composite a grayscale noise tile into a region (cached unless `animated` or size changes).
   * Use sketch `rng` in options for deterministic grain.
   */
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

  /**
   * Run `draw` on an offscreen buffer, jitter alpha, then return a {@link CanvasPattern}
   * anchored at `at` for use as a fill.
   */
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

  /**
   * Stochastic halftone: for each dot site, draws a square if `rng() < density(nx, ny)`.
   *
   * `density` receives **normalized** coordinates in roughly `[0, 1)`: `nx = px / width`,
   * `ny = py / height` for the sample grid inside the rect. Return values are treated as
   * probabilities (typical range `0…1`; values outside still work mathematically).
   */
  halftone(
    at: Vec,
    width: number,
    height: number,
    color: string,
    density: (nx: number, ny: number) => number,
    options: HalftoneOptions = {}
  ): void {
    const { spacing = 4, rng = Math.random } = options
    const w = Math.ceil(width)
    const h = Math.ceil(height)
    const ox = this.snapX(at.x)
    const oy = this.snapY(at.y)

    this.withContext(ctx => {
      ctx.fillStyle = color
      const path = new Path2D()
      for (let py = 0; py < h; py += spacing) {
        for (let px = 0; px < w; px += spacing) {
          if (rng() < density(px / w, py / h)) {
            path.rect(ox + px, oy + py, spacing, spacing)
          }
        }
      }
      /* clip to the rect, so that the halftone is only drawn within the rect */
      /* but leaves clipped pixels, not suitable for bigger sizings */
      // ctx.save()
      // ctx.beginPath()
      // ctx.rect(ox, oy, w, h)
      // ctx.clip()
      ctx.fill(path)
      // ctx.restore()
    })
  }

  private pngCrc(data: Uint8Array): number {
    let crc = 0xffffffff
    for (const byte of data) {
      crc ^= byte
      for (let i = 0; i < 8; i++) {
        crc = (crc & 1) ? (0xedb88320 ^ (crc >>> 1)) : (crc >>> 1)
      }
    }
    return (crc ^ 0xffffffff) >>> 0
  }

  private injectPngDpi(buffer: ArrayBuffer, dpi: number): ArrayBuffer {
    const ppm = Math.round(dpi / 25.4 * 1000) // pixels per inch → pixels per metre

    // pHYs chunk data: 4 bytes x ppm, 4 bytes y ppm, 1 byte unit (1 = metre)
    const data = new Uint8Array(9)
    const view = new DataView(data.buffer)
    view.setUint32(0, ppm)
    view.setUint32(4, ppm)
    view.setUint8(8, 1)

    const type = new TextEncoder().encode('pHYs')
    const crc = this.pngCrc(new Uint8Array([...type, ...data]))

    // Assemble chunk: length (4) + type (4) + data (9) + crc (4) = 21 bytes
    const chunk = new Uint8Array(21)
    const cv = new DataView(chunk.buffer)
    cv.setUint32(0, 9)       // data length
    chunk.set(type, 4)       // chunk type
    chunk.set(data, 8)       // chunk data
    cv.setUint32(17, crc)    // crc covers type + data

    // Insert after PNG signature (8 bytes) + IHDR chunk (4+4+13+4 = 25 bytes) = offset 33
    const src = new Uint8Array(buffer)
    const out = new Uint8Array(src.length + chunk.length)
    out.set(src.subarray(0, 33))
    out.set(chunk, 33)
    out.set(src.subarray(33), 33 + chunk.length)
    return out.buffer
  }

  /** Trigger a browser download of the current bitmap as PNG. */
  save(options: CanvasExportOptions = {}): void {
    const { projectId, seed } = options
    const baseName = projectId ?? this.id
    const safeSeed = seed === undefined ? '' : `-${String(seed)}`
    const filename = `${baseName}${safeSeed}.png`

    if (this.print) {
      this.el.toBlob(blob => {
        if (!blob) return
        blob.arrayBuffer().then(buffer => {
          const patched = this.injectPngDpi(buffer, this.print!.dpi)
          const link = document.createElement('a')
          link.download = filename
          link.href = URL.createObjectURL(new Blob([patched], { type: 'image/png' }))
          link.click()
          URL.revokeObjectURL(link.href)
        })
      }, 'image/png')
      return
    }

    const link = document.createElement('a')
    link.download = filename
    link.href = this.el.toDataURL('image/png')
    link.click()
  }
}

/** Factory used by the runtime to attach a {@link Canvas} to the sketch container. */
export const createCanvas2D = (config: CanvasCreateConfig): Canvas => {
  return new Canvas(config)
}

/**
 * Low-level helper: `save` / `restore` around raw 2D context drawing.
 * Prefer {@link Canvas.withContext} when you already hold a `Canvas` instance.
 */
export const draw = (
  target: Canvas | CanvasRenderingContext2D,
  callback: (ctx: CanvasRenderingContext2D) => void
): void => {
  const ctx = target instanceof Canvas ? target.ctx : target
  ctx.save()
  callback(ctx)
  ctx.restore()
}