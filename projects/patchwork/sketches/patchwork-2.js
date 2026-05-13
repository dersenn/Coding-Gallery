import { Grid, GridCell } from '~/types/project'
import { shortcuts } from '~/utils/shortcuts'
import { buildWeave } from '~/utils/weave'
import { lightTheme } from '~/utils/theme'

// ─── Weave secondary-weft helper ─────────────────────────────────────────────
// Each terminal cell picks a weave pattern from `bucket` (noise → palette index).
// `weftAlt` is the cell's second weft ink — always a fully opaque color, either a
// light HSL tint or a dark HSL shade of `this.color`. The primary weft is
// `this.color` itself. Warp is uniform across the whole piece (one color per draw)
// for every case EXCEPT case 5 (houndstooth), which uses a 4+4 split of
// `warpColor` and `this.color` so the houndstooth check appears against the
// surrounding fabric. Every case renders at an 8×8 sub-grid per terminal cell
// (8 warps × 8 wefts) so warp pitch is the same across every patch.
// See weftAltForBucket() for which bucket gets light vs dark (tweak the switch there).
// Halftone direction is uniform across the sketch: warp sub-cells fade left→right
// (across the vertical threads), weft sub-cells fade top→bottom (across the horizontal threads).

/** Lighten via HSL (utilities: color.parse / color.fromHsl — reuse) */
function tintColor(utils, input, lightnessMix = 0.38) {
  const col = utils.color.parse(input)
  if (!col || col.a === 0) return input
  const [h, s, l] = col.toHslTuple()
  const l2 = Math.min(100, l + (100 - l) * lightnessMix)
  return utils.color.fromHsl(h, s, l2, col.a).toHex()
}

/** Darken via HSL toward black (reuse) */
function shadeColor(utils, input, darknessMix = 0.52) {
  const col = utils.color.parse(input)
  if (!col || col.a === 0) return input
  const [h, s, l] = col.toHslTuple()
  const l2 = Math.max(4, l * (1 - darknessMix))
  return utils.color.fromHsl(h, Math.min(100, s * 1.12), l2, col.a).toHex()
}

/**
 * Secondary weft ink for the current cell (`weftAlt` in draw()).
 * Always opaque — light HSL tint or dark HSL shade of the cell's base color.
 * Bucket = floor(noise * palette.length), same index that selects the switch case.
 *
 * | buckets         | weftAlt    |
 * | 0, 1, 3         | light tint |
 * | 2, 5, default   | dark shade |
 */
