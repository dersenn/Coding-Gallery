import { Grid } from '~/types/project'
import { shortcuts } from '~/utils/shortcuts'

/**
 * Patchwork Lines — SVG / plotter port of patchwork/patchwork-1|2.
 *
 * Same structure: 2–4 strips along the long side, each split into ~15 square-ish
 * cells across the short side; one snapped fbm sample per cell, normalised
 * across all cells, then bucketed. Where the canvas version mapped bucket →
 * palette colour + weave, here bucket → single-line hatch arrangement.
 *
 * Hatches are anchored to a global line lattice (not per cell), so the same
 * pattern in neighbouring cells lines up across the gap.
 *
 * Units: viewBox is in mm (print target svg @ 25.4 dpi).
 */

// --- patterns --------------------------------------------------------------
// Each pattern is a list of hatch angles (degrees). 0 = horizontal.

const PATTERNS = [
  { id: 'horizontal', angles: [0] },
  { id: 'vertical', angles: [90] },
  { id: 'diagonal', angles: [-45] },     // /
  { id: 'anti-diagonal', angles: [45] }, // \
  { id: 'cross', angles: [0, 90] },
  { id: 'diagonal-cross', angles: [45, -45] },
]

// --- geometry --------------------------------------------------------------

const squareDivisions = (width, height, divisions) => {
  if (width <= height) {
    const size = width / divisions
    return { cols: divisions, rows: Math.max(1, Math.floor(height / size)) }
  }
  const size = height / divisions
  return { cols: Math.max(1, Math.floor(width / size)), rows: divisions }
}

/** Clip the infinite line p + s·d to rect r (Liang–Barsky). Returns [a, b] or null. */
const clipLine = (px, py, dx, dy, r) => {
  let s0 = -Infinity
  let s1 = Infinity
  const axes = [[px, dx, r.x0, r.x1], [py, dy, r.y0, r.y1]]
  for (const [p, d, lo, hi] of axes) {
    if (Math.abs(d) < 1e-9) {
      if (p < lo || p > hi) return null
      continue
    }
    const a = (lo - p) / d
    const b = (hi - p) / d
    s0 = Math.max(s0, Math.min(a, b))
    s1 = Math.min(s1, Math.max(a, b))
  }
  if (s1 - s0 < 1e-6) return null
  return [
    { x: px + dx * s0, y: py + dy * s0 },
    { x: px + dx * s1, y: py + dy * s1 },
  ]
}

/** Parallel segments at `angle` filling rect r, on a global lattice of pitch `spacing`. */
const hatch = (r, angle, spacing) => {
  const a = (angle * Math.PI) / 180
  const dx = Math.cos(a), dy = Math.sin(a)
  const nx = -dy, ny = dx
  const ts = [[r.x0, r.y0], [r.x1, r.y0], [r.x0, r.y1], [r.x1, r.y1]].map(([x, y]) => x * nx + y * ny)
  const kMin = Math.ceil(Math.min(...ts) / spacing - 0.5)
  const kMax = Math.floor(Math.max(...ts) / spacing - 0.5)
  const segs = []
  for (let k = kMin; k <= kMax; k++) {
    const t = (k + 0.5) * spacing // half-pitch phase keeps lines off the lattice origin
    const seg = clipLine(nx * t, ny * t, dx, dy, r)
    if (seg) segs.push(seg)
  }
  return segs
}

const f = (n) => n.toFixed(3)

/** One subpath per segment. */
const segmentsToD = (segs) =>
  segs.map(([a, b]) => `M${f(a.x)} ${f(a.y)} L${f(b.x)} ${f(b.y)}`).join(' ')

/** Boustrophedon: one continuous polyline, every other segment reversed. */
const zigzagToD = (segs) =>
  segs
    .map((s, i) => (i % 2 ? [s[1], s[0]] : s))
    .flat()
    .map((p, i) => `${i ? 'L' : 'M'}${f(p.x)} ${f(p.y)}`)
    .join(' ')

// --- draw ------------------------------------------------------------------

