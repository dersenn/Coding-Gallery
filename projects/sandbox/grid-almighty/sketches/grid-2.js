import { Grid } from '~/types/project'
import { shortcuts } from '~/utils/shortcuts'

// ---------------------------------------------------------------------------
// Pure helpers — no context, just math
// ---------------------------------------------------------------------------

function subdivisionBranchEstimate(sub) {
  if (sub.subdivideMode !== 'fixedGrid') {
    const pMin = Math.max(1, sub.splitMinCols * sub.splitMinRows)
    const pMax = Math.max(1, sub.splitMaxCols * sub.splitMaxRows)
    return Math.max(1, Math.round(Math.sqrt(pMin * pMax)))
  }
  return Math.max(1, sub.subdivisionCols * sub.subdivisionRows)
}

function safeMaxLevel(rootCellCount, sub) {
  const MAX_TERMINALS = 85_000
  const branch = subdivisionBranchEstimate(sub)
  if (branch <= 1) return sub.maxLevel
  const cap = Math.floor(Math.log(MAX_TERMINALS / Math.max(1, rootCellCount)) / Math.log(branch))
  return Math.max(0, Math.min(sub.maxLevel, Number.isFinite(cap) ? cap : sub.maxLevel))
}

function buildDivLengthOpts(sub) {
  const opts = { mode: sub.divLengthMode }
  if (sub.minSegmentRatio > 0) opts.minSegmentRatio = sub.minSegmentRatio
  if (sub.divLengthMode === 'curve') opts.curve = { kind: sub.divLengthCurveKind }
  return opts
}

// ---------------------------------------------------------------------------
// draw()
// ---------------------------------------------------------------------------

