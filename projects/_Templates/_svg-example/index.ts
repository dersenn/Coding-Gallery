import type {
  ProjectContext,
  CleanupFunction,
  ProjectControlDefinition,
  ProjectActionDefinition,
  Vec
} from '~/types/project'
import type { ThemeTokens } from '~/utils/theme'
import type { GridCellConfig } from '~/utils/grid'
import { SVG, Path, PathBuilder, Grid, GridCell, shortcuts, resolveContainer } from '~/types/project'
import { syncControlState } from '~/composables/useControls'

/**
 * SVG Engine Showcase — Generative Grid
 *
 * A live reference for the full SVG engine surface area.
 * Each cell in a noise-subdivided 3×3 grid draws one of 20 SVG variants.
 * Toggle "Show Labels" to identify which engine method each cell uses.
 *
 * ── Architecture ─────────────────────────────────────────────────────────────
 *
 * This sketch demonstrates the Grid cell factory pattern (utils/grid.ts):
 *
 *   ShowcaseGrid extends Grid
 *     └── createCell() returns ShowcaseCell — so grid.cells is always
 *         ShowcaseCell[] at runtime (typed as GridCell[] but safe to cast).
 *
 *   ShowcaseCell extends GridCell
 *     └── draw() renders one of 20 SVG variants selected by noise.cell().
 *
 * ── Color and variant stability ───────────────────────────────────────────────
 *
 * Both variant and dominant color are resolved via utils.noise.cell(), NOT
 * via rnd(). This matters because noise.cell() is keyed by absolute canvas
 * coordinates — so every cell at a given position always resolves to the same
 * variant and color for a given seed, regardless of draw order or grid depth.
 * Subdivided cells inherit the correct coordinates from GridCellConfig, making
 * the noise field tile seamlessly across all subdivision levels.
 *
 * rnd() is only used for shape geometry (random sizes, point jitter) because
 * that variation doesn't need to be position-stable — it just needs to be
 * reproducible per seed.
 *
 * ── Constructor-timing constraint ─────────────────────────────────────────────
 *
 * Grid calls initializeCells() from its constructor, which fires createCell()
 * before any ShowcaseGrid constructor body runs. This means ShowcaseGrid's
 * extra fields (pal, noiseScale, svgW/H) are still at their default values
 * when ShowcaseCell instances are created. To work around this, ShowcaseCell
 * defers reading those fields until the first draw() call via a lazy getter.
 * By then, ShowcaseGrid.init() has already been called.
 *
 * ── Variants ──────────────────────────────────────────────────────────────────
 *
 *  0  makeLine              10  Path.buildPolygon (Z)
 *  1  makeCircle (stroke)   11  Path.buildQuadBez
 *  2  makeCircle (fill)     12  Path.buildSpline
 *  3  makeCircles           13  Path.buildSpline (Z, filled)
 *  4  makeEllipse H         14  PathBuilder.arcTo
 *  5  makeEllipse V         15  PathBuilder.cubicTo
 *  6  makeRect (stroke)     16  PathBuilder.smoothTo
 *  7  makeRect (fill)       17  PathBuilder M/L/A/Z
 *  8  makeRectAB            18  Grid flat (4×4 palette)
 *  9  Path.buildPolygon     19  Grid recursive (ShowcaseGrid, depth-capped)
 */

export const container = 'square'

// ─── Variant registry ──────────────────────────────────────────────────────────

const N_VARIANTS = 20

// Used by the Show Labels toggle — maps variant index to a short method name
// displayed at the cell centre via makeText.
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

// ─── ShowcaseGrid ──────────────────────────────────────────────────────────────

/**
 * Subclasses Grid to inject ShowcaseCell into the cell factory.
 *
 * Extra drawing context (pal, ann, noiseScale, svgW, svgH) cannot be passed
 * via GridConfig — Grid's constructor calls initializeCells() immediately,
 * before any subclass constructor body runs. Instead these fields are set via
 * the fluent init() method, which must be called before the first draw().
 *
 * Usage:
 *   const grid = new ShowcaseGrid({ cols: 3, rows: 3, ... })
 *     .init({ svgW, svgH, pal, ann, noiseScale })
 *   // grid.cells contains ShowcaseCell instances
 */
class ShowcaseGrid extends Grid {
  svgW: number = 0      // canvas pixel dimensions — used to normalise noise coords
  svgH: number = 0
  pal: string[] = []    // theme palette — one entry per cell colour slot
  ann: string = ''      // theme annotation — fallback and label colour
  noiseScale: number = 8 // controls how tightly variants cluster across the canvas

