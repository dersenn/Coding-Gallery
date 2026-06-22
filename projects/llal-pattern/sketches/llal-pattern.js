/**
 * LLAL Pattern — variable-width letter columns with optional turbulence filter.
 * One <text> per row; columns flow inline for native font spacing. svg-text-to-path for export.
 *
 * Utilities checked: svg.text (no tspan/variation support), svg filters (none).
 * Chosen path: custom DOM for text/tspan, filters, and text-to-path bridge.
 */
import { shortcuts } from '~/utils/shortcuts'
import Session from 'svg-text-to-path/entries/browser-fontkit.js'

const WDTHS = [50, 100, 150, 200]
// Logo pairs sum to 250 — LL uses 50/200, AL uses 100/150 (each has two orderings).
const LL_PAIR_WIDTHS = [[50, 200], [200, 50]]
const AL_PAIR_WIDTHS = [[100, 150], [150, 100]]
const TEXT = 'LLAL'
const FONT_FAMILY = 'LLAL-linear'
const LINE_OFFSET_RATIO = 0.66
const ROW_FONT_SCALE = 1.5
const LAYOUT_ROWS = 'rows'
const LAYOUT_COLUMNS = 'columns'

let lastSvg = null
let lastConversion = Promise.resolve()

/** Await path conversion, then save — used by download-svg-outlined action. */
export async function exportOutlined(seed) {
  await lastConversion
  if (lastSvg) {
    lastSvg.save(String(seed), 'llal-pattern')
  }
}

function syncArtboard(svg, wMM, hMM) {
  svg.stage.setAttribute('width', `${wMM}mm`)
  svg.stage.setAttribute('height', `${hMM}mm`)
  svg.stage.setAttribute('viewBox', `0 0 ${wMM} ${hMM}`)
}

function lineOffsetMM(fontSizeMM) {
  return fontSizeMM * LINE_OFFSET_RATIO
}

/** Slider 100 = uniform; lower values shrink the bottom row relative to the top. */
function bottomRowScaleFraction(bottomPercent) {
  const scale = Math.max(0.1, Math.min(1, bottomPercent / 100))
  return 1 - scale
}

function fontSizeForRow(baseSizeMM, row, rows, taper) {
  if (rows <= 1 || taper === 0) return baseSizeMM
  const t = row / (rows - 1)
  return baseSizeMM * (1 - taper * t)
}

/** Top row uses blanksProb; bottom row ramps up to blanksBottomProb (never below top). */
function blanksProbForRow(topProb, row, rows, increasePerRow, bottomProb) {
  if (!increasePerRow || rows <= 1) return topProb
  const t = row / (rows - 1)
  const bottom = Math.max(topProb, bottomProb ?? 100)
  return topProb + (bottom - topProb) * t
}

function stackedHeightMM(baseSizeMM, rows, taper) {
  let height = 0
  for (let row = 0; row < rows; row++) {
    height += lineOffsetMM(fontSizeForRow(baseSizeMM, row, rows, taper))
  }
  return height
}

function resolveBaseFontSize(hMM, rows, taper) {
  if (taper === 0) {
    return (hMM / rows) * ROW_FONT_SCALE
  }
  let lo = 0
  let hi = (hMM / rows) * ROW_FONT_SCALE * 2
  for (let i = 0; i < 32; i++) {
    const mid = (lo + hi) / 2
    if (stackedHeightMM(mid, rows, taper) < hMM) lo = mid
    else hi = mid
  }
  return (lo + hi) / 2
}

function rowsForHeight(hMM, fontSizeMM) {
  const step = lineOffsetMM(fontSizeMM)
  return Math.max(1, Math.floor(hMM / step))
}

function rowLetters(row, alternateRows) {
  const offset = alternateRows && row % 2 === 1 ? 2 : 0
  return Array.from({ length: TEXT.length }, (_, i) => TEXT[(offset + i) % TEXT.length])
}

function rowWidthValues(utils, squareDistribution, squareSchedule, row, alternateRows) {
  const { shuffle } = shortcuts(utils)
  if (!squareDistribution) {
    return shuffle([...WDTHS])
  }
  let llIdx = alternateRows ? squareSchedule.ll[0] : squareSchedule.ll[row]
  let alIdx = alternateRows ? squareSchedule.al[0] : squareSchedule.al[row]
  if (alternateRows && row % 2 === 1) {
    llIdx = 1 - llIdx
    alIdx = 1 - alIdx
  }
  return [...LL_PAIR_WIDTHS[llIdx], ...AL_PAIR_WIDTHS[alIdx]]
}

/**
 * Per-column width schedule.
 * - Alternate rows: one base pair per family; odd rows invert it.
 * - Otherwise: both inversions appear across rows when rows >= 2.
 */
