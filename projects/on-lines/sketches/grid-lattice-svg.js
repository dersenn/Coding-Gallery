import { shortcuts } from '~/utils/shortcuts'

/**
 * Grid & Lattice — SVG / plotter port of grid-almighty/grid-lattice-1.
 *
 * Same warped lattice (fbm displacement, mean-centred, optional edge pinning),
 * but output is strokes only — no fills — and lines are emitted as continuous
 * polylines (one <path> per strand) so the plotter doesn't lift per cell.
 *
 * Canvas version varied stroke width by noise; a pen can't, so here noise
 * gates segments instead: segments with noise < `noiseGate` are dropped,
 * breaking the strand.
 *
 * Units: viewBox is in mm (print target svg @ 25.4 dpi).
 */

// --- lattice ---------------------------------------------------------------

const buildLattice = ({ v, cols, rows, x, y, w, h }) =>
  Array.from({ length: rows + 1 }, (_, r) =>
    Array.from({ length: cols + 1 }, (_, c) => v(x + (c / cols) * w, y + (r / rows) * h))
  )

const pinWeight = (i, n, falloff) => {
  const d = Math.min(i, n - i)
  if (falloff <= 0) return d === 0 ? 0 : 1
  const t = Math.max(0, Math.min(1, d / falloff))
  return 1 - (1 - t) ** 3 // cubic ease-out
}

const warpLattice = (lattice, { fbm2, warpAmp, pinEdges, pinFalloff }) => {
  const rows = lattice.length - 1
  const cols = lattice[0].length - 1

  // offsets + mean, so the warp doesn't drift the whole sheet
  let sumDx = 0, sumDy = 0
  const offsets = lattice.map(row => row.map(p => {
    const dx = fbm2(p.x, p.y + 100)
    const dy = fbm2(p.x - 100, p.y)
    sumDx += dx
    sumDy += dy
    return { dx, dy }
  }))
  const n = (rows + 1) * (cols + 1)
  const meanDx = sumDx / n
  const meanDy = sumDy / n

  for (let r = 0; r <= rows; r++) {
    for (let c = 0; c <= cols; c++) {
      const p = lattice[r][c]
      const { dx, dy } = offsets[r][c]
      const wx = pinEdges ? pinWeight(c, cols, pinFalloff) : 1
      const wy = pinEdges ? pinWeight(r, rows, pinFalloff) : 1
      p.x += (dx - meanDx) * warpAmp * wx
      p.y += (dy - meanDy) * warpAmp * wy
    }
  }
}

// --- strands ---------------------------------------------------------------
// A strand is an array of points; each segment i (pts[i] → pts[i+1]) has a
// noise value sampled at its midpoint.

const midStrands = (lattice, vMid) => {
  // ct→cb per cell; cb of row r === ct of row r+1, so columns join up
  const rows = lattice.length - 1
  const cols = lattice[0].length - 1
  const out = []
  for (let c = 0; c < cols; c++) {
    const pts = []
    for (let r = 0; r <= rows; r++) pts.push(vMid(lattice[r][c], lattice[r][c + 1]))
    out.push(pts)
  }
  return out
}

const rowStrands = (lattice) => lattice.map(row => row.slice())

const colStrands = (lattice) =>
  lattice[0].map((_, c) => lattice.map(row => row[c]))

// --- output ----------------------------------------------------------------

/** Split a strand into runs where segment noise ≥ gate. */
const gateStrand = (pts, noiseAt, gate) => {
  if (gate <= 0) return [pts]
  const runs = []
  let run = null
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i], b = pts[i + 1]
    const on = noiseAt((a.x + b.x) / 2, (a.y + b.y) / 2) >= gate
    if (on) {
      if (!run) { run = [a]; runs.push(run) }
      run.push(b)
    } else {
      run = null
    }
  }
  return runs
}

const toD = (pts) =>
  pts.map((p, i) => `${i ? 'L' : 'M'}${p.x.toFixed(3)} ${p.y.toFixed(3)}`).join(' ')

// --- draw ------------------------------------------------------------------

export function draw(context) {
  const { svg, utils, theme, controls: c } = context
  if (!svg?.print) return

  const { v, vMid, simplex2, noiseField } = shortcuts(utils)
  const { mm, trimWidth, trimHeight } = svg.print

  const border = { top: mm(12), right: mm(12), bottom: mm(18), left: mm(12) }

  const fbm2 = noiseField(simplex2, {
    frequency: c.warpScale,
    frequencyX: c.warpScaleX,
    frequencyY: c.warpScaleY,
    octaves: Math.max(1, Math.floor(c.octaves)),
    lacunarity: c.lacunarity,
    persistence: c.persistence,
  })

  const lattice = buildLattice({
    v,
    cols: c.cols,
    rows: c.rows,
    x: border.left,
    y: border.top,
    w: trimWidth - border.left - border.right,
    h: trimHeight - border.top - border.bottom,
  })
  warpLattice(lattice, {
    fbm2,
    warpAmp: mm(c.warpAmpMm),
    pinEdges: c.pinEdges,
    pinFalloff: c.pinFalloff,
  })

  const strands = {
    mid: () => midStrands(lattice, vMid),
    rows: () => rowStrands(lattice),
    cols: () => colStrands(lattice),
    grid: () => [...rowStrands(lattice), ...colStrands(lattice)],
  }[c.lineMode]?.() ?? []

  // Paper colour via CSS, not a <rect> — a background rect would end up in the
  // export and plotter tools (e.g. vpype) would draw its outline.
  svg.stage.style.background = theme.white

  const stroke = theme.black
  const penW = mm(c.penMm)

  // one group per pen / layer — keeps it easy to split later (vpype, Inkscape)
  const layer = document.createElementNS('http://www.w3.org/2000/svg', 'g')
  layer.setAttribute('id', 'pen-1')
  layer.setAttribute('fill', 'none')
  layer.setAttribute('stroke', stroke)
  layer.setAttribute('stroke-width', penW)
  layer.setAttribute('stroke-linecap', 'round')
  layer.setAttribute('stroke-linejoin', 'round')

  for (const pts of strands) {
    for (const run of gateStrand(pts, fbm2, c.noiseGate)) {
      if (run.length < 2) continue
      const p = svg.path(toD(run), 'none', stroke, penW)
      layer.append(p) // move from stage into the layer group
    }
  }
  svg.stage.append(layer)

  if (c.showTrim) svg.drawTrimBox()
}
