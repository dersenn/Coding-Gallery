import { Grid, GridCell } from '~/types/project'
import { Color } from '~/utils/color'

class MyGrid extends Grid {
  createCell(config) {
    return new MyCell(config)
  }
}

class MyCell extends GridCell {
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
    const isOn = state ? inExit : inEnter
    const nextLife = isOn
      ? Math.min(1, life + (cfg.rise ?? 0.2))
      : Math.max(0, life - (cfg.fall ?? 0.06))
    return { isOn, life: nextLife }
  }

  sampleNormalized(s, time, { offX = 0, offY = 0 }) {
    const { utils } = this.grid
    const shortSide = Math.max(1, Math.min(this.grid.width, this.grid.height))
    const unit = shortSide / Math.max(1, s.sampleReferenceDivisions)
    const sampleCol = (this.x + this.width * 0.5 - this.grid.x) / unit
    const sampleRow = (this.y + this.height * 0.5 - this.grid.y) / unit

    const baseX = (sampleCol + offX) * s.noiseScale
    const baseY = (sampleRow + offY) * s.noiseScale

    const phi1 = time * 1.8 + sampleRow * 0.12 + sampleCol * 0.08
    const phi2 = time * 1.15 + sampleRow * 0.07 - sampleCol * 0.11

    const oscX = s.useOsc ? (-Math.sin(phi1) * 0.10 + -Math.sin(phi2) * 0.06) : 0
    const oscY = s.useOsc ? (Math.cos(phi1) * 0.07 + Math.cos(phi2) * 0.04) : 0

    const warpX = utils.noise.simplex2D(baseX * 0.7 - time * 0.8, baseY * 0.7 + time * 0.6) * s.warpScale
    const warpY = utils.noise.simplex2D(baseX * 0.7 + 23.1 + time * 0.5, baseY * 0.7 - 11.7 - time * 0.7) * s.warpScale

    const x = baseX + warpX + oscX
    const y = baseY + warpY + oscY

    const n0 = utils.noise.simplex2D(x * 0.9 + time * 0.2, y * 0.9 - time * 0.15)
    const n1 = utils.noise.simplex2D(x * 1.8 - time * 0.35, y * 1.8 + time * 0.25)
    const n2 = utils.noise.simplex2D(x * 3.2 + time * 0.5, y * 3.2 - time * 0.4)
    const normalized = utils.math.clamp(((n0 * 0.62 + n1 * 0.28 + n2 * 0.1) + 1) * 0.5, 0, 1)

    const contrast = s.useContrastOsc
      ? utils.math.clamp(s.contrast + Math.sin(time * 1.2) * 0.2, 0.4, 3)
      : s.contrast

    return normalized ** contrast
  }

  draw(canvas, s, time) {
    const foamN = this.sampleNormalized(s, time, { offX: 0, offY: 0 })
    const shadowN = this.sampleNormalized(s, time, { offX: s.shadowOffsetX, offY: s.shadowOffsetY })

    const clrs = s.palette[s.type]

    const foamCfg = {
      enterMin: s.foamMin, enterMax: s.foamMax,
      exitMin: s.foamMin - s.foamBandPad, exitMax: s.foamMax + s.foamBandPad,
      rise: s.foamRise, fall: s.foamFall
    }
    const shadowCfg = s.shadowLinked ? {
      enterMin: s.foamMin + s.shadowLinkedMinOffset,
      enterMax: s.foamMax + s.shadowLinkedMaxOffset,
      exitMin: s.foamMin + s.shadowLinkedMinOffset - (s.foamBandPad + s.shadowLinkedPadBoost),
      exitMax: s.foamMax + s.shadowLinkedMaxOffset + (s.foamBandPad + s.shadowLinkedPadBoost),
      rise: s.foamRise * 0.75, fall: s.foamFall * 0.8
    } : {
      enterMin: s.shadowMin, enterMax: s.shadowMax,
      exitMin: s.shadowMin - s.shadowBandPad, exitMax: s.shadowMax + s.shadowBandPad,
      rise: s.shadowRise, fall: s.shadowFall
    }

    const nextFoam = this.updateBandState(foamN, this.isfoam, this.foamLife, foamCfg)
    const nextShadow = this.updateBandState(shadowN, this.isshadow, this.shadowLife, shadowCfg)
    this.isfoam = nextFoam.isOn
    this.foamLife = nextFoam.life
    this.isshadow = nextShadow.isOn
    this.shadowLife = nextShadow.life

    const showFoam = this.foamLife > s.foamShow
    const showShadow = this.shadowLife > (s.shadowLinked ? Math.max(0.05, s.foamShow - 0.05) : s.shadowShow)

    let fill = 'transparent'
    if (showShadow) fill = Color.parse(clrs.shadow)?.withAlpha(clrs.shadowAlpha).toRgbaString() ?? 'rgba(0,0,0,0.3)'
    if (showFoam) fill = Color.parse(clrs.foam)?.toRgbaString() ?? 'rgba(255,255,255,1)'

    canvas.rect(this.tl(), this.width, this.height, fill, 'transparent', 0)
  }
}

