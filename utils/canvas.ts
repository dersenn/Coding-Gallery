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
export type CanvasStrokeAlign = 'center' | 'inside'

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

  ellipse(
    at: Vec,
    rx: number,
    ry: number,
    rotation: number = 0,
    fill: string = this.def.fill,
    stroke: string = this.def.stroke,
    strokeW: number = this.def.strokeW
  ): void {
    this.ctx.save()
    applyStyle(this.ctx, { fill, stroke, strokeW, lineCap: this.def.lineCap, lineJoin: this.def.lineJoin })
    this.ctx.beginPath()
    this.ctx.ellipse(at.x, at.y, Math.max(0, rx), Math.max(0, ry), rotation, 0, Math.PI * 2)
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
    const strokeAlign = options.strokeAlign ?? 'center'
    this.ctx.save()
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
    stroke: string = this.def.stroke,
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

    this.ctx.save()
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
    this.ctx.restore()
  }

  /**
   * Draw deduplicated edges for an arbitrary set of axis-aligned cell bounds.
   *
   * Designed for recursive/irregular subdivisions where a uniform cols/rows
   * overlay is not sufficient. Shared cell boundaries are drawn once.
   */
  cellEdges(
    cells: CanvasCellBoundsLike[],
    stroke: string = this.def.stroke,
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

    this.ctx.save()
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
    this.ctx.restore()
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
