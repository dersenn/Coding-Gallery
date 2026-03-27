import { Grid, GridCell, resolveInnerFrame } from '~/types/project'

const SET = {
  artboardAspect: 'full',
  cols: 1,
  rows: 1,
  subdivision: {
    enabled: true,
    useRule: true,
    maxLevel: 2,
    chance: 85,
    subdivisionCols: 2,
    subdivisionRows: 2,
    divLengthMode: 'fibonacci',
    divLengthCurveKind: 'pow',
    splitMinCols: 2,
    splitMaxCols: 4,
    splitMinRows: 2,
    splitMaxRows: 4,
    minSegmentRatio: 0.04,
    divLengthSegMultiplier: 10,
  },
  showgrid: false,
  sketchBackground: '#000000',
  sketchForeground: '#00ff00',
}

/** Passed to `resolveInnerFrame` (matches `ContainerMode` ratio strings + full). */
const ARTBOARD_ASPECT_MODES = [
  'full',
  'square',
  '1:1',
  '2:3',
  '3:2',
  '4:3',
  '3:4',
  '16:9',
  '9:16',
  '1:1.618',
]

function pickArtboardAspect(raw, fallback) {
  return typeof raw === 'string' && ARTBOARD_ASPECT_MODES.includes(raw)
    ? raw
    : fallback
}

/** Effective canvas + checker colors: control overrides, else theme tokens (see defaultTheme in utils/theme.ts). */
function resolveSketchColors(theme, controls) {
  const c = controls ?? {}
  const bg =
    typeof c.sketchBackground === 'string' && c.sketchBackground.length > 0
      ? c.sketchBackground
      : theme.background
  const fg =
    typeof c.sketchForeground === 'string' && c.sketchForeground.length > 0
      ? c.sketchForeground
      : theme.foreground
  return { background: bg, foreground: fg }
}

/** Letterboxed drawing region inside the physical canvas (updates when controls change). */
function resolveDrawFrame(canvas, aspectMode) {
  const w = canvas.w
  const h = canvas.h
  if (aspectMode === 'full') {
    return { x: 0, y: 0, width: w, height: h }
  }
  return resolveInnerFrame(w, h, { mode: aspectMode, padding: 0 })
}

const DIV_LENGTH_MODES = [
  'uniform',
  'randomGaps',
  'randomSorted',
  'gapAscending',
  'gapDescending',
  'curve',
  'fibonacci',
]

const DIV_LENGTH_CURVE_KINDS = ['pow', 'log', 'exp']

function clampInt(n, lo, hi) {
  return Math.max(lo, Math.min(hi, Math.round(Number(n))))
}

function pickDivLengthMode(raw, fallback) {
  return typeof raw === 'string' && DIV_LENGTH_MODES.includes(raw)
    ? raw
    : fallback
}

function pickDivLengthCurveKind(raw, fallback) {
  return typeof raw === 'string' && DIV_LENGTH_CURVE_KINDS.includes(raw)
    ? raw
    : fallback
}

/** Soft ceiling on terminal cells (every split succeeds). Tuned so maxLevel stays meaningful without freezing typical tabs. */
const MAX_SUBDIV_TERMINALS = 85_000

/** Match split slider max in project.config.ts */
const SPLIT_DIM_MAX = 24

/**
 * Estimated children-per-split for depth budgeting: fixed grid uses actual product;
 * divLength uses √(minProduct·maxProduct) so typical draws sit between pessimistic max-only and unrealistic averages.
 */
function subdivisionBranchEstimate(sub) {
  if (!sub.useRule) {
    return Math.max(1, sub.subdivisionCols * sub.subdivisionRows)
  }
  const pMin = Math.max(1, sub.splitMinCols * sub.splitMinRows)
  const pMax = Math.max(1, sub.splitMaxCols * sub.splitMaxRows)
  return Math.max(1, Math.round(Math.sqrt(pMin * pMax)))
}

