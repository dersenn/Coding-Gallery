import { Grid, GridCell } from '~/types/project'

const LOOP_BY_CANVAS = new WeakMap()

function getSettings(controls) {
  return {
    cols: Math.floor(controls?.noise_anim_cols ?? 64),
    rows: Math.floor(controls?.noise_anim_rows ?? 64),
    noiseScale: controls?.noise_anim_scale ?? 0.065,
    timeScale: controls?.noise_anim_time_scale ?? 0.0006,
    warpScale: controls?.noise_anim_warp ?? 0.18,
    contrast: controls?.noise_anim_contrast ?? 1
  }
}

class NoiseCell extends GridCell {
  sampleNormalized(settings, time) {
    const { utils } = this.grid
    // Domain-warped fBm so blobs change topology (split/merge), not just drift.
    const baseX = this.col * settings.noiseScale
    const baseY = this.row * settings.noiseScale
    const warpX = utils.noise.simplex2D(baseX * 0.7 - time * 0.8, baseY * 0.7 + time * 0.6) * settings.warpScale
    const warpY = utils.noise.simplex2D(baseX * 0.7 + 23.1 + time * 0.5, baseY * 0.7 - 11.7 - time * 0.7) * settings.warpScale
    const x = baseX + warpX
    const y = baseY + warpY
    const n0 = utils.noise.simplex2D(x * 0.9 + time * 0.2, y * 0.9 - time * 0.15)
    const n1 = utils.noise.simplex2D(x * 1.8 - time * 0.35, y * 1.8 + time * 0.25)
    const n2 = utils.noise.simplex2D(x * 3.2 + time * 0.5, y * 3.2 - time * 0.4)
    const n = n0 * 0.62 + n1 * 0.28 + n2 * 0.1
    return utils.math.clamp((n + 1) * 0.5, 0, 1) ** settings.contrast
  }

  draw(canvas, settings, time, theme) {
    const { utils } = this.grid
    const normalized = this.sampleNormalized(settings, time)
    const colorIndex = utils.math.clamp(
      Math.floor(normalized * theme.palette.length),
      0,
      theme.palette.length - 1
    )
    let fill = theme.palette[colorIndex]
    canvas.rect(this.tl(), this.width, this.height, fill, 'transparent', 0)
  }
}

class NoiseFieldGrid extends Grid {
  createCell(config) {
    return new NoiseCell(config)
  }
}

function createNoiseGrid(canvas, settings, utils) {
  return new NoiseFieldGrid({
    cols: settings.cols,
    rows: settings.rows,
    width: canvas.w,
    height: canvas.h,
    cellSizing: 'stretch',
    utils
  })
}

/**
 * Minimal animated canvas playground layer:
 * starts one RAF loop per mounted canvas and stops automatically on unmount.
 */
export function draw(context) {
  const { canvas, theme, utils, controls } = context
  if (!canvas) return
  if (LOOP_BY_CANVAS.has(canvas.el)) return

  let running = true
  let grid = null
  let gridSignature = ''

  // Rebuild grid only when dimensions or row/col topology change.
  const resolveGrid = (settings) => {
    const nextSignature = `${canvas.w}x${canvas.h}:${settings.cols}x${settings.rows}`
    if (!grid || gridSignature !== nextSignature) {
      grid = createNoiseGrid(canvas, settings, utils)
      gridSignature = nextSignature
    }
    return grid
  }

  const tick = (now) => {
    if (!running) return
    if (!canvas.el.isConnected) {
      running = false
      LOOP_BY_CANVAS.delete(canvas.el)
      return
    }

    const settings = getSettings(controls)
    const time = now * settings.timeScale
    const activeGrid = resolveGrid(settings)

    canvas.background(theme.background)
    activeGrid.forEach((cell) => {
      // Noise is dynamic per frame; grid topology is reused until signature changes.
      cell.draw(canvas, settings, time, theme)
    })

    requestAnimationFrame(tick)
  }

  LOOP_BY_CANVAS.set(canvas.el, true)
  requestAnimationFrame(tick)
}
