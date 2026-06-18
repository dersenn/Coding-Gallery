import { Grid, GridCell } from '~/types/project'
import { shortcuts } from '~/utils/shortcuts'

/** Normalized wave along u ∈ [0, 1] → t ∈ [0, 1]. */
function waveSine(u, cycles) {
  return (Math.sin(u * Math.PI * 2 * cycles) + 1) / 2
}

const exp01 = (t) => (Math.exp(t) - 1) / (Math.E - 1)

/** Ease-in within each cycle segment — uniform peak every cycle when cols divides cycles. */
function waveExpReset(col, cols, cycles) {
  if (cols <= 1) return 0
  const stepsPerCycle = cols / cycles
  const localPhase = (col % stepsPerCycle) / stepsPerCycle
  const peakPhase = (stepsPerCycle - 1) / stepsPerCycle
  return exp01(localPhase) / exp01(peakPhase)
}

const gcd = (a, b) => (b === 0 ? a : gcd(b, a % b))
const lcm = (a, b) => (a * b) / gcd(a, b)

/** cols must divide every pattern period — u = col/cols samples [0, 1) for seamless repeat. */
function resolveCols(expCycles, alternatingSteps, sineCyclesCenter, sineCyclesBaseline, multiplier = 6) {
  const period = [expCycles, alternatingSteps, sineCyclesCenter, sineCyclesBaseline]
    .reduce((a, b) => lcm(a, b))
  return period * multiplier
}

function drawCenteredLash(svg, v, center, halfLen, color, strokeW) {
  const ln = svg.line(
    center.sub(v(0, halfLen)),
    center.add(v(0, halfLen)),
    color,
    strokeW
  )
  ln.setAttribute('stroke-linecap', 'round')
}

function drawBaselineLash(svg, v, base, len, color, strokeW) {
  const ln = svg.line(base, base.sub(v(0, len)), color, strokeW)
  ln.setAttribute('stroke-linecap', 'round')
}

export function draw(context) {
  const { svg, theme, utils } = context
  if (!svg?.print) return

  const { pt, mm, trimWidth, trimHeight } = svg.print

  const minHalfLen = mm(0.3)
  const maxHalfLen = mm(1.8) // 3.6mm total line height
  const strokeW = pt(0.6)
  const color = theme.white

  const alternatingSteps = [1, 0.5, 0.75, 0.5]
  const expCycles = 6
  const sineCyclesCenter = 4
  const sineCyclesBaseline = 4

  const cols = resolveCols(expCycles, alternatingSteps.length, sineCyclesCenter, sineCyclesBaseline)
  const rows = 6 // pairs: exp, alternating, sine × center / baseline

  const lash = {
    utils,
    minHalfLen,
    maxHalfLen,
    strokeW,
    color,
    alternatingSteps,
    expCycles,
    sineCyclesCenter,
    sineCyclesBaseline,
  }

  const grid = createMascaraLinesGrid({
    cols,
    rows,
    width: trimWidth,
    height: trimHeight,
    utils,
  })

  grid.forEach((cell) => cell.draw(svg, lash))
}

class MascaraLinesGrid extends Grid {
  createCell(config) {
    return new MascaraLinesCell(config)
  }
}

class MascaraLinesCell extends GridCell {
  constructor(config) {
    super(config)
    this.mode = this.row
  }

  draw(svg, lash) {
    const { v } = shortcuts(lash.utils)
    const {
      utils,
      minHalfLen,
      maxHalfLen,
      strokeW,
      color,
      alternatingSteps,
      expCycles,
      sineCyclesCenter,
      sineCyclesBaseline,
    } = lash

    const u = this.col / this.grid.cols
    const center = this.center()
    const base = center.add(v(0, maxHalfLen))

    switch (this.mode) {
      // exp — center / baseline
      case 0: {
        const t = waveExpReset(this.col, this.grid.cols, expCycles)
        const halfLen = utils.math.lerp(minHalfLen, maxHalfLen, t)
        drawCenteredLash(svg, v, center, halfLen, color, strokeW)
        break
      }
      case 1: {
        const t = waveExpReset(this.col, this.grid.cols, expCycles)
        const halfLen = utils.math.lerp(minHalfLen, maxHalfLen, t)
        drawBaselineLash(svg, v, base, halfLen * 2, color, strokeW)
        break
      }
      // alternating — center / baseline
      case 2: {
        const scale = alternatingSteps[this.col % alternatingSteps.length]
        drawCenteredLash(svg, v, center, maxHalfLen * scale, color, strokeW)
        break
      }
      case 3: {
        const scale = alternatingSteps[this.col % alternatingSteps.length]
        drawBaselineLash(svg, v, base, maxHalfLen * 2 * scale, color, strokeW)
        break
      }
      // sine — center / baseline
      case 4: {
        const t = waveSine(u, sineCyclesCenter)
        const halfLen = utils.math.lerp(minHalfLen, maxHalfLen, t)
        drawCenteredLash(svg, v, center, halfLen, color, strokeW)
        break
      }
      case 5: {
        const t = waveSine(u, sineCyclesBaseline)
        const halfLen = utils.math.lerp(minHalfLen, maxHalfLen, t)
        drawBaselineLash(svg, v, base, halfLen * 2, color, strokeW)
        break
      }
    }
  }
}

function createMascaraLinesGrid({ cols, rows, width, height, utils }) {
  return new MascaraLinesGrid({
    cols,
    rows,
    width,
    height,
    x: 0,
    y: 0,
    utils,
  })
}