function getSettings(c, theme) {
  return {
    cols: 1,
    rows: 1,
    shortSideDivisions: Math.floor(c.water_short_side_divisions ?? 90),
    sampleReferenceDivisions: Math.floor(c.sample_reference_divisions ?? 90),
    noiseScale: c.noise_anim_scale ?? 0.065,
    timeScale: c.noise_anim_time_scale ?? 0.0006,
    warpScale: c.noise_anim_warp ?? 0.18,
    contrast: c.noise_anim_contrast ?? 1,
    useOsc: c.use_osc ?? true,
    useContrastOsc: c.use_contrast_osc ?? true,
    foamMin: c.foam_min ?? 0.6,
    foamMax: c.foam_max ?? 0.63,
    foamBandPad: c.foam_band_pad ?? 0.07,
    foamRise: c.foam_rise ?? 0.22,
    foamFall: c.foam_fall ?? 0.05,
    foamShow: c.foam_show ?? 0.35,
    shadowOffsetX: c.shadow_offset_x ?? 8,
    shadowOffsetY: c.shadow_offset_y ?? -8,
    shadowLinked: c.shadow_linked ?? true,
    shadowLinkedMinOffset: c.shadow_linked_min_offset ?? -0.15,
    shadowLinkedMaxOffset: c.shadow_linked_max_offset ?? -0.05,
    shadowLinkedPadBoost: c.shadow_linked_pad_boost ?? 0.03,
    shadowMin: c.shadow_min ?? 0.45,
    shadowMax: c.shadow_max ?? 0.58,
    shadowBandPad: c.shadow_band_pad ?? 0.08,
    shadowRise: c.shadow_rise ?? 0.16,
    shadowFall: c.shadow_fall ?? 0.04,
    shadowShow: c.shadow_show ?? 0.3,
    type: c.water_type ?? 'sea',
    palette: {
      pool: { water: theme.palette[4], shadow: theme.palette[2], foam: theme.white, shadowAlpha: 0.3 },
      sea: { water: theme.palette[2], shadow: theme.black, foam: theme.white, shadowAlpha: 0.6 },
      poison: { water: Color.parse(theme.foreground).withAlpha(0.9).toRgbaString(), shadow: theme.black, foam: Color.parse(theme.white).withAlpha(0.5).toRgbaString(), shadowAlpha: 0.6 }
    }
  }
}

export function draw({ canvas, theme, utils, controls: c, runtime }) {
  if (!canvas) return

  let grid = null
  let gridSignature = ''

  runtime.loop(({ elapsed }) => {
    const s = getSettings(c, theme)

    const nextSignature = `${canvas.w}x${canvas.h}:${s.shortSideDivisions}`
    if (!grid || gridSignature !== nextSignature) {
      grid = new MyGrid({
        cols: s.cols,
        rows: s.rows,
        width: canvas.w,
        height: canvas.h,
        cellSizing: 'squareByShortSide',
        shortSideDivisions: s.shortSideDivisions,
        utils
      })
      gridSignature = nextSignature
    }

    const time = elapsed * s.timeScale
    canvas.background(Color.parse(s.palette[s.type].water)?.toRgbaString() ?? 'rgba(255,255,255,1)')
    grid.forEach(cell => cell.draw(canvas, s, time))
  })
}