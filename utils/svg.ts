import { Vec, quadBezControlPoint, splineControlPoints } from './generative'
import { buildSvgDownloadFilename, serializeSvgWithMetadata, type DownloadControlValues } from './download'

/**
 * SVG Engine - Port from original engine.js
 * 
 * Main class for creating and manipulating SVG elements
 * programmatically for generative art sketches.
 */

export interface SVGConfig {
  parent: HTMLElement
  id: string
  width?: number
  height?: number
}

export interface SVGTextOptions {
  anchor?: 'start' | 'middle' | 'end'
  baseline?: 'auto' | 'middle' | 'hanging' | 'text-top' | 'text-bottom' | 'alphabetic' | 'ideographic'
  fontSize?: number
  fontFamily?: string
  fontWeight?: string
}

export class SVG {
  ns: string
  xl: string
  mime: { type: string }
  parent: HTMLElement
  id: string
  w: number
  h: number
  c: Vec // center point
  stage: SVGSVGElement
  els: SVGElement[]
  def: {
    fill: string
    stroke: string
    strokeW: number
  }

  constructor(setup: SVGConfig) {
    this.ns = 'http://www.w3.org/2000/svg'
    this.xl = 'http://www.w3.org/1999/xlink'
    this.mime = { type: 'image/svg+xml' }
    this.parent = setup.parent
    this.id = setup.id
    this.w = setup.width ? setup.width : this.parent.clientWidth
    this.h = setup.height ? setup.height : this.parent.clientHeight
    this.c = new Vec(this.w / 2, this.h / 2)
    this.els = []

    // Default styles
    this.def = {
      fill: 'transparent',
      stroke: '#000',
      strokeW: 1,
    }

    // Initialize and append to DOM
    this.stage = this.init()
  }

  private init(): SVGSVGElement {
    const stage = document.createElementNS(this.ns, 'svg') as SVGSVGElement
    stage.setAttribute('id', this.id)
    stage.setAttribute('xmlns', this.ns)
    stage.setAttribute('xmlns:xlink', this.xl)
    stage.setAttribute('width', this.w.toString())
    stage.setAttribute('height', this.h.toString())
    stage.setAttribute('viewBox', `0 0 ${this.w} ${this.h}`)
    this.parent.append(stage)
    return stage
  }

  private createSvgElement<T extends keyof SVGElementTagNameMap>(tag: T): SVGElementTagNameMap[T] {
    return document.createElementNS(this.ns, tag) as SVGElementTagNameMap[T]
  }

  private setAttrs(el: Element, attrs: Record<string, string | number | null | undefined>): void {
    Object.entries(attrs).forEach(([key, value]) => {
      if (value === null || value === undefined) return
      el.setAttribute(key, String(value))
    })
  }

  private applyStrokeFill(
    el: SVGElement,
    fill: string,
    stroke: string,
    strokeW: number
  ): void {
    this.setAttrs(el, {
      fill,
      stroke,
      'stroke-width': strokeW
    })
  }

  save(seed?: string, sketchName?: string, controls?: DownloadControlValues): void {
    const str = serializeSvgWithMetadata(this.stage, {
      projectId: sketchName || this.id,
      seed,
      controls,
      sourceUrl: typeof window !== 'undefined' ? window.location.href : undefined
    })
    const blob = new Blob([str], this.mime)

    const link = document.createElement('a')
    link.download = buildSvgDownloadFilename({
      projectId: sketchName || this.id,
      seed
    })
    link.href = URL.createObjectURL(blob)
    link.click()
    URL.revokeObjectURL(link.href)
  }

  line(
    a: Vec,
    b: Vec,
    stroke: string = this.def.stroke,
    strokeW: number = this.def.strokeW
  ): SVGLineElement {
    const line = this.createSvgElement('line')
    this.setAttrs(line, {
      x1: a.x,
      y1: a.y,
      x2: b.x,
      y2: b.y,
      stroke,
      'stroke-width': strokeW
    })
    this.stage.append(line)
    return line
  }