/** Cap maxLevel when every split always succeeds at branchEstimate^depth (actual runs are usually smaller due to chance). */
function safeSubdivideMaxLevel(settings) {
  const sub = settings.subdivision
  const rootN = Math.max(1, settings.cols * settings.rows)
  const requested = sub.maxLevel
  const branch = subdivisionBranchEstimate(sub)
  if (branch <= 1) return requested
  const cap = Math.floor(
    Math.log(MAX_SUBDIV_TERMINALS / rootN) / Math.log(branch)
  )
  if (!Number.isFinite(cap)) return Math.max(0, requested)
  return Math.max(0, Math.min(requested, cap))
}

/** Defaults in `SET`; overridden by sketch `controls` when present. */
function resolveSettings(_utils, controls) {
  const c = controls ?? {}
  const sub = SET.subdivision

  const subdivideMode =
    typeof c.subdivideMode === 'string' &&
    (c.subdivideMode === 'divLength' ||
      c.subdivideMode === 'divLengthTensor' ||
      c.subdivideMode === 'fixedGrid')
      ? c.subdivideMode
      : sub.useRule
        ? 'divLength'
        : 'fixedGrid'

  let splitMinCols =
    typeof c.splitMinCols === 'number'
      ? clampInt(c.splitMinCols, 1, SPLIT_DIM_MAX)
      : sub.splitMinCols
  let splitMaxCols =
    typeof c.splitMaxCols === 'number'
      ? clampInt(c.splitMaxCols, 1, SPLIT_DIM_MAX)
      : sub.splitMaxCols
  if (splitMaxCols < splitMinCols) {
    const t = splitMinCols
    splitMinCols = splitMaxCols
    splitMaxCols = t
  }

  let splitMinRows =
    typeof c.splitMinRows === 'number'
      ? clampInt(c.splitMinRows, 1, SPLIT_DIM_MAX)
      : sub.splitMinRows
  let splitMaxRows =
    typeof c.splitMaxRows === 'number'
      ? clampInt(c.splitMaxRows, 1, SPLIT_DIM_MAX)
      : sub.splitMaxRows
  if (splitMaxRows < splitMinRows) {
    const t = splitMinRows
    splitMinRows = splitMaxRows
    splitMaxRows = t
  }

  const minSegmentRatioRaw = c.minSegmentRatio
  const minSegmentRatio =
    typeof minSegmentRatioRaw === 'number' &&
    Number.isFinite(minSegmentRatioRaw)
      ? Math.max(0, Math.min(0.5, minSegmentRatioRaw))
      : sub.minSegmentRatio

  return {
    artboardAspect: pickArtboardAspect(c.artboardAspect, SET.artboardAspect),
    cols:
      typeof c.cols === 'number' ? clampInt(c.cols, 1, 24) : SET.cols,
    rows:
      typeof c.rows === 'number' ? clampInt(c.rows, 1, 24) : SET.rows,
    showgrid:
      typeof c.showgrid === 'boolean' ? c.showgrid : SET.showgrid,
    subdivision: {
      enabled:
        typeof c.subdivisionEnabled === 'boolean'
          ? c.subdivisionEnabled
          : sub.enabled,
      maxLevel:
        typeof c.maxLevel === 'number'
          ? clampInt(c.maxLevel, 0, 12)
          : sub.maxLevel,
      subdivideMode,
      useRule:
        subdivideMode === 'divLength' ||
        subdivideMode === 'divLengthTensor',
      chance:
        typeof c.chance === 'number'
          ? clampInt(c.chance, 0, 100)
          : sub.chance,
      subdivisionCols:
        typeof c.subdivisionCols === 'number'
          ? clampInt(c.subdivisionCols, 1, 12)
          : sub.subdivisionCols,
      subdivisionRows:
        typeof c.subdivisionRows === 'number'
          ? clampInt(c.subdivisionRows, 1, 12)
          : sub.subdivisionRows,
      divLengthMode: pickDivLengthMode(c.divLengthMode, sub.divLengthMode),
      divLengthCurveKind: pickDivLengthCurveKind(
        c.divLengthCurveKind,
        sub.divLengthCurveKind ?? 'pow'
      ),
      splitMinCols,
      splitMaxCols,
      splitMinRows,
      splitMaxRows,
      minSegmentRatio,
      divLengthSegMultiplier:
        typeof c.divLengthSegMultiplier === 'number'
          ? clampInt(c.divLengthSegMultiplier, 1, 32)
          : sub.divLengthSegMultiplier ?? 10,
    },
  }
}

