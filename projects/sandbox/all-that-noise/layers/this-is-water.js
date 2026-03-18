import { Grid, GridCell } from '~/types/project'

const LOOP_BY_CANVAS = new WeakMap()

function getSettings(controls) {
  return {
    cols: Math.floor(controls?.noise_anim_cols ?? 64),
    rows: Math.floor(controls?.noise_anim_rows ?? 64),
    noiseScale: controls?.noise_anim_scale ?? 0.065,
    timeScale: controls?.noise_anim_time_scale ?? 0.0006,
    warpScale: controls?.noise_anim_warp ?? 0.18,
    contrast: controls?.noise_anim_contrast ?? 1,
    useOsc: controls?.use_osc ?? true,
    useContrastOsc: controls?.use_contrast_osc ?? true
  }
}

class NoiseCell extends GridCell {
  constructor(config) {
    super(config)
    this.isfoam = false
    this.isshadow = false
    this.foamLife = 0
    this.shadowLife = 0
  }

  updateBandState(value, state, cfg) {
    const inEnter = cfg.enterMin < value && value < cfg.enterMax
    const inExit = cfg.exitMin < value && value < cfg.exitMax
    // Hysteresis: once on, use wider exit band
    const nextOn = state ? inExit : inEnter
    // Temporal persistence
    const rise = cfg.rise ?? 0.2
    const fall = cfg.fall ?? 0.06
    const life = state ? 0 : 0 // placeholder to show signature usage
    return { nextOn, rise, fall }
  }

  sampleNormalized(settings, time, {offX = 0, offY = 0}) {
    const { utils } = this.grid
    // Domain-warped fBm so blobs change topology (split/merge), not just drift.
    const baseX = (this.col + offX) * settings.noiseScale
    const baseY = (this.row + offY) * settings.noiseScale

    const wave = Math.sin(time * 1.8 + this.row * 0.12 + this.col * 0.08)
    const osc = settings.useOsc ? wave * 0.12 : 0

    const warpX = utils.noise.simplex2D(baseX * 0.7 - time * 0.8, baseY * 0.7 + time * 0.6) * settings.warpScale
    const warpY = utils.noise.simplex2D(baseX * 0.7 + 23.1 + time * 0.5, baseY * 0.7 - 11.7 - time * 0.7) * settings.warpScale

    const x = baseX + warpX + osc
    const y = baseY + warpY - osc * 0.7
    const n0 = utils.noise.simplex2D(x * 0.9 + time * 0.2, y * 0.9 - time * 0.15)
    const n1 = utils.noise.simplex2D(x * 1.8 - time * 0.35, y * 1.8 + time * 0.25)
    const n2 = utils.noise.simplex2D(x * 3.2 + time * 0.5, y * 3.2 - time * 0.4)
    const n = n0 * 0.62 + n1 * 0.28 + n2 * 0.1

    const normalized = utils.math.clamp((n + 1) * 0.5, 0, 1)
    const contrast = settings.useContrastOsc
      ? utils.math.clamp(settings.contrast + Math.sin(time * 1.2) * 0.2, 0.4, 3)
      : settings.contrast

    return normalized ** contrast
  }

  draw(canvas, settings, time, theme) {
    const { utils } = this.grid
    const foamN = this.sampleNormalized(settings, time, { offX: 0, offY: 0 })
    const shadowN = this.sampleNormalized(settings, time, { offX: 8, offY: -8 })

    // Hysteresis thresholds
    const foamEnter = foamN > 0.60 && foamN < 0.63
    const foamExit = foamN > 0.53 && foamN < 0.67
    const shadowEnter = shadowN > 0.45 && shadowN < 0.58
    const shadowExit = shadowN > 0.42 && shadowN < 0.61

    this.isfoam = this.isfoam ? foamExit : foamEnter
    this.isshadow = this.isshadow ? shadowExit : shadowEnter

    // Life smoothing
    this.foamLife = this.isfoam
      ? Math.min(1, this.foamLife + 0.22)
      : Math.max(0, this.foamLife - 0.05)

    this.shadowLife = this.isshadow
      ? Math.min(1, this.shadowLife + 0.16)
      : Math.max(0, this.shadowLife - 0.04)

    // Render thresholds
    const showFoam = this.foamLife > 0.35
    const showShadow = this.shadowLife > 0.3

    let fill = theme.palette[2]
    if (showShadow) fill = theme.black
    if (showFoam) fill = theme.white

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
