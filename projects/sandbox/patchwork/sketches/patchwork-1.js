import { Grid, GridCell } from '~/types/project'
import { shortcuts } from '~/utils/shortcuts'
import { buildWeave } from '~/utils/weave'

// ─── Weave “gap” helpers (recent passes) ─────────────────────────────────────
// Each terminal cell picks a weave pattern from `bucket` (noise → palette index).
// Slots that used to be only `transparent` now often use `gap`: same weave logic,
// but the second ink is either transparent, a light HSL tint, or a dark HSL shade
// — see gapForBucket() for which bucket gets which (tweak the switch there).
// drawWeave(..., { halftoneDirection: 'tb' }) only on `default`: horizontal stripes
// read cleaner when halftone density eases top→bottom; other cases stay 'lr'.

/** Lighten via HSL (utilities: color.parse / color.fromHsl — reuse) */
function tintColor(utils, input, lightnessMix = 0.38) {
  const c = utils.color.parse(input)
  if (!c || c.a === 0) return input
  const [h, s, l] = c.toHslTuple()
  const l2 = Math.min(100, l + (100 - l) * lightnessMix)
  return utils.color.fromHsl(h, s, l2, c.a).toHex()
}

/** Darken via HSL toward black (reuse) */
function shadeColor(utils, input, darknessMix = 0.52) {
  const c = utils.color.parse(input)
  if (!c || c.a === 0) return input
  const [h, s, l] = c.toHslTuple()
  const l2 = Math.max(4, l * (1 - darknessMix))
  return utils.color.fromHsl(h, Math.min(100, s * 1.12), l2, c.a).toHex()
}

/**
 * Second ink for weave warp/weft arrays (`gap` in draw()).
 * Bucket = floor(noise * palette.length), same index that selects the switch case.
 *
 * | buckets | gap        |
 * | 0, 3    | light tint |
 * | 1, 5    | transparent (true knockout) |
 * | 2, 4+, default | dark shade |
 */
function gapForBucket(utils, baseColor, bucket) {
  const gapLight = tintColor(utils, baseColor)
  const gapDark = shadeColor(utils, baseColor)
  switch (bucket) {
    case 1:
    case 5:
      return 'transparent'
    case 0:
    case 3:
      return gapLight
    case 2:
    default:
      return gapDark
  }
}

function squareDivisions(width, height, divisions) {
  if (width <= height) {
    const cellSize = width / divisions
    return { cols: divisions, rows: Math.max(1, Math.floor(height / cellSize)) }
  } else {
    const cellSize = height / divisions
    return { cols: Math.max(1, Math.floor(width / cellSize)), rows: divisions }
  }
}



class MyGrid extends Grid {
  createCell(config) {
    return new MyCell(config)
  }
}

class MyCell extends GridCell {
  constructor(config) {
    super(config)
    this.noise = 0
    this.sampleSize = 0
    this.color = ''
  }

  noiseSample(ns) {
    const { simplex2 } = shortcuts(this.grid.utils)
    const cx = this.x + this.width / 2
    const cy = this.y + this.height / 2
    const rootCell = this.parent ?? this
    const delta = rootCell.index * ns.offset
    // align strip-phase offset with top-level split axis (rows → Y, cols → X)
    const offsetX = ns.portrait ? 0 : delta
    const offsetY = ns.portrait ? delta : 0

    this.sampleSize = this.width * ns.sampleMultiplier

    // snap to coarser sample grid
    const sx = this.sampleSize > 0 ? Math.floor((cx + offsetX) / this.sampleSize) * this.sampleSize : cx + offsetX
    const sy = this.sampleSize > 0 ? Math.floor((cy + offsetY) / this.sampleSize) * this.sampleSize : cy + offsetY

    let total = 0
    let frequency = ns.scale
    let amplitude = 1
    for (let i = 0; i < ns.octaves; i++) {
      total += simplex2(sx * frequency * ns.stretchX, sy * frequency * ns.stretchY) * amplitude
      frequency *= ns.lacunarity
      amplitude *= ns.persistence
    }
    return(total * ns.amplitude + 1) / 2
  }

  normalizeNoise(min, max, amplitude) {
    const normalized = max > min ? (this.noise - min) / (max - min) : 0.5
    this.noise = Math.pow(normalized, 1 / amplitude)
  }

  assignColor(colors) {
    const i = Math.min(Math.floor(this.noise * colors.length), colors.length - 1)
    this.color = colors[i]
  }

  // canvas.halftone passes density(nx, ny); 'lr' eases on nx, 'tb' on ny (see utils/canvas halftone).
  drawWeave(canvas, weave, options = {}) {
    const { halftoneDirection = 'lr' } = options
    const { v, rnd, curve } = shortcuts(this.grid.utils)
    const colSize = this.width / weave.cols
    const rowSize = this.height / weave.rows
    const spacing = Math.max(1, Math.ceil(Math.min(colSize, rowSize) / 80))

    const density =
      halftoneDirection === 'tb'
        ? (_nx, ny) => 1 - curve.easeIn(ny)
        : (nx, _ny) => 1 - curve.easeIn(nx)

    for (let row = 0; row < weave.rows; row++) {
      for (let col = 0; col < weave.cols; col++) {
        const warpUp = weave.drawdown[row][col]
        const fill = warpUp
          ? weave.warpColors[col % weave.warpColors.length]
          : weave.weftColors[row % weave.weftColors.length]

        if (fill === 'transparent') continue

        canvas.halftone(
          v(this.x + col * colSize, this.y + row * rowSize),
          colSize, rowSize,
          fill,
          density,
          { spacing, rng: rnd }
        )
      }
    }
  }

