const MM_PER_INCH = 25.4
const PT_PER_INCH = 72

export type PrintUnit = 'mm' | 'pt' | 'in'

export interface PrintContractConfig {
  width:  number
  height: number
  unit?:  PrintUnit
  dpi?:   number
  bleed?: number
  target?: 'canvas' | 'svg'   // default 'canvas'
}

export interface TrimBoxOptions {
  color?: string
  lineWidth?: number
  dash?:  number[]
  width?: number
}

export interface PrintContract {
  // backing store (full bleed)
  canvasWidth:  number
  canvasHeight: number
  // trim area (your drawing space)
  trimWidth:  number
  trimHeight: number
  trimX: number       // = bleedPx
  trimY: number       // = bleedPx
  // measurements
  bleedPx: number
  bleedMM: number
  widthMM:  number
  heightMM: number
  svgViewBox: string
  dpi: number
  // unit converters → logical print pixels
  mm:   (v: number) => number
  pt:   (v: number) => number
  inch: (v: number) => number
  // helpers
  drawTrimBox: (ctx: CanvasRenderingContext2D, options?: TrimBoxOptions) => void
}

function toMM(v: number, unit: PrintUnit): number {
  if (unit === 'mm') return v
  if (unit === 'in') return v * MM_PER_INCH
  return v / PT_PER_INCH * MM_PER_INCH   // 'pt'
}

/**
 * Standalone unit converters bound to a DPI.
 * For SVG in mm-viewBox space, pass dpi=25.4 so mm(v) === v.
 */
export function printUnits(dpi: number) {
  return {
    mm:   (v: number) => v / MM_PER_INCH * dpi,
    pt:   (v: number) => v / PT_PER_INCH * dpi,
    inch: (v: number) => v * dpi,
  }
}

export function createPrintContract(config: PrintContractConfig): PrintContract {
  const { width, height, unit = 'mm', dpi = 300, bleed = 0, target = 'canvas' } = config
  const unitDpi = target === 'svg' ? MM_PER_INCH : dpi   // 25.4 makes mm(v)===v
  const wMM  = toMM(width,  unit)
  const hMM  = toMM(height, unit)
  const bMM  = toMM(bleed,  unit)
  const bPx  = Math.round(bMM / MM_PER_INCH * unitDpi)
  const tw   = Math.round(wMM / MM_PER_INCH * unitDpi)
  const th   = Math.round(hMM / MM_PER_INCH * unitDpi)
  const cw   = tw + bPx * 2
  const ch   = th + bPx * 2
  const units = printUnits(unitDpi)


  return {
    ...units,
    canvasWidth: cw, canvasHeight: ch,
    trimWidth: tw,   trimHeight: th,
    trimX: bPx,      trimY: bPx,
    bleedPx: bPx,    bleedMM: bMM,
    widthMM: wMM,    heightMM: hMM,
    svgViewBox: `-${bPx} -${bPx} ${cw} ${ch}`,
    dpi,
    drawTrimBox(ctx, { color = '#0f0', dash = [8, 4], lineWidth } = {}) {
      const lw = lineWidth ?? units.pt(0.6)
      ctx.save()
      ctx.setLineDash(dash)
      ctx.strokeStyle = color
      ctx.lineWidth = lw
      ctx.strokeRect(-bPx + lw/2, -bPx + lw/2, cw - lw, ch - lw)
      ctx.setLineDash([])
      ctx.strokeRect(lw/2, lw/2, tw - lw, th - lw)
      ctx.restore()
    },
  }
}