export function draw(context) {
  const { canvas, theme, utils, controls: c } = context
  const { v, coin, rndInt, divLength } = shortcuts(utils)

  if (!canvas) return

  // --- Read controls (project.config is the source of truth; ?? = fallback) ---

  const cols = c.cols ?? 1
  const rows = c.rows ?? 1
  const bg = c.sketchBackground || theme.background
  const fg = c.sketchForeground || theme.foreground
  const showGrid = c.showgrid ?? false

  const sub = {
    subdivideMode: c.subdivideMode ?? 'divLength',
    enabled: c.subdivisionEnabled ?? true,
    maxLevel: c.maxLevel ?? 2,
    chance: c.chance ?? 85,
    // fixedGrid
    subdivisionCols: c.subdivisionCols ?? 2,
    subdivisionRows: c.subdivisionRows ?? 2,
    // divLength
    divLengthMode: c.divLengthMode ?? 'fibonacci',
    divLengthCurveKind: c.divLengthCurveKind ?? 'pow',
    splitMinCols: c.splitMinCols ?? 2,
    splitMaxCols: c.splitMaxCols ?? 4,
    splitMinRows: c.splitMinRows ?? 2,
    splitMaxRows: c.splitMaxRows ?? 4,
    minSegmentRatio: c.minSegmentRatio ?? 0.04,
    divLengthSegMultiplier: c.divLengthSegMultiplier ?? 10,
  }

  // --- Closures (close over canvas, v, coin, rndInt, divLength, bg, fg, sub) ---

  /** First split on a 1×1 root should always fire, otherwise we often get one blank frame. */
  function bypassChance(level) {
    return cols === 1 && rows === 1 && level === 0
  }

  /** Draw a checker-colored rect — phase 0 = fg, phase 1 = bg. */
  function drawRect(x, y, w, h, phase) {
    canvas.rect(v(x, y), w, h, phase % 2 === 0 ? fg : bg, 'transparent', 0)
  }

  /**
   * Pick a random integer split count in [minV, maxV] using divLength as a
   * seeded sampling mechanism (more organic than plain randomInt).
   */
  function pickSplitCount(minV, maxV) {
    const span = Math.max(1, maxV - minV + 1)
    const mult = sub.subdivideMode === 'divLength' ? Math.max(1, sub.divLengthSegMultiplier) : 1
    const nSeg = Math.max(2, 1 + Math.round(span * mult))
    const opts = buildDivLengthOpts(sub)
    const pts = divLength(v(0, 0), v(1, 0), nSeg, opts)
    const pt = pts.length > 0 ? pts[rndInt(0, pts.length - 1)] : null
    const t = pt != null ? pt.x : 0.5
    return minV + Math.min(span - 1, Math.floor(t * span))
  }

  /** Cut fractions along [0, 1] for `stripCount` strips (used by tensor mode). */
  function tensorAxisFractions(stripCount) {
    const opts = { ...buildDivLengthOpts(sub), includeEndpoints: true }
    const pts = divLength(v(0, 0), v(1, 0), Math.max(1, stripCount), opts)
    const xs = pts.map(p => p.x).sort((a, b) => a - b)
    if (xs.length >= 2) { xs[0] = 0; xs[xs.length - 1] = 1 }
    return xs.length >= 2 ? xs : [0, 1]
  }

  /** Recursive tensor subdivision — irregular strip widths on both axes. */
  function collectTensorLeaves(node, level, maxLevel, out) {
    if (level >= maxLevel || (!bypassChance(level) && !coin(sub.chance))) {
      out.push(node)
      return
    }
    const nCol = pickSplitCount(sub.splitMinCols, sub.splitMaxCols)
    const nRow = pickSplitCount(sub.splitMinRows, sub.splitMaxRows)
    const xs = tensorAxisFractions(nCol)
    const ys = tensorAxisFractions(nRow)
    for (let j = 0; j < nRow; j++) {
      for (let i = 0; i < nCol; i++) {
        const x0 = node.x + node.width * xs[i], x1 = node.x + node.width * xs[i + 1]
        const y0 = node.y + node.height * ys[j], y1 = node.y + node.height * ys[j + 1]
        const w = x1 - x0, h = y1 - y0
        if (w <= 0 || h <= 0) continue
        collectTensorLeaves(
          { x: x0, y: y0, width: w, height: h, phase: (node.phase + i + j) % 2 },
          level + 1, maxLevel, out
        )
      }
    }
  }

  // --- Render ---

  canvas.background(bg)

  const grid = new Grid({ cols, rows, width: canvas.w, height: canvas.h, x: 0, y: 0, utils })

  if (!sub.enabled) {
    grid.forEach(cell => drawRect(cell.x, cell.y, cell.width, cell.height, cell.row + cell.col))
    return
  }

  const maxLevel = safeMaxLevel(cols * rows, sub)

  // Tensor mode — custom recursive split, bypasses Grid.subdivide
  if (sub.subdivideMode === 'divLengthTensor') {
    const leaves = []
    grid.forEach(cell =>
      collectTensorLeaves(
        { x: cell.x, y: cell.y, width: cell.width, height: cell.height, phase: (cell.row + cell.col) % 2 },
        0, maxLevel, leaves
      )
    )
    leaves.forEach(r => drawRect(r.x, r.y, r.width, r.height, r.phase))
    if (showGrid) canvas.cellEdges(leaves, fg, 1, { strokeAlign: 'center', includeOuter: false })
    return
  }

  // divLength and fixedGrid — use Grid.subdivide
  const terminals = grid.subdivide(
    sub.subdivideMode === 'divLength'
      ? {
        maxLevel,
        rule: (_cell, level) => {
          if (!bypassChance(level) && !coin(sub.chance)) return false
          return {
            cols: pickSplitCount(sub.splitMinCols, sub.splitMaxCols),
            rows: pickSplitCount(sub.splitMinRows, sub.splitMaxRows),
          }
        },
      }
      : {
        maxLevel,
        condition: (_cell, level) => bypassChance(level) || coin(sub.chance),
        subdivisionCols: sub.subdivisionCols,
        subdivisionRows: sub.subdivisionRows,
      }
  )

  terminals.forEach(cell => drawRect(cell.x, cell.y, cell.width, cell.height, cell.row + cell.col))
  if (showGrid) canvas.cellEdges(terminals, theme.annotation, 1, { strokeAlign: 'center', includeOuter: false })
}