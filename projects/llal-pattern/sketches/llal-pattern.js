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

function buildLetters(svg, opts) {
  const { coin, shuffle, v } = shortcuts(opts.utils)
  const ns = svg.ns
  const letters = document.createElementNS(ns, 'g')
  letters.setAttribute('id', 'letters')
  letters.setAttribute('font-family', FONT_FAMILY)
  // getBBox() requires the group to be attached to the rendered stage (legacy behavior).
  svg.stage.append(letters)

  const fontSizeMM = (opts.hMM / opts.rows) * 1.5
  const lineOffsetMM = fontSizeMM * 0.66
  const pos = v(0, 0)

  for (let col = 0; col < opts.columns; col++) {
    const text = document.createElementNS(ns, 'text')
    text.setAttribute('x', String(pos.x))
    text.setAttribute('y', String(pos.y))
    text.setAttribute('font-size', String(fontSizeMM))

    for (let row = 0; row < opts.rows; row++) {
      const rowTspan = document.createElementNS(ns, 'tspan')
      rowTspan.setAttribute('x', String(pos.x))
      rowTspan.setAttribute('dy', String(lineOffsetMM))

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
      text.append(rowTspan)
    }

    letters.append(text)
    pos.x += text.getBBox().width
  }
}

export function draw(context) {
  const { svg, controls, theme, utils } = context
  if (!svg) return

  lastSvg = svg
  const c = controls
  const wMM = c.outputWidth
  const hMM = c.outputHeight
  const { v } = shortcuts(utils)

  syncArtboard(svg, wMM, hMM)
  svg.rect(v(0, 0), wMM, hMM, theme.background, 'none', 0)

  const defs = document.createElementNS(svg.ns, 'defs')
  svg.stage.append(defs)

  if (c.useFilter) {
    buildSwirlFilter(svg, defs, wMM, hMM, utils)
  } else {
    svg.stage.removeAttribute('style')
  }

  buildLetters(svg, {
    hMM,
    rows: c.rows,
    columns: c.columns,
    useBlanks: c.useBlanks,
    blanksProb: c.blanksProb,
    letterFill: theme.foreground,
    backgroundFill: theme.background,
    utils
  })

  const session = new Session(svg.stage, { useFontFace: true })
  lastConversion = session.replaceAll()
}