function buildSquareColumnSchedule(utils, rows, alternateRows) {
  const { rndInt, shuffle } = shortcuts(utils)
  if (alternateRows) {
    return { ll: [rndInt(0, 1)], al: [rndInt(0, 1)] }
  }
  const scheduleForFamily = () => {
    if (rows <= 1) return [rndInt(0, 1)]
    const indices = [0, 1]
    for (let i = 2; i < rows; i++) indices.push(rndInt(0, 1))
    return shuffle(indices)
  }
  return {
    ll: scheduleForFamily(),
    al: scheduleForFamily()
  }
}

function buildSwirlFilter(svg, defs, wMM, hMM, utils) {
  const { rnd, rndInt } = shortcuts(utils)
  const swirl = document.createElementNS(svg.ns, 'filter')
  swirl.setAttribute('id', 'swirl')
  swirl.setAttribute('width', String(wMM))
  swirl.setAttribute('height', String(hMM))

  const turb = document.createElementNS(svg.ns, 'feTurbulence')
  turb.setAttribute('type', 'turbulence')
  turb.setAttribute('seed', String(rnd() * 100))
  turb.setAttribute('baseFrequency', `${rnd() / 100} ${rnd() / 100}`)
  turb.setAttribute('numOctaves', String(rndInt(1, 10)))
  turb.setAttribute('result', 'turbulence')
  turb.setAttribute('color-interpolation-filters', 'sRGB')

  const disp = document.createElementNS(svg.ns, 'feDisplacementMap')
  disp.setAttribute('in2', 'turbulence')
  disp.setAttribute('in', 'SourceGraphic')
  disp.setAttribute('scale', String(rnd() * 100))
  disp.setAttribute('xChannelSelector', 'R')
  disp.setAttribute('yChannelSelector', 'G')
  disp.setAttribute('color-interpolation-filters', 'sRGB')

  swirl.append(turb, disp)
  defs.append(swirl)
  svg.stage.setAttribute('style', 'filter: url(#swirl)')
}

function buildColumnSchedules(opts) {
  if (!opts.squareDistribution) return null
  const columnCount = opts.columnsPerRow
    ? Math.max(...opts.columnsPerRow)
    : opts.columns
  return Array.from({ length: columnCount }, () =>
    buildSquareColumnSchedule(opts.utils, opts.rows, opts.alternateRows)
  )
}

function appendRowLetters(textEl, opts, row, fontSizeMM, columnSchedules) {
  const { coin } = shortcuts(opts.utils)
  const ns = opts.svg.ns
  const rowColumns = opts.columnsPerRow ? opts.columnsPerRow[row] : opts.columns

  for (let col = 0; col < rowColumns; col++) {
    const squareSchedule = columnSchedules ? columnSchedules[col] : null
    const wValues = rowWidthValues(
      opts.utils,
      opts.squareDistribution,
      squareSchedule,
      row,
      opts.alternateRows
    )
    const letters = rowLetters(row, opts.alternateRows)
    const rowBlanksProb = blanksProbForRow(
      opts.blanksProb,
      row,
      opts.rows,
      opts.blanksIncreasePerRow,
      opts.blanksBottomProb
    )
    for (let g = 0; g < TEXT.length; g++) {
      let fill = opts.letterFill
      if (opts.useBlanks && coin(rowBlanksProb)) {
        fill = opts.backgroundFill
      }
      const span = document.createElementNS(ns, 'tspan')
      span.setAttribute(
        'style',
        `font-size: ${fontSizeMM};font-variation-settings: 'wdth' ${wValues[g]};fill: ${fill}`
      )
      span.textContent = letters[g]
      textEl.append(span)
    }
  }
}

function buildLettersGroup(svg, opts) {
  const ns = svg.ns
  const letters = document.createElementNS(ns, 'g')
  letters.setAttribute('id', 'letters')
  letters.setAttribute('font-family', FONT_FAMILY)
  svg.stage.append(letters)

  const baseFontSizeMM = opts.fontSizeMM
  const taper = opts.rowFontTaper ?? 0
  const columnSchedules = buildColumnSchedules(opts)

  let y = 0
  for (let row = 0; row < opts.rows; row++) {
    const rowFontSizeMM = fontSizeForRow(baseFontSizeMM, row, opts.rows, taper)
    y += lineOffsetMM(rowFontSizeMM)
    const text = document.createElementNS(ns, 'text')
    text.setAttribute('x', '0')
    text.setAttribute('y', String(y))
    text.setAttribute('font-size', String(rowFontSizeMM))
    appendRowLetters(text, opts, row, rowFontSizeMM, columnSchedules)
    letters.append(text)
  }

  return letters
}

function measureLettersWidth(group) {
  return group.getBBox().width
}

function measureRowWidth(svg, measureOpts, fontSizeMM, columns) {
  const group = buildLettersGroup(svg, {
    ...measureOpts,
    fontSizeMM,
    rows: 1,
    columns,
    rowFontTaper: 0,
    columnsPerRow: null
  })
  const width = measureLettersWidth(group)
  group.remove()
  return width
}

/**
 * Smaller rows need more column repeats to span the artboard width.
 * Top row keeps the columns control; lower rows scale repeats from measured top-row unit width.
 */
