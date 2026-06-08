/**
 * LLAL Pattern — variable-width letter columns with optional turbulence filter.
 * Preserves legacy column/tspan layout; svg-text-to-path converts text for outlined export.
 *
 * Utilities checked: svg.text (no tspan/variation support), svg filters (none).
 * Chosen path: custom DOM for text/tspan, filters, and text-to-path bridge.
 */
import { shortcuts } from '~/utils/shortcuts'
import Session from 'svg-text-to-path/entries/browser-fontkit.js'

const WDTHS = [50, 100, 150, 200]
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

function rowsForHeight(hMM, fontSizeMM) {
  const step = lineOffsetMM(fontSizeMM)
  return Math.max(1, Math.floor(hMM / step))
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

function appendColumn(textEl, opts, fontSizeMM, offsetMM) {
  const { coin, shuffle } = shortcuts(opts.utils)
  const ns = opts.svg.ns

  for (let row = 0; row < opts.rows; row++) {
    const rowTspan = document.createElementNS(ns, 'tspan')
    rowTspan.setAttribute('x', textEl.getAttribute('x'))
    rowTspan.setAttribute('dy', String(offsetMM))

    const wShuffled = shuffle([...WDTHS])
    for (let g = 0; g < TEXT.length; g++) {
      let fill = opts.letterFill
      if (opts.useBlanks && coin(opts.blanksProb)) {
        fill = opts.backgroundFill
      }
      const span = document.createElementNS(ns, 'tspan')
      span.setAttribute(
        'style',
        `font-size: ${fontSizeMM};font-variation-settings: 'wdth' ${wShuffled[g]};fill: ${fill}`
      )
      span.textContent = TEXT[g]
      rowTspan.append(span)
    }
    textEl.append(rowTspan)
  }
}

function buildLettersGroup(svg, opts) {
  const { v } = shortcuts(opts.utils)
  const ns = svg.ns
  const letters = document.createElementNS(ns, 'g')
  letters.setAttribute('id', 'letters')
  letters.setAttribute('font-family', FONT_FAMILY)
  // getBBox() requires the group on the rendered stage (legacy behavior).
  svg.stage.append(letters)

  const fontSizeMM = opts.fontSizeMM
  const offsetMM = lineOffsetMM(fontSizeMM)
  const pos = v(0, 0)

  for (let col = 0; col < opts.columns; col++) {
    const text = document.createElementNS(ns, 'text')
    text.setAttribute('x', String(pos.x))
    text.setAttribute('y', String(pos.y))
    text.setAttribute('font-size', String(fontSizeMM))
    appendColumn(text, opts, fontSizeMM, offsetMM)
    letters.append(text)
    pos.x += text.getBBox().width
  }

  return letters
}

function measureLettersWidth(group) {
  return group.getBBox().width
}

function resolveRowLayout(opts) {
  const fontSizeMM = (opts.hMM / opts.rows) * ROW_FONT_SCALE
  return {
    fontSizeMM,
    rows: opts.rows,
    columns: opts.columns
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
    columns: opts.columns
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
    useBlanks: c.useBlanks,
    blanksProb: c.blanksProb,
    letterFill: theme.foreground,
    backgroundFill: theme.background
  }

  const layout = layoutMode === LAYOUT_COLUMNS
    ? resolveColumnLayout(svg, letterOpts)
    : resolveRowLayout(letterOpts)

  // Measurement passes consume the seeded stream; replay before the visible build.
  if (layoutMode === LAYOUT_COLUMNS) {
    utils.seed.reset()
  }

  buildLetters(svg, {
    ...letterOpts,
    fontSizeMM: layout.fontSizeMM,
    rows: layout.rows,
    columns: layout.columns
  })

  const session = new Session(svg.stage, { useFontFace: true })
  lastConversion = session.replaceAll()
}