function weftAltForBucket(utils, baseColor, bucket) {
  const light = tintColor(utils, baseColor)
  const dark = shadeColor(utils, baseColor)
  switch (bucket) {
    case 0:
    case 1:
    case 3:
      return light
    case 2:
    case 5:
    default:
      return dark
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

  // Halftone density gradient runs across each thread's own direction
  // (so the fade reads visually along the thread length):
  //   warp (vertical threads) → density fades left→right (nx)
  //   weft (horizontal threads) → density fades top→bottom (ny)
  // canvas.halftone passes density(nx, ny) (see utils/canvas halftone).
  drawWeave(canvas, weave) {
    const { v, rnd, curve } = shortcuts(this.grid.utils)
    const colSize = this.width / weave.cols
    const rowSize = this.height / weave.rows
    const spacing = Math.max(1, Math.ceil(Math.min(colSize, rowSize) / 80))

    const warpDensity = (nx, _ny) => 1 - curve.easeIn(nx)
    const weftDensity = (_nx, ny) => 1 - curve.easeIn(ny)

    for (let row = 0; row < weave.rows; row++) {
      for (let col = 0; col < weave.cols; col++) {
        const warpUp = weave.drawdown[row][col]
        const fill = warpUp
          ? weave.warpColors[col % weave.warpColors.length]
          : weave.weftColors[row % weave.weftColors.length]

        canvas.halftone(
          v(this.x + col * colSize, this.y + row * rowSize),
          colSize, rowSize,
          fill,
          warpUp ? warpDensity : weftDensity,
          { spacing, rng: rnd }
        )
      }
    }
  }

  // Uniform-weave variant: every case renders an 8×8 sub-grid per terminal cell,
  // so warp pitch stays constant across patches (the warp reads as a single fabric).
  // The warp color is fixed for the whole draw and passed in from draw(); only the
  // weft (and the chosen tieup/threading) varies per noise bucket.
  draw(canvas, theme, warpColor) {
    const bucket = Math.min(Math.floor(this.noise * theme.palette.length), theme.palette.length - 1)
    const weftAlt = weftAltForBucket(this.grid.utils, this.color, bucket) // secondary weft ink for this cell

    switch (bucket) {
      case 0:
        this.drawWeave(canvas, buildWeave({
          threading: [1, 2, 3, 4, 1, 2, 3, 4],
          treadling: [1, 2, 3, 4, 1, 2, 3, 4],
          tieup: [
            [true, false, false, false],
            [false, true, false, false],
            [false, false, true, false],
            [false, false, false, true],
          ],
          warpColors: [warpColor],
          weftColors: [weftAlt, this.color],
        }))
        break
      case 1: {
        this.drawWeave(canvas, buildWeave({
          threading: [1, 2, 1, 2, 1, 2, 1, 2],
          treadling: [1, 2, 1, 2, 1, 2, 1, 2],
          tieup: [
            [true, false],
            [false, true]
          ],
          warpColors: [warpColor],
          weftColors: [this.color],
        }))
        break
        }
      case 2:
        this.drawWeave(canvas, buildWeave({
          threading: [1, 2, 3, 4, 1, 2, 3, 4],
          treadling: [1, 2, 3, 4, 1, 2, 3, 4],
          tieup: [
            [true, true, true, false],
            [false, true, true, true],
            [true, false, true, true],
            [true, true, false, true],
          ],
          warpColors: [warpColor],
          weftColors: [weftAlt],
        }))
        break
      case 3:
        this.drawWeave(canvas, buildWeave({
          threading: [1, 2, 1, 2, 1, 2, 1, 2],
          treadling: [1, 2, 1, 2, 1, 2, 1, 2],
          tieup: [
            [true, false],
            [false, true]
          ],
          warpColors: [warpColor],
          weftColors: [this.color, weftAlt],
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
        // Houndstooth: classic 2/2 broken twill with a 4+4 color split in the warp.
        // Weft is a single color (this.color) so the houndstooth check reads against
        // the cell's own ground color, matching the rest of the patchwork.
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
            warpColor, warpColor, warpColor, warpColor,
            this.color, this.color, this.color, this.color,
          ],
          weftColors: [this.color],
        }))
        break

      default:
        // 1-shaft tieup → horizontal bands in drawdown.
        // Threading [1,…] (all same shaft) keeps the all-up/all-down behaviour at the shared pitch.
        this.drawWeave(canvas, buildWeave({
          threading: [1, 2, 1, 2, 1, 2, 1, 2],
          treadling: [1, 2, 1, 2, 1, 2, 1, 2],
          tieup: [
            [true, false],
            [false, true],
          ],
          warpColors: [warpColor],
          weftColors: [weftAlt, weftAlt, this.color, this.color],  // 2-pick color bands
        }))
        break
    }
  }
}


export function draw(context) {
  const { canvas, theme, utils, controls: c } = context
  const { rndInt, shuffle, pick } = shortcuts(utils)

  if (!canvas) return

  const palette = c.shuffleColors ? shuffle(lightTheme.palette) : lightTheme.palette
  // One warp color per draw, so every patch shares the same warp across the piece.
  const warpColor = pick(palette)

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
    canvas.background(lightTheme.background)
  }

  terminals.forEach(cell => { cell.noise = cell.noiseSample(noiseSettings) })

  const min = Math.min(...terminals.map(cell => cell.noise))
  const max = Math.max(...terminals.map(cell => cell.noise))

  terminals.forEach(cell => {
    cell.normalizeNoise(min, max, noiseSettings.amplitude)
    cell.assignColor(palette)
    cell.draw(canvas, lightTheme, warpColor)
  })


  // canvas.cellEdges(terminals, theme.annotation, 1, { strokeAlign: 'center', includeOuter: false })



}