function resolveColumnsPerRow(wMM, rows, baseFontSizeMM, taper, topRowWidth, baseColumns) {
  if (taper === 0 || topRowWidth <= 0) return null

  const topUnitWidth = topRowWidth / baseColumns

  return Array.from({ length: rows }, (_, row) => {
    if (row === 0) return baseColumns
    const rowFont = fontSizeForRow(baseFontSizeMM, row, rows, taper)
    const unitWidth = topUnitWidth * (rowFont / baseFontSizeMM)
    return Math.max(baseColumns, Math.ceil(wMM / unitWidth))
  })
}

function resolveRowLayout(svg, opts) {
  const taper = bottomRowScaleFraction(opts.rowFontTaper ?? 100)
  const fontSizeMM = resolveBaseFontSize(opts.hMM, opts.rows, taper)

  const measureOpts = {
    svg,
    utils: opts.utils,
    letterFill: opts.letterFill,
    backgroundFill: opts.backgroundFill,
    useBlanks: opts.useBlanks,
    blanksProb: opts.blanksProb,
    alternateRows: opts.alternateRows,
    squareDistribution: opts.squareDistribution
  }

  const topRowWidth = taper > 0
    ? measureRowWidth(svg, measureOpts, fontSizeMM, opts.columns)
    : 0
  const columnsPerRow = resolveColumnsPerRow(
    opts.wMM,
    opts.rows,
    fontSizeMM,
    taper,
    topRowWidth,
    opts.columns
  )

  return {
    fontSizeMM,
    rows: opts.rows,
    columns: opts.columns,
    columnsPerRow,
    rowFontTaper: taper
  }
}

function resolveColumnLayout(svg, opts) {
  const measureOpts = {
    svg,
    utils: opts.utils,
    letterFill: opts.letterFill,
    backgroundFill: opts.backgroundFill,
    useBlanks: opts.useBlanks,
    blanksProb: opts.blanksProb,
    columns: opts.columns,
    alternateRows: opts.alternateRows,
    squareDistribution: opts.squareDistribution
  }

  const fitWidth = (fontSizeMM, rows) => {
    const group = buildLettersGroup(svg, {
      ...measureOpts,
      fontSizeMM,
      rows
    })
    const width = measureLettersWidth(group)
    group.remove()
    return width > 0 ? (opts.wMM / width) * fontSizeMM : fontSizeMM
  }

  const refSize = 1
  let rows = rowsForHeight(opts.hMM, refSize)
  let fontSizeMM = fitWidth(refSize, rows)
  rows = rowsForHeight(opts.hMM, fontSizeMM)
  fontSizeMM = fitWidth(fontSizeMM, rows)

  return {
    fontSizeMM,
    rows,
    columns: opts.columns
  }
}

function buildLetters(svg, opts) {
  buildLettersGroup(svg, opts)
}

export function draw(context) {
  const { svg, controls, theme, utils } = context
  if (!svg) return

  lastSvg = svg
  const c = controls
  const wMM = c.outputWidth
  const hMM = c.outputHeight
  const { v } = shortcuts(utils)
  const layoutMode = c.layoutMode === LAYOUT_COLUMNS ? LAYOUT_COLUMNS : LAYOUT_ROWS

  syncArtboard(svg, wMM, hMM)
  svg.rect(v(0, 0), wMM, hMM, theme.background, 'none', 0)

  const defs = document.createElementNS(svg.ns, 'defs')
  svg.stage.append(defs)

  if (c.useFilter) {
    buildSwirlFilter(svg, defs, wMM, hMM, utils)
  } else {
    svg.stage.removeAttribute('style')
  }

  const letterOpts = {
    svg,
    wMM,
    hMM,
    utils,
    columns: c.columns,
    rows: c.rows,
    rowFontTaper: layoutMode === LAYOUT_ROWS ? (c.rowFontTaper ?? 100) : 100,
    useBlanks: c.useBlanks,
    blanksProb: c.blanksProb,
    blanksIncreasePerRow: c.blanksIncreasePerRow,
    blanksBottomProb: c.blanksBottomProb ?? 100,
    alternateRows: c.alternateRows,
    squareDistribution: c.squareDistribution,
    letterFill: theme.foreground,
    backgroundFill: theme.background
  }

  const layout = layoutMode === LAYOUT_COLUMNS
    ? resolveColumnLayout(svg, letterOpts)
    : resolveRowLayout(svg, letterOpts)

  // Measurement passes consume the seeded stream; replay before the visible build.
  if (layoutMode === LAYOUT_COLUMNS || layout.rowFontTaper > 0) {
    utils.seed.reset()
  }

  buildLetters(svg, {
    ...letterOpts,
    fontSizeMM: layout.fontSizeMM,
    rows: layout.rows,
    columns: layout.columns,
    columnsPerRow: layout.columnsPerRow ?? null,
    rowFontTaper: layout.rowFontTaper ?? 0
  })

  const session = new Session(svg.stage, { useFontFace: true })
  lastConversion = session.replaceAll()
}