export function draw(context) {
  const { svg, utils, theme, controls: c } = context
  if (!svg?.print) return

  const { rndInt, shuffle, simplex2 } = shortcuts(utils)
  const { mm, trimWidth, trimHeight } = svg.print

  const border = { top: mm(12), right: mm(12), bottom: mm(18), left: mm(12) }
  const w = trimWidth - border.left - border.right
  const h = trimHeight - border.top - border.bottom

  const patterns = c.shufflePatterns ? shuffle([...PATTERNS]) : PATTERNS

  // --- grid: strips along the long side, square-ish cells inside ---
  const portrait = h > w
  const splits = rndInt(2, 4)
  const grid = new Grid({
    cols: portrait ? 1 : splits,
    rows: portrait ? splits : 1,
    x: border.left,
    y: border.top,
    width: w,
    height: h,
    utils,
  })
  const cells = grid.subdivide({
    maxLevel: 1,
    rule: (cell, level) => (level === 0 ? squareDivisions(cell.width, cell.height, c.divisions) : false),
  })

  // --- noise: snapped fbm per cell, strip-phase offset along the split axis ---
  const sample = (cell) => {
    const cx = cell.x + cell.width / 2
    const cy = cell.y + cell.height / 2
    const delta = (cell.parent ?? cell).index * c.offset
    const ox = portrait ? 0 : delta
    const oy = portrait ? delta : 0
    const size = cell.width * c.sampleMultiplier
    const snap = (val) => (size > 0 ? Math.floor(val / size) * size : val)
    const sx = snap(cx + ox)
    const sy = snap(cy + oy)

    let total = 0, freq = c.scale, amp = 1
    for (let i = 0; i < c.octaves; i++) {
      total += simplex2(sx * freq * c.stretchX, sy * freq * c.stretchY) * amp
      freq *= c.lacunarity
      amp *= c.persistence
    }
    return (total * c.amplitude + 1) / 2
  }

  const raw = cells.map(sample)
  const min = Math.min(...raw)
  const max = Math.max(...raw)
  const buckets = raw.map((n) => {
    const t = max > min ? (n - min) / (max - min) : 0.5
    const shaped = Math.pow(t, 1 / c.amplitude)
    return Math.min(Math.floor(shaped * patterns.length), patterns.length - 1)
  })

  // --- output ---
  // Paper colour via CSS, not a <rect> (see grid-lattice-svg).
  svg.stage.style.background = theme.white

  const stroke = theme.black
  const penW = mm(c.penMm)
  const spacing = mm(c.spacingMm)
  const inset = mm(c.gapMm) / 2

  const NS = 'http://www.w3.org/2000/svg'
  const pen = document.createElementNS(NS, 'g')
  pen.setAttribute('id', 'pen-1')
  pen.setAttribute('fill', 'none')
  pen.setAttribute('stroke', stroke)
  pen.setAttribute('stroke-width', penW)
  pen.setAttribute('stroke-linecap', 'round')
  pen.setAttribute('stroke-linejoin', 'round')

  // sub-group per pattern — handy for selecting / re-penning in Inkscape
  const groups = Object.fromEntries(
    PATTERNS.map(({ id }) => {
      const g = document.createElementNS(NS, 'g')
      g.setAttribute('id', id)
      pen.append(g)
      return [id, g]
    })
  )

  const toD = c.connectLines ? zigzagToD : segmentsToD

  cells.forEach((cell, i) => {
    const r = {
      x0: cell.x + inset,
      y0: cell.y + inset,
      x1: cell.x + cell.width - inset,
      y1: cell.y + cell.height - inset,
    }
    if (r.x1 <= r.x0 || r.y1 <= r.y0) return

    const pattern = patterns[buckets[i]]
    for (const angle of pattern.angles) {
      const segs = hatch(r, angle, spacing)
      if (!segs.length) continue
      groups[pattern.id].append(svg.path(toD(segs), 'none', stroke, penW))
    }
  })

  svg.stage.append(pen)

  if (c.showTrim) svg.drawTrimBox()
}
