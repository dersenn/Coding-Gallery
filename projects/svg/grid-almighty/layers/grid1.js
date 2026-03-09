import { Grid, GridCell } from '~/types/project'

/**
 * Grid Almighty layer skeleton:
 * keep the grid/cell runtime structure, but draw only a simple circle per cell.
 */
export function drawGridCore(context) {
  const { svg, frame, theme, utils, controls, v } = context

  const rows = 8
  const cols = rows
  const cellSizing = 'squareByShortSide'
  const fit = 'stretch'
  const shortSideDivisions = typeof controls?.grid_short_side_divisions === 'number'
    ? controls.grid_short_side_divisions
    : 60
  const noiseScale = typeof controls?.noiseScale === 'number' ? controls.noiseScale : 60
  const stretchX = typeof controls?.stretchX === 'number' ? controls.stretchX : 1.2
  const stretchY = typeof controls?.stretchY === 'number' ? controls.stretchY : 0.75
  const amplitude = typeof controls?.amplitude === 'number' ? controls.amplitude : 1.5
  const octaves = typeof controls?.octaves === 'number' ? controls.octaves : 1
  const lacunarity = typeof controls?.lacunarity === 'number' ? controls.lacunarity : 2.4
  const persistence = typeof controls?.persistence === 'number' ? controls.persistence : 0.9
  const palette = Array.isArray(theme.palette) && theme.palette.length > 0
    ? theme.palette
    : [theme.foreground]
  const zones = createZones(palette, utils, controls, theme.foreground)

  svg.rect(v(frame.x, frame.y), frame.width, frame.height, theme.background, 'none', 0)

  const grid = new GridCoreGrid({
    cols,
    rows,
    width: frame.width,
    height: frame.height,
    x: frame.x,
    y: frame.y,
    cellSizing,
    fit,
    shortSideDivisions,
    utils
  }).init({
    svg,
    fallbackFill: theme.foreground,
    zones,
    noise: {
      noiseScale,
      stretchX,
      stretchY,
      amplitude,
      octaves,
      lacunarity,
      persistence
    }
  })

  grid.forEach((cell) => cell.draw())
}

class GridCoreGrid extends Grid {
  init(runtime) {
    this.svg = runtime.svg
    this.fallbackFill = runtime.fallbackFill
    this.zones = runtime.zones
    this.noise = runtime.noise
    this.zoneIndexMap = this.buildZoneIndexMap()
    this.zoneStates = this.buildZoneStates()
    return this
  }

  createCell(config) {
    return new GridCoreCell(config)
  }

  buildZoneStates() {
    if (!Array.isArray(this.zones) || this.zones.length === 0) return []

    return this.zones.map((zone, zoneIndex) => {
      const states = Array.from({ length: this.rows }, () => Array(this.cols).fill(false))
      for (let col = 0; col < this.cols; col++) {
        states[0][col] = this.randomSeedBit()
      }

      for (let row = 1; row < this.rows; row++) {
        for (let col = 0; col < this.cols; col++) {
          const left = col > 0 ? states[row - 1][col - 1] : false
          const center = states[row - 1][col]
          const right = col < this.cols - 1 ? states[row - 1][col + 1] : false
          states[row][col] = applyWolframRule(zone.ruleBits, left, center, right)
        }
      }
      return states
    })
  }

  randomSeedBit() {
    const coinToss = this.utils?.seed?.coinToss
    if (typeof coinToss === 'function') {
      return coinToss(50)
    }
    return Math.random() >= 0.5
  }

  buildZoneIndexMap() {
    const zoneCount = Array.isArray(this.zones) ? this.zones.length : 0
    if (zoneCount <= 0) {
      return Array.from({ length: this.rows }, () => Array(this.cols).fill(-1))
    }

    const map = Array.from({ length: this.rows }, () => Array(this.cols).fill(0))
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const normalizedNoise = normalizeNoiseValue(resolveNoiseValueForCell(this, row, col))
        map[row][col] = resolveZoneIndexFromNoise(normalizedNoise, zoneCount)
      }
    }
    return map
  }
}

class GridCoreCell extends GridCell {
  draw() {
    const fill = this.resolveFillColor()
    if (!fill) return
    this.grid.svg.rect(this.tl(), this.width, this.height, fill, 'none', 0)
  }

  resolveFillColor() {
    const zones = this.grid.zones
    if (!Array.isArray(zones) || zones.length === 0) {
      return null
    }

    const zoneIndex = this.grid.zoneIndexMap?.[this.row]?.[this.col]
    if (typeof zoneIndex !== 'number' || zoneIndex < 0) return null
    const zone = zones[zoneIndex]
    if (!zone) return null
    const isActive = this.grid.zoneStates?.[zoneIndex]?.[this.row]?.[this.col]
    if (!isActive) return null
    return zone.color ?? this.grid.fallbackFill
  }
}

