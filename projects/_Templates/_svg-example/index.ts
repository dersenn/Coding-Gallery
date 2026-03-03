import type {
  ProjectContext,
  CleanupFunction,
  ProjectControlDefinition,
  ProjectActionDefinition,
  Vec
} from '~/types/project'
import type { GenerativeUtils } from '~/utils/generative'
import type { ThemeTokens } from '~/utils/theme'
import { SVG, Path, PathBuilder, Grid, shortcuts, resolveCanvas } from '~/types/project'
import { syncControlState } from '~/composables/useControls'

/**
 * SVG Engine Showcase — Generative Grid
 *
 * Layout: 3×3 root grid, recursively subdivided via the Grid utility.
 * Each leaf cell becomes a ShowcaseCell — a class whose constructor resolves
 * its variant and dominant color via utils.noise.cell() (seeded, position-stable,
 * no rnd() advancement), and whose draw() method renders one of 20 SVG primitives.
 *
 * Variants 18 and 19 are sub-grid variants: a flat palette grid and a recursive
 * ShowcaseCell grid respectively, the latter capped at depth 1.
 *
 * Toggle labels to identify which engine method each cell uses.
 */

export const canvas = 'square'

// ─── Variant registry ──────────────────────────────────────────────────────────

const N_VARIANTS = 20

const VARIANT_LABELS: string[] = [
  'makeLine',        // 0
  'makeCircle ○',    // 1
  'makeCircle ●',    // 2
  'makeCircles',     // 3
  'makeEllipse H',   // 4
  'makeEllipse V',   // 5
  'makeRect □',      // 6
  'makeRect ■',      // 7
  'makeRectAB',      // 8
  'Path polygon',    // 9
  'Path polygon Z',  // 10
  'Path quadBez',    // 11
  'Path spline',     // 12
  'Path spline Z',   // 13
  'PB arc',          // 14
  'PB cubic',        // 15
  'PB smooth',       // 16
  'PB M/L/A/Z',      // 17
  'Grid flat',       // 18
  'Grid recursive',  // 19
]

// ─── ShowcaseCell ──────────────────────────────────────────────────────────────

class ShowcaseCell {
  x: number; y: number; w: number; h: number
  cx: number; cy: number
  ix: number; iy: number; iw: number; ih: number
  r: number
  // Resolved at construction time via noise.cell — never calls rnd()
  variant: number
  clr: string
  // Carried for recursive drawing
  svgW: number; svgH: number
  utils: GenerativeUtils
  pal: string[]
  ann: string
  noiseScale: number

  constructor(
    x: number, y: number, w: number, h: number,
    svgW: number, svgH: number,
    utils: GenerativeUtils,
    pal: string[], ann: string,
    noiseScale: number
  ) {
    this.x = x; this.y = y; this.w = w; this.h = h
    this.svgW = svgW; this.svgH = svgH
    this.utils = utils; this.pal = pal; this.ann = ann; this.noiseScale = noiseScale

    const pad = w * 0.12
    this.ix = x + pad; this.iy = y + pad
    this.iw = w - pad * 2; this.ih = h - pad * 2
    this.cx = x + w / 2; this.cy = y + h / 2
    this.r = Math.min(this.iw, this.ih) * 0.4

    // Both fields use noise.cell — seeded but never advance the rnd() stream
    this.variant = Math.min(N_VARIANTS - 1, Math.floor(
      utils.noise.cell(x / svgW * noiseScale, y / svgH * noiseScale, 0) * N_VARIANTS
    ))
    const ci = Math.min(pal.length - 1, Math.floor(
      utils.noise.cell(x / svgW, y / svgH, 1) * pal.length
    ))
    this.clr = pal[ci] ?? ann
  }