/**
 * Map a random interior sample from utils.math.divLength along (0,0)→(1,0)
 * to an integer split count in [minV, maxV] (seed-driven via divLength + pick index).
 */
function buildDivLengthOpts(sub, minSegmentRatio) {
  const mode = sub.divLengthMode
  const opts = { mode }
  if (minSegmentRatio > 0) opts.minSegmentRatio = minSegmentRatio
  if (mode === 'curve') {
    opts.curve = { kind: sub.divLengthCurveKind ?? 'pow' }
  }
  return opts
}

/** Normalized cut positions along [0,1] for `stripCount` strips (tensor / irregular widths). */
function tensorAxisFractions(utils, stripCount, sub, minR) {
  const nSeg = Math.max(1, stripCount)
  const opts = { ...buildDivLengthOpts(sub, minR), includeEndpoints: true }
  const pts = utils.math.divLength(
    utils.vec.create(0, 0),
    utils.vec.create(1, 0),
    nSeg,
    opts
  )
  const xs = pts.map((p) => p.x)
  xs.sort((a, b) => a - b)
  if (xs.length >= 2) {
    xs[0] = 0
    xs[xs.length - 1] = 1
  }
  return xs.length >= 2 ? xs : [0, 1]
}

/** Uneven strips: `divLength` yields cut fractions; children are weighted by segment lengths (custom path, not `Grid.subdivide`). */
function collectTensorLeaves(utils, settings, node, level, maxLevel, out) {
  const sub = settings.subdivision
  if (level >= maxLevel) {
    out.push(node)
    return
  }
  if (
    !shouldBypassSubdivideChance(settings, level) &&
    !utils.seed.coinToss(sub.chance)
  ) {
    out.push(node)
    return
  }
  const minR = sub.minSegmentRatio ?? 0
  const nCol = pickSplitCountFromDivLength(
    utils,
    sub.splitMinCols,
    sub.splitMaxCols,
    { ...sub, minSegmentRatio: minR }
  )
  const nRow = pickSplitCountFromDivLength(
    utils,
    sub.splitMinRows,
    sub.splitMaxRows,
    { ...sub, minSegmentRatio: minR }
  )
  const xs = tensorAxisFractions(utils, nCol, sub, minR)
  const ys = tensorAxisFractions(utils, nRow, sub, minR)
  const { x, y, width, height } = node
  const phase = node.checkerPhase ?? 0
  for (let j = 0; j < nRow; j++) {
    for (let i = 0; i < nCol; i++) {
      const x0 = x + width * xs[i]
      const x1 = x + width * xs[i + 1]
      const y0 = y + height * ys[j]
      const y1 = y + height * ys[j + 1]
      const w = Math.max(0, x1 - x0)
      const h = Math.max(0, y1 - y0)
      if (w <= 0 || h <= 0) continue
      collectTensorLeaves(
        utils,
        settings,
        {
          x: x0,
          y: y0,
          width: w,
          height: h,
          checkerPhase: (phase + i + j) % 2,
        },
        level + 1,
        maxLevel,
        out
      )
    }
  }
}

function pickSplitCountFromDivLength(utils, minV, maxV, sub) {
  const span = Math.max(1, maxV - minV + 1)
  const mult =
    sub.subdivideMode === 'divLength'
      ? Math.max(1, sub.divLengthSegMultiplier ?? 10)
      : 1
  const nSeg = Math.max(2, 1 + Math.round(span * mult))
  const minSegmentRatio = sub.minSegmentRatio ?? 0
  const opts = buildDivLengthOpts(sub, minSegmentRatio)
  const pts = utils.math.divLength(
    utils.vec.create(0, 0),
    utils.vec.create(1, 0),
    nSeg,
    opts
  )
  const pick =
    pts.length > 0 ? pts[utils.seed.randomInt(0, pts.length - 1)] : null
  const t = pick != null ? pick.x : 0.5
  return minV + Math.min(span - 1, Math.floor(t * span))
}