  draw(canvas, theme) {
    const { v, shuffle } = shortcuts(this.grid.utils)
    const r = this.width / 2
    const bucket = Math.min(Math.floor(this.noise * theme.palette.length), theme.palette.length - 1)
    const gap = gapForBucket(this.grid.utils, this.color, bucket) // second ink; not row-based

    switch (bucket) {
      case 0:
        this.drawWeave(canvas, buildWeave({
          threading: [1, 2, 3, 4],
          treadling: [1, 2, 3, 4],
          tieup: [
            [true, false, false, false],
            [false, true, false, false],
            [false, false, true, false],
            [false, false, false, true],
          ],
          warpColors: [this.color, gap],
          weftColors: [gap, this.color],
        }))
        break
      case 1: {
        this.drawWeave(canvas, buildWeave({
          threading: [1, 2],
          treadling: [1, 2],
          tieup: [
            [true, false],
            [false, true]
          ],
          warpColors: [gap, gap],
          weftColors: [this.color, this.color],
        }))
        break
        }
      case 2:
        this.drawWeave(canvas, buildWeave({
          threading: [1, 2, 3, 4],
          treadling: [1, 2, 3, 4],
          tieup: [
            [true, true, true, false],
            [false, true, true, true],
            [true, false, true, true],
            [true, true, false, true],
          ],
          warpColors: [this.color],
          weftColors: [gap],
        }))
        break
      case 3:
        this.drawWeave(canvas, buildWeave({
          threading: [1, 2, 1, 2],
          treadling: [1, 2, 1, 2],
          tieup: [
            [true, false],
            [false, true]
          ],
          warpColors: [gap, this.color],
          weftColors: [this.color, gap],
        }))
        break
      // case 4:
      //   this.drawWeave(canvas, buildWeave({
      //     threading: [1, 1, 2, 2, 3, 3, 4, 4, 1, 1, 1, 2, 2, 3, 3, 4, 4, 1, 2, 3, 4],
      //     treadling: [1, 2, 3, 4, 1, 1, 2, 2, 3, 3, 4, 4, 1, 1, 1, 2, 2, 3, 3, 4, 4],
      //     tieup: [
      //       [false, false, true, true],
      //       [false, true, true, false],
      //       [true, true, false, false],
      //       [true, false, false, true],
      //     ],
      //     warpColors: ['transparent'],
      //     weftColors: [this.color],
      //   }))
      //   break
      case 5:
        this.drawWeave(canvas, buildWeave({
          threading: [1, 2, 3, 4, 1, 2, 3, 4],
          treadling: [1, 2, 3, 4, 1, 2, 3, 4],
          tieup: [
            [false, false, true, true],
            [false, true, true, false],
            [true, true, false, false],
            [true, false, false, true],
          ],
          warpColors: [
            gap, gap, gap, gap,
            this.color, this.color, this.color, this.color,
          ],
          weftColors: [
            this.color, this.color, this.color, this.color,
            gap, gap, gap, gap,
          ],
        }))
        break

      default:
        // 1-shaft treadling [1,2,…] → horizontal bands in drawdown; halftone 'tb' matches stripe direction
        this.drawWeave(
          canvas,
          buildWeave({
            threading: [1],
            treadling: [1, 2, 1, 2],
            tieup: [
              [true],
              [false],
            ],
            warpColors: [this.color],
            weftColors: [gap],
          }),
          { halftoneDirection: 'tb' }
        )
        break
    }
  }
}


export function draw(context) {
  const { canvas, theme, utils, controls: c } = context
  const { rndInt, shuffle } = shortcuts(utils)

  if (!canvas) return

  const palette = c.shuffleColors ? shuffle(theme.palette) : theme.palette

  const portrait = canvas.h > canvas.w
  const splits = rndInt(2, 4)
  const cols = portrait ? 1 : splits
  const rows = portrait ? splits : 1

  const grid = new MyGrid({
    cols,
    rows,
    width: canvas.w, 
    height: canvas.h, 
    fit: 'contain',
    utils 
  })

  const noiseSettings = {
    sampleMultiplier: c.sampleMultiplier,
    scale: c.scale,
    offset: c.offset,
    portrait,
    stretchX: c.stretchX,
    stretchY: c.stretchY,
    amplitude: c.amplitude,
    octaves: c.octaves,
    lacunarity: c.lacunarity,
    persistence: c.persistence,
  }

  const terminals = grid.subdivide({
    maxLevel: 1,
    rule: (cell, level) => {
      if (level === 0) return squareDivisions(cell.width, cell.height, 15)
      return false
    }
  })

  if (c.drawBackground) {
    canvas.background(theme.background)
  }

  terminals.forEach(cell => { cell.noise = cell.noiseSample(noiseSettings) })

  const min = Math.min(...terminals.map(cell => cell.noise))
  const max = Math.max(...terminals.map(cell => cell.noise))

  terminals.forEach(cell => {
    cell.normalizeNoise(min, max, noiseSettings.amplitude)
    cell.assignColor(palette)
    cell.draw(canvas, theme)
  })


  // canvas.cellEdges(terminals, theme.annotation, 1, { strokeAlign: 'center', includeOuter: false })



}