  draw(
    svg: SVG,
    theme: ThemeTokens,
    sw: number,
    v: (x: number, y: number) => Vec,
    rnd: () => number,
    depth: number = 0,
    showLabel: boolean = false
  ): void {
    const { cx, cy, ix, iy, iw, ih, r, clr } = this
    const ann = this.ann
    const pal = this.pal

    switch (this.variant) {
      case 0: {
        svg.makeLine(
          v(ix + rnd() * iw * 0.25, iy + rnd() * ih),
          v(ix + iw * (0.75 + rnd() * 0.25), iy + rnd() * ih),
          clr, sw
        )
        break
      }
      case 1: {
        svg.makeCircle(v(cx, cy), r * (0.45 + rnd() * 0.55), 'none', clr, sw)
        break
      }
      case 2: {
        svg.makeCircle(v(cx, cy), r * (0.45 + rnd() * 0.55), clr, 'none', 0)
        break
      }
      case 3: {
        const n = 6 + Math.floor(rnd() * 6)
        const pts = Array.from({ length: n }, (_, i) => {
          const angle = (i / n) * Math.PI * 2
          return v(cx + Math.cos(angle) * r * 0.75, cy + Math.sin(angle) * r * 0.75)
        })
        svg.makeCircles(pts, r * 0.15, clr, 'none', 0)
        break
      }
      case 4: {
        svg.makeEllipse(v(cx, cy), r * (0.6 + rnd() * 0.4), r * (0.2 + rnd() * 0.2), 'none', clr, sw)
        break
      }
      case 5: {
        svg.makeEllipse(v(cx, cy), r * (0.2 + rnd() * 0.2), r * (0.6 + rnd() * 0.4), 'none', clr, sw)
        break
      }
      case 6: {
        const s = iw * (0.4 + rnd() * 0.4)
        svg.makeRect(v(cx - s / 2, cy - s / 2), s, s, 'none', clr, sw)
        break
      }
      case 7: {
        const s = iw * (0.4 + rnd() * 0.4)
        svg.makeRect(v(cx - s / 2, cy - s / 2), s, s, clr, 'none', 0)
        break
      }
      case 8: {
        const a = v(ix + rnd() * iw * 0.25, iy + rnd() * ih * 0.25)
        const b = v(ix + iw * (0.65 + rnd() * 0.25), iy + ih * (0.65 + rnd() * 0.25))
        svg.makeRectAB(a, b, 'none', clr, sw)
        break
      }
      case 9: {
        const pts = Array.from({ length: 5 }, (_, i) =>
          v(ix + (i / 4) * iw, iy + ih * (0.2 + rnd() * 0.6))
        )
        svg.makePath(new Path(pts, false).buildPolygon(), 'none', clr, sw)
        break
      }
      case 10: {
        const n = 4 + Math.floor(rnd() * 4)
        const pts = Array.from({ length: n }, (_, i) => {
          const angle = (i / n) * Math.PI * 2 - Math.PI / 2
          return v(
            cx + Math.cos(angle) * r * (0.5 + rnd() * 0.5),
            cy + Math.sin(angle) * r * (0.5 + rnd() * 0.5)
          )
        })
        svg.makePath(new Path(pts, true).buildPolygon(), 'none', clr, sw)
        break
      }
      case 11: {
        const pts = Array.from({ length: 5 }, (_, i) =>
          v(ix + (i / 4) * iw, iy + ih * (0.2 + rnd() * 0.6))
        )
        svg.makePath(new Path(pts, false).buildQuadBez(0.5, 0.4), 'none', clr, sw)
        break
      }
      case 12: {
        const pts = Array.from({ length: 5 }, (_, i) =>
          v(ix + (i / 4) * iw, iy + ih * (0.2 + rnd() * 0.6))
        )
        svg.makePath(new Path(pts, false).buildSpline(0.4), 'none', clr, sw)
        break
      }
      case 13: {
        const n = 5 + Math.floor(rnd() * 4)
        const pts = Array.from({ length: n }, (_, i) => {
          const angle = (i / n) * Math.PI * 2
          return v(cx + Math.cos(angle) * r * (0.4 + rnd() * 0.6), cy + Math.sin(angle) * r * (0.4 + rnd() * 0.6))
        })
        svg.makePath(new Path(pts, true).buildSpline(0.4), clr, 'none', 0)
        break
      }
      case 14: {
        const startAngle = rnd() * Math.PI * 2
        const span = Math.PI * (0.5 + rnd() * 1.2)
        const endAngle = startAngle + span
        const d = new PathBuilder()
          .moveTo(cx, cy)
          .lineTo(cx + Math.cos(startAngle) * r, cy + Math.sin(startAngle) * r)
          .arcTo(r, r, 0, span > Math.PI ? 1 : 0, 1, cx + Math.cos(endAngle) * r, cy + Math.sin(endAngle) * r)
          .close().build()
        svg.makePath(d, clr, 'none', 0)
        break
      }
      case 15: {
        const cp1 = v(ix + iw * 0.25, iy)
        const cp2 = v(ix + iw * 0.75, iy + ih)
        svg.makePath(
          new PathBuilder().moveTo(ix, iy + ih / 2).cubicToVec(cp1, cp2, v(ix + iw, iy + ih / 2)).build(),
          'none', clr, sw
        )
        break
      }
      case 16: {
        const cp1 = v(ix + iw * 0.15, iy)
        const mid = v(cx, cy)
        const cp2 = v(cx + iw * 0.1, iy + ih)
        svg.makePath(
          new PathBuilder()
            .moveTo(ix, iy + ih / 2)
            .cubicToVec(cp1, v(cx - iw * 0.1, iy + ih * 0.2), mid)
            .smoothToVec(cp2, v(ix + iw, iy + ih / 2))
            .build(),
          'none', clr, sw
        )
        break
      }
      case 17: {
        const halfH = ih * 0.28
        const lx = cx - iw * 0.22; const rx = cx + iw * 0.22
        const ty = cy - halfH; const by = cy + halfH
        svg.makePath(
          new PathBuilder()
            .moveTo(lx, ty).lineTo(rx, ty)
            .arcTo(halfH, halfH, 0, 0, 1, rx, by)
            .lineTo(lx, by)
            .arcTo(halfH, halfH, 0, 0, 1, lx, ty)
            .close().build(),
          clr, 'none', 0
        )
        break
      }
      case 18: {
        // Flat 4×4 palette grid — colors via noise.cell, no rnd() calls
        const g = new Grid({ cols: 4, rows: 4, width: iw, height: ih, x: ix, y: iy, utils: this.utils })
        g.forEach((subCell) => {
          const subNoise = this.utils.noise.cell(subCell.x / this.svgW, subCell.y / this.svgH, 2)
          const subClr = pal[Math.min(pal.length - 1, Math.floor(subNoise * pal.length))] ?? clr
          svg.makeRect(v(subCell.x, subCell.y), subCell.width, subCell.height, subClr, 'none', 0)
        })
        break
      }
      case 19: {
        // Recursive ShowcaseCell grid — same process, depth capped at 1
        if (depth >= 1) {
          // Fallback at max depth: filled rect in dominant color
          svg.makeRect(v(ix, iy), iw, ih, clr, 'none', 0)
          break
        }
        const g = new Grid({ cols: 3, rows: 3, width: iw, height: ih, x: ix, y: iy, utils: this.utils })
        for (const subCell of g.cells) {
          const sc = new ShowcaseCell(
            subCell.x, subCell.y, subCell.width, subCell.height,
            this.svgW, this.svgH,
            this.utils, pal, ann, this.noiseScale
          )
          sc.draw(svg, theme, sw * 0.65, v, rnd, depth + 1, false)
        }
        break
      }
    }

    if (showLabel) {
      svg.makeText(
        VARIANT_LABELS[this.variant] ?? '',
        v(cx, cy),
        ann,
        { fontSize: Math.max(5, Math.floor(this.w * 0.09)), anchor: 'middle', baseline: 'middle' }
      )
    }
  }
}