  // Fluent post-construction initialiser. Returns `this` so it chains with `new`.
  init(extras: {
    svgW: number; svgH: number
    pal: string[]; ann: string; noiseScale: number
  }): this {
    Object.assign(this, extras)
    return this
  }

  // The factory override — called once per cell during Grid's own constructor.
  // At this point ShowcaseGrid's fields are still at defaults; cells read them
  // lazily in draw() instead.
  protected override createCell(config: GridCellConfig): GridCell {
    return new ShowcaseCell(config)
  }
}

// ─── ShowcaseCell ──────────────────────────────────────────────────────────────

/**
 * Extends GridCell with a draw() method that renders one of 20 SVG variants.
 *
 * variant (0–19) and clr (dominant palette colour) are resolved once — on the
 * first draw() call — by reading from this.grid cast to ShowcaseGrid. Both use
 * utils.noise.cell() keyed by absolute canvas position so the result is:
 *   - stable: same cell position → same variant/colour for a given seed
 *   - position-continuous: adjacent cells vary smoothly across the noise field
 *   - scale-independent: subdivided cells at the same position match their parent
 *   - non-advancing: noise.cell() never increments the rnd() stream
 *
 * Shape geometry (sizes, point offsets) uses rnd() — it only needs to be
 * reproducible per seed, not position-stable.
 */
class ShowcaseCell extends GridCell {
  private _variant: number | undefined
  private _clr: string | undefined

  /**
   * Lazy accessor — resolves variant and colour on first access.
   * Deferring to draw() time guarantees ShowcaseGrid.init() has already run.
   */
  private get resolved(): { variant: number; clr: string } {
    if (this._variant === undefined) {
      const g = this.grid as ShowcaseGrid

      // Channel 0: variant selection.
      // Coordinates are normalised to [0, noiseScale] so the Noise Scale slider
      // controls how many times the 20-variant pattern tiles across the canvas.
      this._variant = Math.min(N_VARIANTS - 1, Math.floor(
        g.utils.noise.cell(this.x / g.svgW * g.noiseScale, this.y / g.svgH * g.noiseScale, 0) * N_VARIANTS
      ))

      // Channel 1: colour selection.
      // Normalised to [0, 1] — no noiseScale multiplier — so colour regions are
      // larger and less fragmented than the variant regions.
      const ci = Math.min(g.pal.length - 1, Math.floor(
        g.utils.noise.cell(this.x / g.svgW, this.y / g.svgH, 1) * g.pal.length
      ))
      this._clr = g.pal[ci] ?? g.ann
    }
    return { variant: this._variant, clr: this._clr! }
  }