function createZones(palette, utils, controls, foregroundColor) {
  // Extend this list to add more noise zones.
  const baseRules = chooseRuleSet(utils, controls)
  const shuffledRules = shuffleRules(baseRules, utils)
  const singleColor = controls?.rule_single_color === true
  const c0 = singleColor ? foregroundColor : palette[0]
  const c1 = singleColor ? foregroundColor : (palette[1] ?? palette[0])
  const c2 = singleColor
    ? foregroundColor
    : (palette[2] ?? palette[palette.length - 1] ?? palette[0])
  const zoneConfig = [
    { color: c0, rule: shuffledRules[0] },
    { color: c1, rule: shuffledRules[1] ?? baseRules[1] },
    { color: c2, rule: shuffledRules[2] ?? baseRules[2] }
  ]

  const zones = []
  for (const zone of zoneConfig) {
    const ruleBits = parseRuleBits(zone.rule)
    if (!ruleBits) continue
    zones.push({ color: zone.color, ruleBits })
  }

  return zones
}

function chooseRuleSet(utils, controls) {
  // Curated to avoid mostly uniform diagonal/horizontal outcomes.
  const presets = {
    balanced: ['00110110', '01011100', '01001110'], // 54, 92, 78
    chaotic: ['00011110', '01101110', '01111010'], // 30, 110, 122
    dense: ['01111110', '01111100', '01011110'], // 126, 124, 94
    sparse: ['01011010', '00111100', '00011110'] // 90, 60, 30
  }
  const presetKey = normalizePresetKey(controls?.rule_preset)
  if (presetKey !== 'auto') {
    const selected = presets[presetKey] ?? presets.balanced
    if (controls?.rule_single_mode === true) {
      return [selected[0], selected[0], selected[0]]
    }
    return selected
  }

  const autoRuleSets = [
    presets.balanced,
    presets.chaotic,
    presets.dense,
    presets.sparse
  ]

  const randomInt = utils?.seed?.randomInt
  if (typeof randomInt !== 'function') {
    const fallback = presets.balanced
    if (controls?.rule_single_mode === true) {
      return [fallback[0], fallback[0], fallback[0]]
    }
    return fallback
  }

  const index = randomInt(0, autoRuleSets.length - 1)
  const selected = autoRuleSets[index] ?? presets.balanced
  if (controls?.rule_single_mode === true) {
    const singleIndex = randomInt(0, selected.length - 1)
    const singleRule = selected[singleIndex] ?? selected[0]
    return [singleRule, singleRule, singleRule]
  }
  return selected
}

function normalizePresetKey(value) {
  if (value === 'balanced') return value
  if (value === 'chaotic') return value
  if (value === 'dense') return value
  if (value === 'sparse') return value
  return 'auto'
}

function shuffleRules(rules, utils) {
  const shuffled = [...rules]
  const randomInt = utils?.seed?.randomInt
  if (typeof randomInt !== 'function') return shuffled

  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = randomInt(0, i)
    const temp = shuffled[i]
    shuffled[i] = shuffled[j]
    shuffled[j] = temp
  }

  return shuffled
}

function parseRuleBits(rule) {
  const text = String(rule).trim()
  if (!/^[01]{8}$/.test(text)) return null
  return Array.from(text, (digit) => digit === '1')
}

function resolveNoiseValueForCell(grid, row, col) {
  const noise = grid.noise
  const baseScale = Math.max(0.001, noise.noiseScale)
  let currentFreqX = (1 / baseScale) * Math.max(0.001, noise.stretchX)
  let currentFreqY = (1 / baseScale) * Math.max(0.001, noise.stretchY)
  let currentAmp = 1.0
  let total = 0
  let maxValue = 0

  for (let i = 0; i < noise.octaves; i++) {
    total += grid.utils.noise.simplex2D(col * currentFreqX, row * currentFreqY) * currentAmp
    maxValue += currentAmp
    currentFreqX *= noise.lacunarity
    currentFreqY *= noise.lacunarity
    currentAmp *= noise.persistence
  }

  const raw = maxValue > 0 ? (total / maxValue) * noise.amplitude : 0
  return clamp(raw, -1, 1)
}

function normalizeNoiseValue(value) {
  return clamp((value + 1) / 2, 0, 1)
}

function applyWolframRule(ruleBits, topLeft, top, topRight) {
  // Wolfram neighborhood order is 111, 110, 101, 100, 011, 010, 001, 000.
  const pattern = (toBit(topLeft) << 2) | (toBit(top) << 1) | toBit(topRight)
  return ruleBits[7 - pattern]
}

function resolveZoneIndexFromNoise(normalizedNoise, zoneCount) {
  const safeCount = Math.max(1, zoneCount)
  return Math.min(Math.floor(clamp(normalizedNoise, 0, 1) * safeCount), safeCount - 1)
}

function toBit(value) {
  return value ? 1 : 0
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}