  circle(
    c: Vec,
    r: number = 5,
    fill: string = this.def.fill,
    stroke: string = this.def.stroke,
    strokeW: number = this.def.strokeW
  ): SVGCircleElement {
    const circle = this.createSvgElement('circle')
    this.setAttrs(circle, {
      cx: c.x,
      cy: c.y,
      r
    })
    this.applyStrokeFill(circle, fill, stroke, strokeW)
    this.stage.append(circle)
    return circle
  }

  circles(
    iA: Vec[],
    r: number = 5,
    fill: string = this.def.fill,
    stroke: string = this.def.stroke,
    strokeW: number = this.def.strokeW
  ): SVGCircleElement[] {
    const oA: SVGCircleElement[] = []
    for (let c = 0; c < iA.length; c++) {
      const circle = this.circle(iA[c]!, r, fill, stroke, strokeW)
      oA.push(circle)
    }
    return oA
  }

  ellipse(
    c: Vec,
    rx: number,
    ry: number,
    fill: string = this.def.fill,
    stroke: string = this.def.stroke,
    strokeW: number = this.def.strokeW
  ): SVGEllipseElement {
    const ellipse = this.createSvgElement('ellipse')
    this.setAttrs(ellipse, {
      cx: c.x,
      cy: c.y,
      rx,
      ry
    })
    this.applyStrokeFill(ellipse, fill, stroke, strokeW)
    this.stage.append(ellipse)
    return ellipse
  }

  rect(
    pt: Vec,
    w: number,
    h: number,
    fill: string = 'transparent',
    stroke: string = this.def.stroke,
    strokeW: number = this.def.strokeW
  ): SVGRectElement {
    const rect = this.createSvgElement('rect')
    this.setAttrs(rect, {
      x: pt.x,
      y: pt.y,
      width: w,
      height: h
    })
    this.applyStrokeFill(rect, fill, stroke, strokeW)
    this.stage.append(rect)
    return rect
  }

  rectC(
    c: Vec,
    w: number,
    h: number,
    fill: string = 'transparent',
    stroke: string = this.def.stroke,
    strokeW: number = this.def.strokeW
  ): SVGRectElement {
    return this.rect(
      new Vec(c.x - w / 2, c.y - h / 2),
      w,
      h,
      fill,
      stroke,
      strokeW
    )
  }

  rectAB(
    a: Vec,
    b: Vec,
    fill: string = 'transparent',
    stroke: string = this.def.stroke,
    strokeW: number = this.def.strokeW
  ): SVGRectElement {
    return this.rect(
      a,
      b.x - a.x,
      b.y - a.y,
      fill,
      stroke,
      strokeW
    )
  }

  path(
    d: string = 'M 0,0 ',
    fill: string = this.def.fill,
    stroke: string = this.def.stroke,
    strokeW: number = this.def.strokeW
  ): SVGPathElement {
    const path = this.createSvgElement('path')
    this.setAttrs(path, { d })
    this.applyStrokeFill(path, fill, stroke, strokeW)
    this.stage.append(path)
    return path
  }

  text(
    text: string,
    at: Vec,
    fill: string = this.def.stroke,
    options: SVGTextOptions = {}
  ): SVGTextElement {
    const textEl = this.createSvgElement('text')
    this.setAttrs(textEl, {
      x: at.x,
      y: at.y,
      fill,
      'text-anchor': options.anchor ?? 'start',
      'font-size': options.fontSize ?? 12,
      'font-family': options.fontFamily,
      'font-weight': options.fontWeight,
      'dominant-baseline': options.baseline
    })

    textEl.textContent = text
    this.stage.append(textEl)
    return textEl
  }
}

/**
 * Path - Helper class for building SVG path d-strings
 * Supports polygons, quadratic bezier curves, and cubic splines
 */
export class Path {
  pts: Vec[]
  close: boolean

  constructor(pts: Vec[] = [], close: boolean = false) {
    this.pts = pts
    this.close = close
  }