  /**
   * Renders the cell's assigned variant into `svg`.
   *
   * @param depth  Recursion level — variant 19 increments this and caps at 1.
   *               Prevents unbounded recursion when the recursive grid variant
   *               happens to appear inside a recursive grid cell.
   */
  draw(
    svg: SVG,
    theme: ThemeTokens,
    sw: number,
    v: (x: number, y: number) => Vec,
    rnd: () => number,
    depth: number = 0,
    showLabel: boolean = false
  ): void {
    const { variant, clr } = this.resolved
    const sg = this.grid as ShowcaseGrid
    const pal = sg.pal
    const ann = sg.ann

    // Inset geometry — all variants draw within a padded inner rect so shapes
    // breathe and don't crowd cell edges. Padding scales with cell width so it
    // stays proportional at any subdivision level.
    const cw = this.width; const ch = this.height
    const pad = cw * 0.12
    const ix = this.x + pad; const iy = this.y + pad
    const iw = cw - pad * 2; const ih = ch - pad * 2
    // center() is a Cell method — returns the pixel centre of the bounding box.
    const { x: cx, y: cy } = this.center()
    // r is the base radius for circular primitives — 40% of the smaller inset side.
    const r = Math.min(iw, ih) * 0.4

    switch (variant) {

      // ── Primitive shapes ───────────────────────────────────────────────────

      case 0: {
        // makeLine — random diagonal; endpoints scattered in opposing quadrants
        // so the line always crosses the cell centre area.
        svg.line(
          v(ix + rnd() * iw * 0.25, iy + rnd() * ih),
          v(ix + iw * (0.75 + rnd() * 0.25), iy + rnd() * ih),
          clr, sw
        )
        break
      }
      case 1: {
        // makeCircle — stroke only, no fill. Radius varies per seed.
        svg.circle(v(cx, cy), r * (0.45 + rnd() * 0.55), 'none', clr, sw)
        break
      }
      case 2: {
        // makeCircle — fill only, no stroke. Same radius range as case 1 for
        // visual consistency when labels are off.
        svg.circle(v(cx, cy), r * (0.45 + rnd() * 0.55), clr, 'none', 0)
        break
      }
      case 3: {
        // makeCircles — batch: 6–12 equal dots arranged on a ring.
        // Demonstrates the batch overload (Vec[] input).
        const n = 6 + Math.floor(rnd() * 6)
        const pts = Array.from({ length: n }, (_, i) => {
          const angle = (i / n) * Math.PI * 2
          return v(cx + Math.cos(angle) * r * 0.75, cy + Math.sin(angle) * r * 0.75)
        })
        svg.circles(pts, r * 0.15, clr, 'none', 0)
        break
      }
      case 4: {
        // makeEllipse — horizontal (rx > ry). Both axes vary independently
        // so proportions differ each seed, but the shape stays wider than tall.
        svg.ellipse(v(cx, cy), r * (0.6 + rnd() * 0.4), r * (0.2 + rnd() * 0.2), 'none', clr, sw)
        break
      }
      case 5: {
        // makeEllipse — vertical (ry > rx). Mirror of case 4.
        svg.ellipse(v(cx, cy), r * (0.2 + rnd() * 0.2), r * (0.6 + rnd() * 0.4), 'none', clr, sw)
        break
      }
      case 6: {
        // makeRect — stroke only. Size varies; always centred in the inset area.
        const s = iw * (0.4 + rnd() * 0.4)
        svg.rect(v(cx - s / 2, cy - s / 2), s, s, 'none', clr, sw)
        break
      }
      case 7: {
        // makeRect — fill only. Same size logic as case 6.
        const s = iw * (0.4 + rnd() * 0.4)
        svg.rect(v(cx - s / 2, cy - s / 2), s, s, clr, 'none', 0)
        break
      }
      case 8: {
        // makeRectAB — rect defined by two corner points rather than pos+size.
        // Points are constrained to opposing quadrants so b is always below-right
        // of a, giving a positive-area rect.
        const a = v(ix + rnd() * iw * 0.25, iy + rnd() * ih * 0.25)
        const b = v(ix + iw * (0.65 + rnd() * 0.25), iy + ih * (0.65 + rnd() * 0.25))
        svg.rectAB(a, b, 'none', clr, sw)
        break
      }

      // ── Path class — algorithm-driven (point array → named curve type) ─────

      case 9: {
        // Path.buildPolygon open — 5 points evenly spaced horizontally with
        // random vertical jitter: shows the raw M/L polyline output.
        const pts = Array.from({ length: 5 }, (_, i) =>
          v(ix + (i / 4) * iw, iy + ih * (0.2 + rnd() * 0.6))
        )
        svg.path(new Path(pts, false).buildPolygon(), 'none', clr, sw)
        break
      }
      case 10: {
        // Path.buildPolygon closed — random irregular polygon. 4–8 vertices
        // on a jittered radial layout; close=true connects last point back to first.
        const n = 4 + Math.floor(rnd() * 4)
        const pts = Array.from({ length: n }, (_, i) => {
          const angle = (i / n) * Math.PI * 2 - Math.PI / 2  // start at 12 o'clock
          return v(
            cx + Math.cos(angle) * r * (0.5 + rnd() * 0.5),
            cy + Math.sin(angle) * r * (0.5 + rnd() * 0.5)
          )
        })
        svg.path(new Path(pts, true).buildPolygon(), 'none', clr, sw)
        break
      }
      case 11: {
        // Path.buildQuadBez — same 5-point horizontal scaffold as case 9 but
        // rendered as quadratic bezier segments (S commands). Tension 0.5, depth 0.4.
        const pts = Array.from({ length: 5 }, (_, i) =>
          v(ix + (i / 4) * iw, iy + ih * (0.2 + rnd() * 0.6))
        )
        svg.path(new Path(pts, false).buildQuadBez(0.5, 0.4), 'none', clr, sw)
        break
      }
      case 12: {
        // Path.buildSpline open — same scaffold as cases 9 and 11, now rendered
        // as a Catmull-Rom–style cubic spline (C commands). Tension 0.4.
        // Compare with 11: spline produces smoother curves at the same tension.
        const pts = Array.from({ length: 5 }, (_, i) =>
          v(ix + (i / 4) * iw, iy + ih * (0.2 + rnd() * 0.6))
        )
        svg.path(new Path(pts, false).buildSpline(0.4), 'none', clr, sw)
        break
      }
      case 13: {
        // Path.buildSpline closed + filled — organic blob. 5–9 vertices on a
        // jittered circle; close=true wraps the spline back through the first point.
        // Filled rather than stroked to emphasise the enclosed shape.
        const n = 5 + Math.floor(rnd() * 4)
        const pts = Array.from({ length: n }, (_, i) => {
          const angle = (i / n) * Math.PI * 2
          return v(cx + Math.cos(angle) * r * (0.4 + rnd() * 0.6), cy + Math.sin(angle) * r * (0.4 + rnd() * 0.6))
        })
        svg.path(new Path(pts, true).buildSpline(0.4), clr, 'none', 0)
        break
      }

      // ── PathBuilder — command-driven (M/L/Q/C/S/A/Z mixed) ───────────────

      case 14: {
        // PathBuilder.arcTo — filled pie/wedge. Start angle and arc span are
        // random; the SVG large-arc flag is set automatically based on whether
        // the span exceeds π (180°).
        const startAngle = rnd() * Math.PI * 2
        const span = Math.PI * (0.5 + rnd() * 1.2)
        const endAngle = startAngle + span
        const d = new PathBuilder()
          .moveTo(cx, cy)                                           // centre
          .lineTo(cx + Math.cos(startAngle) * r, cy + Math.sin(startAngle) * r)  // spoke
          .arcTo(r, r, 0, span > Math.PI ? 1 : 0, 1,               // arc sweep CW
            cx + Math.cos(endAngle) * r, cy + Math.sin(endAngle) * r)
          .close().build()                                          // back to centre
        svg.path(d, clr, 'none', 0)
        break
      }
      case 15: {
        // PathBuilder.cubicToVec — S-curve from left edge midpoint to right edge
        // midpoint. Control points pull the curve to the top-left and bottom-right
        // corners, producing the classic cubic S shape.
        const cp1 = v(ix + iw * 0.25, iy)          // upper control point
        const cp2 = v(ix + iw * 0.75, iy + ih)     // lower control point
        svg.path(
          new PathBuilder().moveTo(ix, iy + ih / 2).cubicToVec(cp1, cp2, v(ix + iw, iy + ih / 2)).build(),
          'none', clr, sw
        )
        break
      }
      case 16: {
        // PathBuilder.smoothToVec — extends case 15 with a second curve segment
        // using the S (smooth cubic) command. The S command mirrors the previous
        // C command's outgoing handle, so no first control point is needed.
        // Result: a two-segment wave that's C¹ continuous at the midpoint.
        const cp1 = v(ix + iw * 0.15, iy)
        const mid = v(cx, cy)
        const cp2 = v(cx + iw * 0.1, iy + ih)      // handle for the smooth continuation
        svg.path(
          new PathBuilder()
            .moveTo(ix, iy + ih / 2)
            .cubicToVec(cp1, v(cx - iw * 0.1, iy + ih * 0.2), mid)   // first C
            .smoothToVec(cp2, v(ix + iw, iy + ih / 2))                // S continues
            .build(),
          'none', clr, sw
        )
        break
      }
      case 17: {
        // PathBuilder mixed M/L/A/Z — stadium / capsule shape.
        // Two straight sides (L) connected by two semicircular arcs (A).
        // The arc radius equals halfH so the semicircles are exact half-circles.
        const halfH = ih * 0.28
        const lx = cx - iw * 0.22; const rx = cx + iw * 0.22
        const ty = cy - halfH; const by = cy + halfH
        svg.path(
          new PathBuilder()
            .moveTo(lx, ty).lineTo(rx, ty)                        // top edge
            .arcTo(halfH, halfH, 0, 0, 1, rx, by)                 // right semicircle CW
            .lineTo(lx, by)                                        // bottom edge
            .arcTo(halfH, halfH, 0, 0, 1, lx, ty)                 // left semicircle CW
            .close().build(),
          clr, 'none', 0
        )
        break
      }

      // ── Grid utility variants ─────────────────────────────────────────────

      case 18: {
        // Flat 4×4 sub-grid with one palette colour per cell.
        // Colours use noise.cell() on channel 2 (distinct from channels 0 and 1
        // used for variant and dominant colour) so sub-cell colours are
        // independent but still position-stable and seed-dependent.
        // No rnd() calls here — changing the Noise Scale slider won't shift
        // the rnd() stream for cells drawn after this one.
        const g = new Grid({ cols: 4, rows: 4, width: iw, height: ih, x: ix, y: iy, utils: sg.utils })
        g.forEach((subCell) => {
          const subNoise = sg.utils.noise.cell(subCell.x / sg.svgW, subCell.y / sg.svgH, 2)
          const subClr = pal[Math.min(pal.length - 1, Math.floor(subNoise * pal.length))] ?? clr
          svg.rect(v(subCell.x, subCell.y), subCell.width, subCell.height, subClr, 'none', 0)
        })
        break
      }
      case 19: {
        // Recursive ShowcaseGrid — the same factory pattern applied one level
        // deeper: a 3×3 ShowcaseGrid is constructed inside this cell, its cells
        // are ShowcaseCell instances, and each is drawn at reduced stroke width.
        //
        // depth cap at 1 prevents infinite recursion: if variant 19 appears
        // inside a recursive cell, it falls back to a filled rect instead.
        // The noise field is shared (same svgW/svgH normalisation) so the colour
        // and variant gradients continue seamlessly into the sub-grid.
        if (depth >= 1) {
          // Fallback at max depth — filled rect preserves the dominant colour.
          svg.rect(v(ix, iy), iw, ih, clr, 'none', 0)
          break
        }
        const g = new ShowcaseGrid({ cols: 3, rows: 3, width: iw, height: ih, x: ix, y: iy, utils: sg.utils })
          .init({ svgW: sg.svgW, svgH: sg.svgH, pal, ann, noiseScale: sg.noiseScale })
        // g.cells are ShowcaseCell instances — no manual wrapping needed.
        g.cells.forEach(subCell =>
          (subCell as ShowcaseCell).draw(svg, theme, sw * 0.65, v, rnd, depth + 1, false)
        )
        break
      }
    }

    // Labels are rendered last so they sit on top of the shape.
    // Font size scales with cell width so text stays legible at any subdivision level.
    if (showLabel) {
      svg.text(
        VARIANT_LABELS[variant] ?? '',
        v(cx, cy),
        ann,
        { fontSize: Math.max(5, Math.floor(cw * 0.09)), anchor: 'middle', baseline: 'middle' }
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

  // 'square' centres the canvas; '2vmin' padding keeps it off the viewport edges.
  // The resolved padding value (in px) is available as result.padding if needed
  // for grid gap calculations downstream.
  const { el, width, height } = resolveContainer(container, { mode: 'square', padding: '2vmin' })
  const svg = new SVG({ parent: el, id: 'svg-example', width, height })

  function draw() {
    utils.seed.reset()  // reset PRNG to position 0 so every full redraw is identical
    svg.stage.replaceChildren()
    svg.rect(v(0, 0), svg.w, svg.h, theme.background, 'none', 0)

    const subs = Math.floor(controlState.subdivisions)
    const ns = controlState.noiseScale
    const sw = controlState.strokeWidth

    // Construct the root ShowcaseGrid. createCell() is wired to return
    // ShowcaseCell instances, so grid.cells[0] instanceof ShowcaseCell === true.
    // .init() must follow immediately — it populates the fields that ShowcaseCell
    // lazily reads in draw() (pal, ann, noiseScale, svgW, svgH).
    const grid = new ShowcaseGrid({
      cols: 3, rows: 3,
      width: svg.w, height: svg.h,
      x: 0, y: 0,
      utils
    }).init({ svgW: svg.w, svgH: svg.h, pal: theme.palette, ann: theme.annotation, noiseScale: ns })

    if (subs === 0) {
      // Flat case — grid.cells are ShowcaseCell instances from the factory.
      // Cast is safe: createCell() guarantees the runtime type.
      grid.cells.forEach(cell =>
        (cell as ShowcaseCell).draw(svg, theme, sw, v, rnd, 0, controlState.showLabels)
      )
    } else {
      // Subdivision case — recursive nodes are built through createCell(), so the
      // result already contains ShowcaseCell instances.
      const leaves = grid.subdivide({ maxLevel: subs, chance: 55, subdivisionCols: 3, subdivisionRows: 3 })
      for (const cell of leaves) {
        ;(cell as ShowcaseCell).draw(svg, theme, sw, v, rnd, 0, controlState.showLabels)
      }
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
