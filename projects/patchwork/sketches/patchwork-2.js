import { Grid, GridCell } from '~/types/project'
import { shortcuts } from '~/utils/shortcuts'
import { buildWeave } from '~/utils/weave'
import { lightTheme } from '~/utils/theme'

// ─── Weave “gap” helpers (recent passes) ─────────────────────────────────────
// Each terminal cell picks a weave pattern from `bucket` (noise → palette index).
// Slots that used to be only `transparent` now often use `gap`: same weave logic,
// but the second ink is either transparent, a light HSL tint, or a dark HSL shade
// — see gapForBucket() for which bucket gets which (tweak the switch there).
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

        if (fill === 'transparent') continue

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

  // Uniform-weave variant: every case renders a 4×4 sub-grid per terminal cell,
  // so warp pitch stays constant across patches (the warp reads as a single fabric).
  // The warp color is fixed for the whole draw and passed in from draw(); only the
  // weft (and the chosen tieup/threading) varies per noise bucket.
  draw(canvas, theme, warpColor) {
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
          warpColors: [warpColor],
          weftColors: [gap, this.color],
        }))
        break
      case 1: {
        // plain weave expanded to 4 warps / 4 wefts to match uniform pitch
        this.drawWeave(canvas, buildWeave({
          threading: [1, 2, 1, 2],
          treadling: [1, 2, 1, 2],
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
          threading: [1, 2, 3, 4],
          treadling: [1, 2, 3, 4],
          tieup: [
            [true, true, true, false],
            [false, true, true, true],
            [true, false, true, true],
            [true, true, false, true],
          ],
          warpColors: [warpColor],
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
          warpColors: [warpColor],
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
        // broken twill reduced from 8×8 to 4×4 to match uniform pitch;
        // weft halves preserve the original color/gap split across the cell
        this.drawWeave(canvas, buildWeave({
          threading: [1, 2, 3, 4],
          treadling: [1, 2, 3, 4],
          tieup: [
            [false, false, true, true],
            [false, true, true, false],
            [true, true, false, false],
            [true, false, false, true],
          ],
          warpColors: [warpColor],
          weftColors: [this.color, this.color, gap, gap],
        }))
        break

      default:
        // 1-shaft treadling [1,2,…] → horizontal bands in drawdown.
        // Threading [1,1,1,1] keeps the all-up/all-down behaviour but at the shared 4-warp pitch.
        // Halftone direction is now per-fill (warp=tb, weft=lr), so no override needed here.
        this.drawWeave(canvas, buildWeave({
          threading: [1, 1, 1, 1],
          treadling: [1, 2, 1, 2],
          tieup: [
            [true],
            [false],
          ],
          warpColors: [warpColor],
          weftColors: [gap],
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