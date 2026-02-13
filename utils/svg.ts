import { Vec } from './generative'

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

  save(seed?: string, sketchName?: string): void {
    const str = new XMLSerializer().serializeToString(this.stage)
    const blob = new Blob([str], this.mime)

    const link = document.createElement('a')
    let hashStr = ''
    let sketchStr = ''

    if (seed) {
      hashStr += `_${seed}`
    }
    if (sketchName) {
      sketchStr += sketchName
    }

    // Format timestamp as readable date string
    const now = new Date()
    const timestamp = now
      .toLocaleString('sv-SE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      })
      .replace(/[:.]/g, '-')
      .replace(/\s/g, '_') // YYYY-MM-DD_HH-MM-SS in local timezone

    link.download = `${sketchStr}${hashStr}_${timestamp}.svg`
    link.href = URL.createObjectURL(blob)
    link.click()
    URL.revokeObjectURL(link.href)
  }

  makeLine(
    a: Vec,
    b: Vec,
    stroke: string = this.def.stroke,
    strokeW: number = this.def.strokeW
  ): SVGLineElement {
    const line = document.createElementNS(this.ns, 'line') as SVGLineElement
    line.setAttribute('x1', a.x.toString())
    line.setAttribute('y1', a.y.toString())
    line.setAttribute('x2', b.x.toString())
    line.setAttribute('y2', b.y.toString())
    line.setAttribute('stroke', stroke)
    line.setAttribute('stroke-width', strokeW.toString())
    this.stage.append(line)
    return line
  }

  makeCircle(
    c: Vec,
    r: number = 5,
    fill: string = this.def.fill,
    stroke: string = this.def.stroke,
    strokeW: number = this.def.strokeW
  ): SVGCircleElement {
    const circle = document.createElementNS(this.ns, 'circle') as SVGCircleElement
    circle.setAttribute('cx', c.x.toString())
    circle.setAttribute('cy', c.y.toString())
    circle.setAttribute('r', r.toString())
    circle.setAttribute('fill', fill)
    circle.setAttribute('stroke', stroke)
    circle.setAttribute('stroke-width', strokeW.toString())
    this.stage.append(circle)
    return circle
  }

  makeCircles(
    iA: Vec[],
    r: number = 5,
    fill: string = '#f00',
    stroke: string = 'transparent',
    strokeW: number = this.def.strokeW
  ): SVGCircleElement[] {
    const oA: SVGCircleElement[] = []
    for (let c = 0; c < iA.length; c++) {
      const circle = document.createElementNS(this.ns, 'circle') as SVGCircleElement
      circle.setAttribute('cx', iA[c]!.x.toString())
      circle.setAttribute('cy', iA[c]!.y.toString())
      circle.setAttribute('r', r.toString())
      circle.setAttribute('fill', fill)
      circle.setAttribute('stroke', stroke)
      circle.setAttribute('stroke-width', strokeW.toString())
      this.stage.append(circle)
      oA.push(circle)
    }
    return oA
  }

  makeEllipse(
    c: Vec,
    rx: number,
    ry: number,
    fill: string = this.def.fill,
    stroke: string = this.def.stroke,
    strokeW: number = this.def.strokeW
  ): SVGEllipseElement {
    const ellipse = document.createElementNS(this.ns, 'ellipse') as SVGEllipseElement
    ellipse.setAttribute('cx', c.x.toString())
    ellipse.setAttribute('cy', c.y.toString())
    ellipse.setAttribute('rx', rx.toString())
    ellipse.setAttribute('ry', ry.toString())
    ellipse.setAttribute('fill', fill)
    ellipse.setAttribute('stroke', stroke)
    ellipse.setAttribute('stroke-width', strokeW.toString())
    this.stage.append(ellipse)
    return ellipse
  }

  makeRect(
    pt: Vec,
    w: number,
    h: number,
    fill: string = 'transparent',
    stroke: string = this.def.stroke,
    strokeW: number = this.def.strokeW
  ): SVGRectElement {
    const rect = document.createElementNS(this.ns, 'rect') as SVGRectElement
    rect.setAttribute('x', pt.x.toString())
    rect.setAttribute('y', pt.y.toString())
    rect.setAttribute('width', w.toString())
    rect.setAttribute('height', h.toString())
    rect.setAttribute('fill', fill)
    rect.setAttribute('stroke', stroke)
    rect.setAttribute('stroke-width', strokeW.toString())
    this.stage.append(rect)
    return rect
  }

  makeRectAB(
    a: Vec,
    b: Vec,
    fill: string = 'transparent',
    stroke: string = this.def.stroke,
    strokeW: number = this.def.strokeW
  ): SVGRectElement {
    const rect = document.createElementNS(this.ns, 'rect') as SVGRectElement
    rect.setAttribute('x', a.x.toString())
    rect.setAttribute('y', a.y.toString())
    rect.setAttribute('width', (b.x - a.x).toString())
    rect.setAttribute('height', (b.y - a.y).toString())
    rect.setAttribute('fill', fill)
    rect.setAttribute('stroke', stroke)
    rect.setAttribute('stroke-width', strokeW.toString())
    this.stage.append(rect)
    return rect
  }

  makePath(
    d: string = 'M 0,0 ',
    fill: string = this.def.fill,
    stroke: string = this.def.stroke,
    strokeW: number = this.def.strokeW
  ): SVGPathElement {
    const path = document.createElementNS(this.ns, 'path') as SVGPathElement
    path.setAttribute('d', d)
    path.setAttribute('fill', fill)
    path.setAttribute('stroke', stroke)
    path.setAttribute('stroke-width', strokeW.toString())
    this.stage.append(path)
    return path
  }
}

/**
 * PathPoint - Helper class for path construction
 */
export class pPt {
  b: Vec // base point
  type: string
  t: number
  d: number
  cp?: Vec

  constructor(pt: Vec, type: string = 'LINE', t: number = 0.5, d: number = 0.5) {
    this.b = pt
    this.type = type
    this.t = t
    this.d = d
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

  /**
   * Get control point for quadratic bezier curve
   */
  private getControlPointQuad(a: Vec, b: Vec, t: number = 0.5, d: number = 0.5): Vec {
    const m = b.sub(a)
    const p = a.lerp(b, d)
    const perp = new Vec(-m.norm().y, m.norm().x)
    const amp = t * (this.dist(a, b) / 2)

    const cp = new Vec(p.x + amp * perp.x, p.y + amp * perp.y)
    return cp
  }

  private dist(a: Vec, b: Vec): number {
    const xx = a.x - b.x
    const yy = a.y - b.y
    const zz = a.z - b.z
    return Math.sqrt(xx ** 2 + yy ** 2 + zz ** 2)
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

  /**
   * Get control points for cubic spline
   */
  private getControlPointsSpline(p0: Vec, p1: Vec, p2: Vec, t: number): [Vec, Vec] {
    // Adapted from: http://scaledinnovation.com/analytics/splines/aboutSplines.html
    // Builds Control Points for p1
    const d01 = Math.sqrt(Math.pow(p1.x - p0.x, 2) + Math.pow(p1.y - p0.y, 2))
    const d12 = Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2))
    const fa = (t * d01) / (d01 + d12)
    const fb = (t * d12) / (d01 + d12)
    const cp1x = p1.x - fa * (p2.x - p0.x)
    const cp1y = p1.y - fa * (p2.y - p0.y)
    const cp2x = p1.x + fb * (p2.x - p0.x)
    const cp2y = p1.y + fb * (p2.y - p0.y)
    return [new Vec(cp1x, cp1y), new Vec(cp2x, cp2y)]
  }

  /**
   * Build smooth cubic spline path
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