// ─── Controls ─────────────────────────────────────────────────────────────────

export const controls: ProjectControlDefinition[] = [
  {
    type: 'group',
    id: 'grid',
    label: 'Grid',
    collapsible: true,
    defaultOpen: true,
    controls: [
      {
        type: 'slider',
        label: 'Subdivision Depth',
        key: 'subdivisions',
        default: 1,
        min: 0,
        max: 2,
        step: 1
      },
      {
        type: 'slider',
        label: 'Noise Scale',
        key: 'noiseScale',
        default: 8,
        min: 2,
        max: 20,
        step: 1
      }
    ]
  },
  {
    type: 'group',
    id: 'style',
    label: 'Style',
    collapsible: true,
    defaultOpen: true,
    controls: [
      {
        type: 'slider',
        label: 'Stroke Width',
        key: 'strokeWidth',
        default: 3,
        min: 0.5,
        max: 5,
        step: 0.5
      },
      {
        type: 'toggle',
        label: 'Show Labels',
        key: 'showLabels',
        default: false
      }
    ]
  }
]

export const actions: ProjectActionDefinition[] = [
  { key: 'download-svg', label: 'Download SVG' }
]

// ─── Sketch init ──────────────────────────────────────────────────────────────

export async function init(
  container: HTMLElement,
  context: ProjectContext
): Promise<CleanupFunction> {
  const { controls, utils, theme, onControlChange, registerAction } = context
  const { v, rnd } = shortcuts(utils)

  const controlState = {
    subdivisions: controls.subdivisions as number,
    noiseScale: controls.noiseScale as number,
    strokeWidth: controls.strokeWidth as number,
    showLabels: controls.showLabels as boolean
  }

  const { el, width, height } = resolveCanvas(container, 'square')
  const svg = new SVG({ parent: el, id: 'svg-example', width, height })

  function draw() {
    utils.seed.reset()
    svg.stage.replaceChildren()

    svg.makeRect(v(0, 0), svg.w, svg.h, theme.background, 'none', 0)

    const subs = Math.floor(controlState.subdivisions)

    const mainGrid = new Grid({
      cols: 3, rows: 3,
      width: svg.w, height: svg.h,
      x: 0, y: 0,
      utils
    })

    const cells = subs > 0
      ? mainGrid.subdivide({ maxLevel: subs, chance: 55, subdivisionCols: 3, subdivisionRows: 3 })
      : mainGrid.cells

    for (const cell of cells) {
      const sc = new ShowcaseCell(
        cell.x, cell.y, cell.width, cell.height,
        svg.w, svg.h,
        utils, theme.palette, theme.annotation,
        controlState.noiseScale
      )
      sc.draw(svg, theme, controlState.strokeWidth, v, rnd, 0, controlState.showLabels)
    }
  }

  draw()

  onControlChange((newControls) => {
    syncControlState(controlState, newControls)
    draw()
  })

  registerAction('download-svg', () => {
    svg.save(utils.seed.current, 'svg-example')
  })

  return () => {
    svg.stage.remove()
  }
}