  /**
   * Build a simple polygon path from points
   */
  buildPolygon(close: boolean = this.close): string {
    let str = 'M '
    for (let i = 0; i < this.pts.length; i++) {
      const pt = this.pts[i]!
      switch (i) {
        case 0:
          str += `${pt.x} ${pt.y}`
          break
        default:
          str += ` L ${pt.x} ${pt.y}`
          break
      }
    }
    if (close) {
      str += ' Z'
    }
    return str
  }

  private getControlPointQuad(a: Vec, b: Vec, t: number = 0.5, d: number = 0.5): Vec {
    return quadBezControlPoint(a, b, t, d)
  }

  /**
   * Build quadratic bezier path
   */
  buildQuadBez(t: number = 0.5, d: number = 0.5, close: boolean = false): string {
    const pts = this.pts
    let str = 'M '
    for (let i = 0; i < pts.length; i++) {
      const pt = pts[i]!
      let cp: Vec
      switch (i) {
        case 0:
          str += `${pt.x} ${pt.y}`
          break
        case pts.length - 1:
          cp = this.getControlPointQuad(pts[i - 1]!, pt, t, d)
          str += ` S ${cp.x} ${cp.y} ${pt.x} ${pt.y}`
          if (close) {
            const tt = t * -1
            const ccp = this.getControlPointQuad(pt, pts[0]!, tt, d)
            str += ` S ${ccp.x} ${ccp.y} ${pts[0]!.x} ${pts[0]!.y}`
          }
          break
        default:
          cp = this.getControlPointQuad(pts[i - 1]!, pt, t, d)
          str += ` S ${cp.x} ${cp.y} ${pt.x} ${pt.y}`
          break
      }
    }
    if (close) {
      str += ' Z'
    }
    return str
  }

  private getControlPointsSpline(p0: Vec, p1: Vec, p2: Vec, t: number): [Vec, Vec] {
    return splineControlPoints(p0, p1, p2, t)
  }

  /**
   * Build smooth cubic spline path
   * Uses the Scaled Innovation algorithm; delegates control-point math to splineControlPoints().
   */
  buildSpline(t: number = 0.4, close: boolean = this.close): string {
    const pts = this.pts
    let str = 'M '

    // Store control points on points for later reference
    const controlPoints: Map<number, [Vec, Vec]> = new Map()

    for (let i = 0; i < pts.length; i++) {
      let p0: Vec, p1: Vec, p2: Vec
      switch (i) {
        case 0:
          p0 = pts[pts.length - 1]!
          p1 = pts[i]!
          p2 = pts[i + 1]!
          controlPoints.set(i, this.getControlPointsSpline(p0, p1, p2, t))
          str += `${p1.x} ${p1.y}`
          break
        case 1:
          p0 = pts[i - 1]!
          p1 = pts[i]!
          p2 = pts[i + 1]!
          controlPoints.set(i, this.getControlPointsSpline(p0, p1, p2, t))
          if (close) {
            const cp0 = controlPoints.get(i - 1)!
            const cp1 = controlPoints.get(i)!
            str += `C ${cp0[1].x} ${cp0[1].y} ${cp1[0].x} ${cp1[0].y} ${p1.x} ${p1.y} `
          } else {
            const cp1 = controlPoints.get(i)!
            str += `Q ${cp1[0].x} ${cp1[0].y} ${p1.x} ${p1.y} `
          }
          break
        case pts.length - 1:
          p0 = pts[i - 1]!
          p1 = pts[i]!
          p2 = pts[0]!
          controlPoints.set(i, this.getControlPointsSpline(p0, p1, p2, t))
          if (close) {
            const cp0 = controlPoints.get(i - 1)!
            const cp1 = controlPoints.get(i)!
            const cp2 = controlPoints.get(0)!
            str += `C ${cp0[1].x} ${cp0[1].y} ${cp1[0].x} ${cp1[0].y} ${p1.x} ${p1.y} `
            str += `C ${cp1[1].x} ${cp1[1].y} ${cp2[0].x} ${cp2[0].y} ${p2.x} ${p2.y} Z`
          } else {
            const cp0 = controlPoints.get(i - 1)!
            str += `Q ${cp0[1].x} ${cp0[1].y} ${p1.x} ${p1.y} `
          }
          break
        default:
          p0 = pts[i - 1]!
          p1 = pts[i]!
          p2 = pts[i + 1]!
          const cPts = this.getControlPointsSpline(p0, p1, p2, t)
          controlPoints.set(i, cPts)
          const cp0 = controlPoints.get(i - 1)!
          str += `C ${cp0[1].x} ${cp0[1].y} ${cPts[0].x} ${cPts[0].y} ${p1.x} ${p1.y} `
          break
      }
    }
    return str
  }
}

