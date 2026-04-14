const MM_PER_INCH = 25.4
const PT_PER_INCH = 72

export type PrintUnit = 'mm' | 'pt' | 'in'

export interface PrintContractConfig {
  width:  number
  height: number
  unit?:  PrintUnit   // default 'mm'
  dpi?:   number      // default 300
  bleed?: number      // same unit as width/height, default 0
}

export interface TrimBoxOptions {
  color?: string
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
  const { width, height, unit = 'mm', dpi = 300, bleed = 0 } = config
  const wMM  = toMM(width,  unit)
  const hMM  = toMM(height, unit)
  const bMM  = toMM(bleed,  unit)
  const bPx  = Math.round(bMM / MM_PER_INCH * dpi)
  const tw   = Math.round(wMM / MM_PER_INCH * dpi)
  const th   = Math.round(hMM / MM_PER_INCH * dpi)
  const cw   = tw + bPx * 2
  const ch   = th + bPx * 2
  const units = printUnits(dpi)

  return {
    ...units,
    canvasWidth: cw, canvasHeight: ch,
    trimWidth: tw,   trimHeight: th,
    trimX: bPx,      trimY: bPx,
    bleedPx: bPx,    bleedMM: bMM,
    widthMM: wMM,    heightMM: hMM,
    dpi,
    drawTrimBox(ctx, { color = '#0077ff', dash = [8, 4], width: lw = 1 } = {}) {
      ctx.save()
      ctx.setLineDash(dash)
      ctx.strokeStyle = color
      ctx.lineWidth = lw
      // called after translate-to-trim, so draw at (0,0) in trim space
      ctx.strokeRect(-bPx, -bPx, cw, ch)  // outer (bleed edge)
      ctx.setLineDash([])
      ctx.strokeRect(0, 0, tw, th)         // trim edge (dashed above, solid here? or same)
      ctx.restore()
    },
  }
}