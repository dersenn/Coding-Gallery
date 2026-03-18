import { Grid, GridCell } from '~/types/project'

const LOOP_BY_CANVAS = new WeakMap()

function getSettings(controls) {
  return {
    cols: 1,
    rows: 1,
    shortSideDivisions: Math.floor(controls?.water_short_side_divisions ?? 90),
    noiseScale: controls?.noise_anim_scale ?? 0.065,
    timeScale: controls?.noise_anim_time_scale ?? 0.0006,
    warpScale: controls?.noise_anim_warp ?? 0.18,
    contrast: controls?.noise_anim_contrast ?? 1,
    useOsc: controls?.use_osc ?? true,
    useContrastOsc: controls?.use_contrast_osc ?? true,
    foamMin: controls?.foam_min ?? 0.6,
    foamMax: controls?.foam_max ?? 0.63,
    foamBandPad: controls?.foam_band_pad ?? 0.07,
    foamRise: controls?.foam_rise ?? 0.22,
    foamFall: controls?.foam_fall ?? 0.05,
    foamShow: controls?.foam_show ?? 0.35,
    shadowOffsetX: controls?.shadow_offset_x ?? 8,
    shadowOffsetY: controls?.shadow_offset_y ?? -8,
    shadowLinked: controls?.shadow_linked ?? true,
    shadowLinkedMinOffset: controls?.shadow_linked_min_offset ?? -0.15,
    shadowLinkedMaxOffset: controls?.shadow_linked_max_offset ?? -0.05,
    shadowLinkedPadBoost: controls?.shadow_linked_pad_boost ?? 0.03,
    shadowMin: controls?.shadow_min ?? 0.45,
    shadowMax: controls?.shadow_max ?? 0.58,
    shadowBandPad: controls?.shadow_band_pad ?? 0.08,
    shadowRise: controls?.shadow_rise ?? 0.16,
    shadowFall: controls?.shadow_fall ?? 0.04,
    shadowShow: controls?.shadow_show ?? 0.3
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

  updateBandState(value, state, life, cfg) {
    const inEnter = cfg.enterMin < value && value < cfg.enterMax
    const inExit = cfg.exitMin < value && value < cfg.exitMax
    // Hysteresis: once on, use wider exit band
    const isOn = state ? inExit : inEnter
    // Temporal persistence
    const rise = cfg.rise ?? 0.2
    const fall = cfg.fall ?? 0.06
    const nextLife = isOn
      ? Math.min(1, life + rise)
      : Math.max(0, life - fall)
    return { isOn, life: nextLife }
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
    const foamN = this.sampleNormalized(settings, time, { offX: 0, offY: 0 })
    const shadowN = this.sampleNormalized(settings, time, {
      offX: settings.shadowOffsetX,
      offY: settings.shadowOffsetY
    })

    const foamCfg = {
      enterMin: settings.foamMin,
      enterMax: settings.foamMax,
      exitMin: settings.foamMin - settings.foamBandPad,
      exitMax: settings.foamMax + settings.foamBandPad,
      rise: settings.foamRise,
      fall: settings.foamFall
    }
    const linkedShadowCfg = {
      enterMin: settings.foamMin + settings.shadowLinkedMinOffset,
      enterMax: settings.foamMax + settings.shadowLinkedMaxOffset,
      exitMin: settings.foamMin + settings.shadowLinkedMinOffset - (settings.foamBandPad + settings.shadowLinkedPadBoost),
      exitMax: settings.foamMax + settings.shadowLinkedMaxOffset + (settings.foamBandPad + settings.shadowLinkedPadBoost),
      rise: settings.foamRise * 0.75,
      fall: settings.foamFall * 0.8
    }
    const customShadowCfg = {
      enterMin: settings.shadowMin,
      enterMax: settings.shadowMax,
      exitMin: settings.shadowMin - settings.shadowBandPad,
      exitMax: settings.shadowMax + settings.shadowBandPad,
      rise: settings.shadowRise,
      fall: settings.shadowFall
    }
    const shadowCfg = settings.shadowLinked ? linkedShadowCfg : customShadowCfg

    const nextFoam = this.updateBandState(foamN, this.isfoam, this.foamLife, foamCfg)
    const nextShadow = this.updateBandState(shadowN, this.isshadow, this.shadowLife, shadowCfg)
    this.isfoam = nextFoam.isOn
    this.foamLife = nextFoam.life
    this.isshadow = nextShadow.isOn
    this.shadowLife = nextShadow.life

    const showFoam = this.foamLife > settings.foamShow
    const showShadow = this.shadowLife > (settings.shadowLinked ? Math.max(0.05, settings.foamShow - 0.05) : settings.shadowShow)

    let fill = theme.palette[4]
    if (showShadow) fill = theme.palette[2]
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
    cellSizing: 'squareByShortSide',
    shortSideDivisions: settings.shortSideDivisions,
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
    const nextSignature = `${canvas.w}x${canvas.h}:${settings.shortSideDivisions}`
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