/**
 * PathBuilder — command-driven SVG path assembler.
 *
 * Use this when you need to compose a path from mixed or conditional SVG commands
 * (M/L/Q/C/S/A/Z) rather than applying a single algorithm to a point array.
 *
 * Each method appends one SVG command and returns `this` for chaining.
 * Call `.build()` at the end to get the assembled `d` string.
 *
 * Example — a wedge mixing straight edges and an arc:
 *   const d = new PathBuilder()
 *     .moveToVec(center)
 *     .lineToVec(arcStart)
 *     .arcTo(r, r, 0, 0, 1, arcEnd.x, arcEnd.y)
 *     .close()
 *     .build()
 *   svg.path(d, fill, stroke)
 *
 * Contrast with the `Path` class, which is algorithm-driven (point array → named curve type).
 */
export class PathBuilder {
  private cmds: string[] = []

  /** M — move to (x, y) without drawing */
  moveTo(x: number, y: number): this { this.cmds.push(`M ${x} ${y}`); return this }
  moveToVec(pt: Vec): this { return this.moveTo(pt.x, pt.y) }

  /** L — straight line to (x, y) */
  lineTo(x: number, y: number): this { this.cmds.push(`L ${x} ${y}`); return this }
  lineToVec(pt: Vec): this { return this.lineTo(pt.x, pt.y) }

  /** Q — quadratic bezier to (x, y) with one control point (cpx, cpy) */
  quadTo(cpx: number, cpy: number, x: number, y: number): this {
    this.cmds.push(`Q ${cpx} ${cpy} ${x} ${y}`)
    return this
  }
  quadToVec(cp: Vec, pt: Vec): this { return this.quadTo(cp.x, cp.y, pt.x, pt.y) }

  /** C — cubic bezier to (x, y) with two control points */
  cubicTo(cp1x: number, cp1y: number, cp2x: number, cp2y: number, x: number, y: number): this {
    this.cmds.push(`C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${x} ${y}`)
    return this
  }
  cubicToVec(cp1: Vec, cp2: Vec, pt: Vec): this {
    return this.cubicTo(cp1.x, cp1.y, cp2.x, cp2.y, pt.x, pt.y)
  }

  /**
   * S — smooth cubic bezier to (x, y); the first control point is the reflection
   * of the previous C/S command's second handle. Provide only the second handle (cpx, cpy).
   */
  smoothTo(cpx: number, cpy: number, x: number, y: number): this {
    this.cmds.push(`S ${cpx} ${cpy} ${x} ${y}`)
    return this
  }
  smoothToVec(cp: Vec, pt: Vec): this { return this.smoothTo(cp.x, cp.y, pt.x, pt.y) }

  /**
   * A — elliptical arc to (x, y).
   * @param rx       x-radius
   * @param ry       y-radius
   * @param rotation x-axis rotation in degrees
   * @param largeArc 0 = minor arc, 1 = major arc
   * @param sweep    0 = CCW, 1 = CW
   */
  arcTo(rx: number, ry: number, rotation: number, largeArc: 0 | 1, sweep: 0 | 1, x: number, y: number): this {
    this.cmds.push(`A ${rx} ${ry} ${rotation} ${largeArc} ${sweep} ${x} ${y}`)
    return this
  }

  /** Z — close path back to the last M point */
  close(): this { this.cmds.push('Z'); return this }

  /** Assemble all queued commands into a single SVG path `d` string */
  build(): string { return this.cmds.join(' ') }
}