/** One root cell (1×1 layout): first split should not depend on chance, or we often get a single full-frame cell. */
function shouldBypassSubdivideChance(settings, level) {
  return settings.cols === 1 && settings.rows === 1 && level === 0
}

class MinimalGrid extends Grid {
  createCell(config) {
    return new MinimalCell(config)
  }
}

class MinimalCell extends GridCell {
  draw(canvas, theme, settings) {
    const { background, foreground } = settings.colors
    const fill = (this.row + this.col) % 2 === 0 ? foreground : background
    canvas.rect(this.tl(), this.width, this.height, fill, 'transparent', 0)
  }
}

export function draw(context) {
  const { canvas, theme, utils, controls } = context
  if (!canvas) return

  const settings = resolveSettings(utils, controls)
  settings.colors = resolveSketchColors(theme, controls)

  canvas.background(settings.colors.background)

  const drawFrame = resolveDrawFrame(canvas, settings.artboardAspect)

  const grid = new MinimalGrid({
    cols: settings.cols,
    rows: settings.rows,
    width: drawFrame.width,
    height: drawFrame.height,
    x: drawFrame.x,
    y: drawFrame.y,
    utils,
  })

  if (settings.subdivision.enabled) {
    const sub = settings.subdivision
    const maxLevel = safeSubdivideMaxLevel(settings)
    sub.effectiveMaxLevel = maxLevel

    if (sub.subdivideMode === 'divLengthTensor') {
      const leaves = []
      grid.forEach((cell) => {
        collectTensorLeaves(utils, settings, {
          x: cell.x,
          y: cell.y,
          width: cell.width,
          height: cell.height,
          checkerPhase: (cell.row + cell.col) % 2,
        }, 0, maxLevel, leaves)
      })
      const { foreground, background } = settings.colors
      for (const r of leaves) {
        const fill = r.checkerPhase % 2 === 0 ? foreground : background
        canvas.rect(
          utils.vec.create(r.x, r.y),
          r.width,
          r.height,
          fill,
          'transparent',
          0
        )
      }
      if (settings.showgrid) {
        canvas.cellEdges(leaves, settings.colors.foreground, 1, {
          strokeAlign: 'center',
          includeOuter: false,
        })
      }
      return
    }

    const terminals = grid.subdivide(
      sub.subdivideMode === 'divLength'
        ? {
            maxLevel,
            rule: (_cell, level) => {
              if (
                !shouldBypassSubdivideChance(settings, level) &&
                !utils.seed.coinToss(sub.chance)
              ) {
                return false
              }
              const minR = sub.minSegmentRatio ?? 0
              const cols = pickSplitCountFromDivLength(
                utils,
                sub.splitMinCols,
                sub.splitMaxCols,
                { ...sub, minSegmentRatio: minR }
              )
              const rows = pickSplitCountFromDivLength(
                utils,
                sub.splitMinRows,
                sub.splitMaxRows,
                { ...sub, minSegmentRatio: minR }
              )
              return { cols, rows }
            },
          }
        : {
            maxLevel,
            condition: (_cell, level) =>
              shouldBypassSubdivideChance(settings, level) ||
              utils.seed.coinToss(sub.chance),
            chance: sub.chance,
            subdivisionCols: sub.subdivisionCols,
            subdivisionRows: sub.subdivisionRows,
          }
    )
    terminals.forEach((cell) => {
      cell.draw(canvas, theme, settings)
    })
    if (settings.showgrid) {
      canvas.cellEdges(terminals, theme.annotation, 1, {
        strokeAlign: 'center',
        includeOuter: false,
      })
    }
    return
  }

  grid.forEach((cell) => {
    cell.draw(canvas, theme, settings)
  })
}
