import { Grid } from '~/types/project'

/**
 * Grid Almighty sketch skeleton:
 * keep the grid/cell runtime structure, but draw only a simple circle per cell.
 */
export function draw(context) {
  const { canvas, frame, theme, utils, controls } = context
  if (!canvas) return

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

  const grid = new Grid({
    cols: 8,
    rows: 8,
    width: frame.width,
    height: frame.height,
    x: frame.x,
    y: frame.y,
    cellSizing,
    fit,
    shortSideDivisions,
    utils
  })
  const noise = {
    noiseScale,
    stretchX,
    stretchY,
    amplitude,
    octaves,
    lacunarity,
    persistence
  }
  const zoneIndexMap = buildZoneIndexMap(grid, zones, noise, utils)
  const zoneStates = buildZoneStates({ rows: grid.rows, cols: grid.cols, zones, utils })

  canvas.background(theme.background)
  for (const cell of grid.cells) {
    const fill = resolveFillColor({
      row: cell.row,
      col: cell.col,
      zoneIndexMap,
      zoneStates,
      zones,
      fallbackFill: theme.foreground
    })
    if (!fill) continue
    canvas.rect(cell.tl(), cell.width, cell.height, fill, 'transparent', 0)
  }
}

function buildZoneStates({ rows, cols, zones, utils }) {
  if (!Array.isArray(zones) || zones.length === 0) return []

  return zones.map((zone) => {
    const states = Array.from({ length: rows }, () => Array(cols).fill(false))
    for (let col = 0; col < cols; col++) {
      states[0][col] = utils.seed.coinToss(50)
    }

    for (let row = 1; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const left = col > 0 ? states[row - 1][col - 1] : false
        const center = states[row - 1][col]
        const right = col < cols - 1 ? states[row - 1][col + 1] : false
        states[row][col] = applyWolframRule(zone.ruleBits, left, center, right)
      }
    }
    return states
  })
}

function buildZoneIndexMap(grid, zones, noise, utils) {
  const zoneCount = Array.isArray(zones) ? zones.length : 0
  if (zoneCount <= 0) {
    return Array.from({ length: grid.rows }, () => Array(grid.cols).fill(-1))
  }

  const map = Array.from({ length: grid.rows }, () => Array(grid.cols).fill(0))
  for (let row = 0; row < grid.rows; row++) {
    for (let col = 0; col < grid.cols; col++) {
      const normalizedNoise = normalizeNoiseValue(
        resolveNoiseValueForCell({ noise, utils }, row, col),
        utils
      )
      map[row][col] = resolveZoneIndexFromNoise(normalizedNoise, zoneCount, utils)
    }
  }
  return map
}

function resolveFillColor({ row, col, zoneIndexMap, zoneStates, zones, fallbackFill }) {
  if (!Array.isArray(zones) || zones.length === 0) return null
  const zoneIndex = zoneIndexMap?.[row]?.[col]
  if (typeof zoneIndex !== 'number' || zoneIndex < 0) return null
  const zone = zones[zoneIndex]
  if (!zone) return null
  const isActive = zoneStates?.[zoneIndex]?.[row]?.[col]
  if (!isActive) return null
  return zone.color ?? fallbackFill
}

function createZones(palette, utils, controls, foregroundColor) {
  // Extend this list to add more noise zones.
  const baseRules = chooseRuleSet(utils, controls)
  const shuffledRules = utils.array.shuffle(baseRules)
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

  const randomInt = utils.seed.randomInt

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

function parseRuleBits(rule) {
  const text = String(rule).trim()
  if (!/^[01]{8}$/.test(text)) return null
  return Array.from(text, (digit) => digit === '1')
}

function resolveNoiseValueForCell({ noise, utils }, row, col) {
  const baseScale = Math.max(0.001, noise.noiseScale)
  let currentFreqX = (1 / baseScale) * Math.max(0.001, noise.stretchX)
  let currentFreqY = (1 / baseScale) * Math.max(0.001, noise.stretchY)
  let currentAmp = 1.0
  let total = 0
  let maxValue = 0

  for (let i = 0; i < noise.octaves; i++) {
    total += utils.noise.simplex2D(col * currentFreqX, row * currentFreqY) * currentAmp
    maxValue += currentAmp
    currentFreqX *= noise.lacunarity
    currentFreqY *= noise.lacunarity
    currentAmp *= noise.persistence
  }

  const raw = maxValue > 0 ? (total / maxValue) * noise.amplitude : 0
  return utils.math.clamp(raw, -1, 1)
}

function normalizeNoiseValue(value, utils) {
  return utils.math.clamp((value + 1) / 2, 0, 1)
}

function applyWolframRule(ruleBits, topLeft, top, topRight) {
  // Wolfram neighborhood order is 111, 110, 101, 100, 011, 010, 001, 000.
  const pattern = (toBit(topLeft) << 2) | (toBit(top) << 1) | toBit(topRight)
  return ruleBits[7 - pattern]
}

function resolveZoneIndexFromNoise(normalizedNoise, zoneCount, utils) {
  const safeCount = Math.max(1, zoneCount)
  return Math.min(Math.floor(utils.math.clamp(normalizedNoise, 0, 1) * safeCount), safeCount - 1)
}

function toBit(value) {
  return value ? 1 : 0
}
