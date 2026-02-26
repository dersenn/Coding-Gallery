import type { ProjectContext, CleanupFunction, ProjectControlDefinition } from '~/types/project'
import { SVG, Grid, Cell, Color } from '~/types/project'
import {
  buildColorOptionLabels,
  buildPaletteMap,
  getPaletteByKey,
  normalizeColorList,
  resolveActiveColors,
  type PaletteColorInput
} from '~/utils/color'
import { shortcuts } from '~/utils/shortcuts'
import { syncControlState } from '~/composables/useControls'
import { defaultTheme } from '~/utils/theme'

const CUSTOM_PALETTE_STORAGE_KEY = 'pearlymats:customPalette'
const FALLBACK_CUSTOM_PALETTE = ['#fdf2f8', '#ddd6fe', '#bfdbfe']
const STANDARD_PALETTE_KEY = 'standard'
const CUSTOM_PALETTE_KEY = 'custom'
const BEAD_PALETTE: PaletteColorInput[] = [
  { code: 'P96', name: 'Cranapple', hex: '#801922' },
  { code: 'P05', name: 'Red', hex: '#F01820' },
  { code: 'P38', name: 'Magenta', hex: '#F22A7B' },
  { code: 'P83', name: 'Pink', hex: '#E44892' },
  { code: 'P79', name: 'Light Pink', hex: '#F6B3DD' },
  { code: 'P33', name: 'Peach', hex: '#EEBAB2' },
  { code: 'P04', name: 'Orange', hex: '#ED6120' },
  { code: 'P179', name: 'Evergreen', hex: '#114938' },
  { code: 'P10', name: 'Dark Green', hex: '#1C753E' },
  { code: 'P61', name: 'Kiwi Lime', hex: '#6CBE13' },
  { code: 'P53', name: 'Pastel Green', hex: '#76C882' },
  { code: 'P97', name: 'Prickly Pear', hex: '#BDDA01' },
  { code: 'P03', name: 'Yellow', hex: '#ECD800' },
  { code: 'P57', name: 'Cheddar', hex: '#F1AA0C' },
  { code: 'P08', name: 'Dark Blue', hex: '#2B3F87' },
  { code: 'P09', name: 'Light Blue', hex: '#3370C0' },
  { code: 'P58', name: 'Toothpaste', hex: '#93C8D4' },
  { code: 'P62', name: 'Turquoise', hex: '#2B89C6' },
  { code: 'P81', name: 'Light Gray', hex: '#EEE3CF' },
  { code: 'P01', name: 'White', hex: '#F1F1F1' },
  { code: 'P02', name: 'Cream', hex: '#E0DEA9' },
  { code: 'P18', name: 'Black', hex: '#2E2F32' },
  { code: 'P92', name: 'Dark Grey', hex: '#4D5156' },
  { code: 'P17', name: 'Grey', hex: '#8A8D91' },
  { code: 'P21', name: 'Light Brown', hex: '#815D34' },
  { code: 'P12', name: 'Brown', hex: '#513931' },
  { code: 'P54', name: 'Pastel Lavender', hex: '#8A72C1' },
  { code: 'P07', name: 'Purple', hex: '#604089' }
]
const NAMED_PALETTES: Record<string, PaletteColorInput[]> = {
  pearl: ['#fdf2f8', '#ddd6fe', '#bfdbfe', '#a7f3d0', '#f5d0fe', '#fde68a'],
  neon: ['#ff006e', '#8338ec', '#3a86ff', '#00f5d4', '#ffbe0b', '#fb5607'],
  earth: ['#6b4226', '#a98467', '#d5bdaf', '#9c6644', '#7f5539', '#b08968'],
  beads: BEAD_PALETTE
}
const BUILTIN_PALETTE_SWATCHES_BY_PRESET: Record<string, string[]> = {
  [STANDARD_PALETTE_KEY]: normalizeColorList(defaultTheme.palette),
  ...Object.fromEntries(
    Object.entries(NAMED_PALETTES).map(([key, palette]) => [key, normalizeColorList(palette)])
  )
}
const BUILTIN_PALETTE_LABELS_BY_PRESET: Record<string, string[]> = {
  [STANDARD_PALETTE_KEY]: buildColorOptionLabels(defaultTheme.palette),
  ...Object.fromEntries(
    Object.entries(NAMED_PALETTES).map(([key, palette]) => [key, buildColorOptionLabels(palette)])
  )
}
const PALETTE_PRESET_OPTIONS = [
  { label: 'Standard', value: STANDARD_PALETTE_KEY },
  { label: 'Pearl', value: 'pearl' },
  { label: 'Neon', value: 'neon' },
  { label: 'Earth', value: 'earth' },
  { label: 'Beads', value: 'beads' },
  { label: 'Custom', value: CUSTOM_PALETTE_KEY }
]
const PALETTE_VISIBLE_COUNT_BY_PRESET: Record<string, number> = {
  [STANDARD_PALETTE_KEY]: BUILTIN_PALETTE_SWATCHES_BY_PRESET[STANDARD_PALETTE_KEY]!.length,
  pearl: BUILTIN_PALETTE_SWATCHES_BY_PRESET.pearl!.length,
  neon: BUILTIN_PALETTE_SWATCHES_BY_PRESET.neon!.length,
  earth: BUILTIN_PALETTE_SWATCHES_BY_PRESET.earth!.length,
  beads: BUILTIN_PALETTE_SWATCHES_BY_PRESET.beads!.length,
  [CUSTOM_PALETTE_KEY]: 0
}
const MAX_SELECTABLE_COLORS = Math.max(
  8,
  ...Object.values(PALETTE_VISIBLE_COUNT_BY_PRESET)
)
const readPersistedCustomPalette = (): string[] => {
  if (!import.meta.client) return [...FALLBACK_CUSTOM_PALETTE]
  try {
    const raw = localStorage.getItem(CUSTOM_PALETTE_STORAGE_KEY)
    if (!raw) return [...FALLBACK_CUSTOM_PALETTE]
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return [...FALLBACK_CUSTOM_PALETTE]
    return normalizeColorList(parsed.map((entry) => String(entry)), FALLBACK_CUSTOM_PALETTE)
  } catch {
    return [...FALLBACK_CUSTOM_PALETTE]
  }
}
const DEFAULT_CUSTOM_PALETTE = readPersistedCustomPalette()

const sendDebugLog = (
  payload: {
    runId: string
    hypothesisId: string
    location: string
    message: string
    data: Record<string, unknown>
  }
) => {
  if (!import.meta.client) return
  // #region agent log
  fetch('http://127.0.0.1:7244/ingest/b79eac65-0a84-4591-a7e4-76cc58bbc566',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'4a3b58'},body:JSON.stringify({sessionId:'4a3b58',...payload,timestamp:Date.now()})}).catch(()=>{})
  // #endregion
}

/**
 * Pearlymats - Noise-based Grid Pattern
 * 
 * A grid of circles with colors determined by multi-octave simplex noise.
 * 
 * Controls:
 * - Noise Scale: Overall noise zoom (higher = larger features)
 * - Stretch X/Y: Axis stretch for directional/striped patterns
 * - Amplitude: Overall noise intensity
 * - Octaves: Number of noise layers (1-4)
 * - Lacunarity: Frequency multiplier per octave (2.0 = each octave doubles frequency)
 * - Persistence: Amplitude multiplier per octave (0.5 = each octave halves amplitude)
 *
 * Grouping pattern for future sketches:
 * - Grid: layout, dimensions, overlays
 * - Noise: frequency/amplitude/octaves and related field settings
 * - Color: palette and quantization controls
 * - Motion: animation speed/phase/timing
 * - Display: debug and helper toggles
 * 
 */

// Export controls
export const controls: ProjectControlDefinition[] = [
  {
    type: 'group',
    id: 'color',
    label: 'Color',
    collapsible: true,
    defaultOpen: true,
    controls: [
      {
        type: 'select',
        label: 'Palette',
        key: 'palettePreset',
        default: STANDARD_PALETTE_KEY,
        options: PALETTE_PRESET_OPTIONS
      },
      {
        type: 'checkbox-group',
        label: 'Selectable Colors',
        key: 'selectedPaletteIndices',
        default: [0, 1, 2],
        visibleCountFromSelectKey: 'palettePreset',
        visibleCountBySelectValue: PALETTE_VISIBLE_COUNT_BY_PRESET,
        visibleCountFromKey: 'customPalette',
        optionLabelsBySelectValue: BUILTIN_PALETTE_LABELS_BY_PRESET,
        optionLabelsFromKeyBySelectValue: {
          [CUSTOM_PALETTE_KEY]: 'customPalette'
        },
        optionSwatchesBySelectValue: BUILTIN_PALETTE_SWATCHES_BY_PRESET,
        optionSwatchesFromKeyBySelectValue: {
          [CUSTOM_PALETTE_KEY]: 'customPalette'
        },
        options: Array.from({ length: MAX_SELECTABLE_COLORS }, (_, index) => ({
          label: '#000000',
          value: index
        }))
      },
      {
        type: 'color-list',
        label: 'Custom Palette',
        key: 'customPalette',
        default: DEFAULT_CUSTOM_PALETTE,
        minItems: 1,
        maxItems: 8,
        visibleWhenSelectKey: 'palettePreset',
        visibleWhenSelectValue: CUSTOM_PALETTE_KEY
      }
    ]
  },
  {
    type: 'group',
    id: 'noise',
    label: 'Noise',
    collapsible: true,
    defaultOpen: false,
    controls: [
      {
        type: 'slider',
        label: 'Noise Scale',
        key: 'noiseScale',
        default: 9,
        min: 2,
        max: 80,
        step: 1
      },
      {
        type: 'slider',
        label: 'Stretch X',
        key: 'stretchX',
        default: 1.2,
        min: 0.2,
        max: 3,
        step: 0.15
      },
      {
        type: 'slider',
        label: 'Stretch Y',
        key: 'stretchY',
        default: 0.75,
        min: 0.2,
        max: 3,
        step: 0.15
      },
      {
        type: 'slider',
        label: 'Amplitude',
        key: 'amplitude',
        default: 1.5,
        min: 0.1,
        max: 2.0,
        step: 0.1
      },
      {
        type: 'slider',
        label: 'Octaves',
        key: 'octaves',
        default: 2,
        min: 1,
        max: 4,
        step: 1
      },
      {
        type: 'slider',
        label: 'Lacunarity',
        key: 'lacunarity',
        default: 2.4,
        min: 1.5,
        max: 3.0,
        step: 0.1
      },
      {
        type: 'slider',
        label: 'Persistence',
        key: 'persistence',
        default: 0.9,
        min: 0.1,
        max: 1.0,
        step: 0.1
      }
    ]
  },
  {
    type: 'group',
    id: 'grid',
    label: 'Grid',
    collapsible: true,
    defaultOpen: false,
    controls: [
      {
        type: 'slider',
        label: 'Grid Size',
        key: 'gridSize',
        default: 29,
        min: 10,
        max: 100,
        step: 1
      },
      {
        type: 'toggle',
        label: 'Show Grid',
        key: 'showGrid',
        default: false
      },
      {
        type: 'toggle',
        label: 'Circular Cutoff',
        key: 'circularCutoff',
        default: true
      },
      // Cutoff ring shape controls: inner/outer diameters in cell space.
      {
        type: 'slider',
        label: 'Inner Limit',
        key: 'innerLimit',
        default: 21,
        min: 3,
        max: 100,
        step: 1
      },
      {
        type: 'slider',
        label: 'Outer Limit',
        key: 'outerLimit',
        default: 25,
        min: 3,
        max: 100,
        step: 1
      }
    ]
  }
]

export async function init(
  container: HTMLElement,
  context: ProjectContext
): Promise<CleanupFunction> {
  const { controls, utils, theme, onControlChange } = context
  const { v, dist, simplex2 } = shortcuts(utils)

  const controlState = {
    gridSize: controls.gridSize as number,
    noiseScale: controls.noiseScale as number,
    stretchX: controls.stretchX as number,
    stretchY: controls.stretchY as number,
    amplitude: controls.amplitude as number,
    octaves: controls.octaves as number,
    lacunarity: controls.lacunarity as number,
    persistence: controls.persistence as number,
    palettePreset: controls.palettePreset as string,
    selectedPaletteIndices: controls.selectedPaletteIndices as number[],
    customPalette: controls.customPalette as string[],
    showGrid: controls.showGrid as boolean,
    circularCutoff: controls.circularCutoff as boolean,
    innerLimit: controls.innerLimit as number,
    outerLimit: controls.outerLimit as number
  }

  // Fixed settings
  const colorPalettes = buildPaletteMap(theme.palette, NAMED_PALETTES)
  const backgroundColor = theme.background
  const annotationColor = (Color.parse(theme.annotation) ?? Color.fromHex('#666')!).toCss('rgba')

  // Calculate square size (based on smaller dimension)
  const size = Math.min(container.clientWidth, container.clientHeight)
  const margin = 40 // Space for grid numbers
  
  // Center the container content
  container.style.display = 'flex'
  container.style.alignItems = 'center'
  container.style.justifyContent = 'center'
  
  // Create square SVG canvas
  const svg = new SVG({
    parent: container,
    id: 'pearlymats',
    width: size,
    height: size
  })

  // Create grid
  const grid = new Grid({
    cols: controlState.gridSize,
    rows: controlState.gridSize,
    width: size,
    height: size,
    x: 0,
    y: 0,
    margin: margin,
    utils
  })

  // Cell class - extends base Cell with noise-based color
  class PearlyCell extends Cell {
    noiseValue: number
    color: string
    alpha: number

    constructor(
      baseCell: Cell,
      scale: number,
      stretchX: number,
      stretchY: number,
      amp: number,
      oct: number,
      lac: number,
      pers: number,
      activeColors: string[]
    ) {
      super({
        x: baseCell.x,
        y: baseCell.y,
        width: baseCell.width,
        height: baseCell.height,
        row: baseCell.row,
        col: baseCell.col,
        index: baseCell.index,
        level: baseCell.level,
        grid: baseCell.grid
      })

      // Multi-octave noise (fractional Brownian motion)
      let total = 0
      const baseScale = Math.max(0.001, scale)
      let currentFreqX = (1 / baseScale) * Math.max(0.001, stretchX)
      let currentFreqY = (1 / baseScale) * Math.max(0.001, stretchY)
      let currentAmp = 1.0
      let maxValue = 0
      
      for (let i = 0; i < oct; i++) {
        total += simplex2(this.col * currentFreqX, this.row * currentFreqY) * currentAmp
        maxValue += currentAmp
        currentFreqX *= lac
        currentFreqY *= lac
        currentAmp *= pers
      }
      
      this.noiseValue = (total / maxValue) * amp
      this.noiseValue = Math.max(-1, Math.min(1, this.noiseValue))
      
      const normalized = (this.noiseValue + 1) / 2
      const steps = Math.max(1, activeColors.length)
      const quantized = steps === 1 ? 0 : Math.floor(normalized * steps) / (steps - 1)
      const index = Math.min(Math.floor(quantized * steps), steps - 1)
      
      this.color = activeColors[index]!
      this.alpha = 1
    }

    draw() {
      const center = this.center()
      const radius = this.width / 2
      const parsedColor = Color.parse(this.color)
      // Final opacity application: alpha is multiplied into the selected bead color.
      const fillColor = parsedColor
        ? parsedColor.withAlpha(parsedColor.a * this.alpha).toCss('rgba')
        : this.color

      svg.makeCircle(center, radius, fillColor, 'none', 0)
    }
  }

  // Draw function - creates and renders all cells
  function draw() {
    // Clear previous content
    svg.stage.innerHTML = ''

    // Add background
    svg.makeRect(v(0, 0), size, size, backgroundColor, 'none')

    // Recreate grid if gridSize changed
    if (grid.cols !== controlState.gridSize || grid.rows !== controlState.gridSize) {
      const newGrid = new Grid({
        cols: controlState.gridSize,
        rows: controlState.gridSize,
        width: size,
        height: size,
        x: 0,
        y: 0,
        margin: margin,
        utils
      })
      // Replace the grid reference
      Object.assign(grid, newGrid)
    }

    const innerDiameterCells = Math.max(1, Math.floor(controlState.innerLimit))
    const outerDiameterCells = Math.max(innerDiameterCells, Math.floor(controlState.outerLimit))
    const innerRadiusCells = innerDiameterCells / 2
    const outerRadiusCells = outerDiameterCells / 2
    // "Off" state opacity outside/failed cells; set to 0 for fully hidden cells.
    const outsideAlpha = 0.15
    const centerCol = (controlState.gridSize - 1) / 2
    const centerRow = (controlState.gridSize - 1) / 2
    const standardPalette = getPaletteByKey(colorPalettes, STANDARD_PALETTE_KEY)
    const paletteColors = getPaletteByKey(colorPalettes, controlState.palettePreset)
    const activeColors = resolveActiveColors({
      paletteColors,
      selectedValues: controlState.selectedPaletteIndices,
      customColors: controlState.customPalette,
      useCustomPalette: controlState.palettePreset === CUSTOM_PALETTE_KEY,
      fallbackColors: standardPalette
    })
    sendDebugLog({
      runId: 'initial',
      hypothesisId: 'H4',
      location: 'projects/pearlymats/index.ts:draw',
      message: 'Draw start with amplitude and palette state',
      data: {
        amplitude: controlState.amplitude,
        selectedPaletteIndicesCount: controlState.selectedPaletteIndices.length,
        activeColorsCount: activeColors.length,
        palettePreset: controlState.palettePreset
      }
    })

    // Create PearlyCells from grid cells
    const cells: PearlyCell[] = grid.map(cell => 
      new PearlyCell(
        cell,
        controlState.noiseScale,
        controlState.stretchX,
        controlState.stretchY,
        controlState.amplitude,
        controlState.octaves,
        controlState.lacunarity,
        controlState.persistence,
        activeColors
      )
    )
    const noiseStats = cells.reduce(
      (acc, cell) => {
        const noise = cell.noiseValue
        if (noise < acc.minNoise) acc.minNoise = noise
        if (noise > acc.maxNoise) acc.maxNoise = noise
        acc.sumNoise += noise
        acc.uniqueColors.add(cell.color)
        return acc
      },
      {
        minNoise: Number.POSITIVE_INFINITY,
        maxNoise: Number.NEGATIVE_INFINITY,
        sumNoise: 0,
        uniqueColors: new Set<string>()
      }
    )
    sendDebugLog({
      runId: 'initial',
      hypothesisId: 'H5',
      location: 'projects/pearlymats/index.ts:draw',
      message: 'Noise/color distribution after amplitude applied',
      data: {
        amplitude: controlState.amplitude,
        minNoise: Number.isFinite(noiseStats.minNoise) ? noiseStats.minNoise : null,
        maxNoise: Number.isFinite(noiseStats.maxNoise) ? noiseStats.maxNoise : null,
        avgNoise: cells.length > 0 ? noiseStats.sumNoise / cells.length : null,
        uniqueColorCount: noiseStats.uniqueColors.size
      }
    })

    // Build a lookup map so utility neighbor cells can be resolved back to PearlyCell instances
    const cellMap = new Map<string, PearlyCell>()
    cells.forEach(cell => {
      cellMap.set(`${cell.row},${cell.col}`, cell)
    })

    // Measure distance in cell-space (row/col steps), not pixel-space
    const distanceToCenter = (candidate: Cell): number =>
      dist(centerCol, centerRow, candidate.col, candidate.row)

    // Evaluate cells from center outward so propagation decisions are stable
    const cellsByDistance = [...cells].sort((a, b) => {
      const distA = distanceToCenter(a)
      const distB = distanceToCenter(b)
      return distA - distB
    })

    // Main local rule: only inward 4-neighbor same-color support can turn a cell "on".
    // This avoids diagonal-only links while preserving edge texture.
    cellsByDistance.forEach(cell => {
      if (!controlState.circularCutoff) {
        cell.alpha = 1
        return
      }

      const distToCenter = distanceToCenter(cell)

      if (distToCenter > outerRadiusCells) {
        cell.alpha = outsideAlpha
        return
      }

      if (distToCenter <= innerRadiusCells) {
        cell.alpha = 1
        return
      }

      const inwardCardinalNeighbors = cell
        .getNeighbors4()
        .map(neighbor => cellMap.get(`${neighbor.row},${neighbor.col}`))
        .filter((neighbor): neighbor is PearlyCell => Boolean(neighbor))
        .filter(neighbor => distanceToCenter(neighbor) < distToCenter)
      const hasCardinalSupport = inwardCardinalNeighbors.some(
        neighbor => neighbor.alpha === 1 && neighbor.color === cell.color
      )
      cell.alpha = hasCardinalSupport ? 1 : outsideAlpha
    })

    const cellByKey = new Map<string, PearlyCell>()
    cells.forEach(cell => {
      cellByKey.set(`${cell.row},${cell.col}`, cell)
    })

    const reachableBy4Path = new Set<string>()
    const queue: PearlyCell[] = []
    cells.forEach(cell => {
      if (distanceToCenter(cell) <= innerRadiusCells) {
        const key = `${cell.row},${cell.col}`
        reachableBy4Path.add(key)
        queue.push(cell)
      }
    })

    while (queue.length > 0) {
      const current = queue.shift()!
      const currentKey = `${current.row},${current.col}`
      const currentDist = distanceToCenter(current)
      if (currentDist > outerRadiusCells) continue

      current.getNeighbors4().forEach(neighborBase => {
        const neighbor = cellByKey.get(`${neighborBase.row},${neighborBase.col}`)
        if (!neighbor) return
        const neighborDist = distanceToCenter(neighbor)
        if (neighborDist > outerRadiusCells) return
        if (neighbor.color !== current.color) return
        const neighborKey = `${neighbor.row},${neighbor.col}`
        if (reachableBy4Path.has(neighborKey)) return
        reachableBy4Path.add(neighborKey)
        queue.push(neighbor)
      })

      if (!reachableBy4Path.has(currentKey)) {
        reachableBy4Path.add(currentKey)
      }
    }

    // Connectivity map (any color): identifies enclosed pockets that are still center-reachable.
    const reachableBy4PathAnyColor = new Set<string>()
    const queueAnyColor: PearlyCell[] = []
    cells.forEach(cell => {
      if (distanceToCenter(cell) <= innerRadiusCells) {
        const key = `${cell.row},${cell.col}`
        reachableBy4PathAnyColor.add(key)
        queueAnyColor.push(cell)
      }
    })

    while (queueAnyColor.length > 0) {
      const current = queueAnyColor.shift()!
      const currentDist = distanceToCenter(current)
      if (currentDist > outerRadiusCells) continue

      current.getNeighbors4().forEach(neighborBase => {
        const neighbor = cellByKey.get(`${neighborBase.row},${neighborBase.col}`)
        if (!neighbor) return
        const neighborDist = distanceToCenter(neighbor)
        if (neighborDist > outerRadiusCells) return
        const neighborKey = `${neighbor.row},${neighbor.col}`
        if (reachableBy4PathAnyColor.has(neighborKey)) return
        reachableBy4PathAnyColor.add(neighborKey)
        queueAnyColor.push(neighbor)
      })
    }

    const prePathAlphaByKey = new Map<string, number>()
    cells.forEach(cell => {
      prePathAlphaByKey.set(`${cell.row},${cell.col}`, cell.alpha)
    })

    cells.forEach(cell => {
      const distToCenter = distanceToCenter(cell)
      if (distToCenter <= innerRadiusCells || distToCenter > outerRadiusCells) return
      const key = `${cell.row},${cell.col}`
      const isReachable4Path = reachableBy4Path.has(key)
      const isReachable4PathAnyColor = reachableBy4PathAnyColor.has(key)
      const previousAlpha = cell.alpha
      // Local support count from pre-path alpha; higher counts make rescue fills stricter.
      const acceptedCardinalNeighborCount = cell
        .getNeighbors4()
        .map(neighborBase => prePathAlphaByKey.get(`${neighborBase.row},${neighborBase.col}`) ?? outsideAlpha)
        .filter(alpha => alpha === 1)
        .length
      // Soft same-color rescue: restores organic edge where local pass missed valid path cells.
      const softPathFillNoise = (simplex2(cell.col * 0.29 - 5.7, cell.row * 0.29 + 13.2) + 1) / 2
      const softPathFillEligible = isReachable4Path && previousAlpha < 1
      const shouldSoftPathFill = softPathFillEligible && (
        acceptedCardinalNeighborCount >= 2 ||
        softPathFillNoise > 0.58
      )
      // Hole fill rescue: fills enclosed blanks that are center-reachable only via mixed colors.
      const holeFillEligible = !isReachable4Path && isReachable4PathAnyColor && acceptedCardinalNeighborCount >= 3
      const holeFillNoise = (simplex2(cell.col * 0.37 + 17.1, cell.row * 0.37 - 9.4) + 1) / 2
      const shouldHoleFill = holeFillEligible && (
        acceptedCardinalNeighborCount >= 4 ||
        holeFillNoise > 0.62
      )
      // Binary final decision: on (1) or off (outsideAlpha), no intermediate alpha in this pass.
      const nextAlpha = previousAlpha === 1
        ? 1
        : (shouldSoftPathFill || shouldHoleFill ? 1 : outsideAlpha)
      cell.alpha = nextAlpha
    })

    // Draw all cells
    cells.forEach(cell => cell.draw())

    // Draw grid overlay if enabled
    if (controlState.showGrid) {
      const gridArea = size - (margin * 2)
      const cellSize = gridArea / controlState.gridSize

      // Draw vertical grid lines
      for (let col = 0; col <= controlState.gridSize; col++) {
        const x = margin + col * cellSize
        svg.makeLine(v(x, margin), v(x, margin + gridArea), annotationColor, 0.5)
      }

      // Draw horizontal grid lines
      for (let row = 0; row <= controlState.gridSize; row++) {
        const y = margin + row * cellSize
        svg.makeLine(v(margin, y), v(margin + gridArea, y), annotationColor, 0.5)
      }

      // Draw column numbers (top)
      for (let col = 0; col < controlState.gridSize; col++) {
        const cellSize = gridArea / controlState.gridSize
        const x = margin + col * cellSize + cellSize / 2
        svg.makeText(
          (col + 1).toString(),
          v(x, margin - 10),
          annotationColor,
          { anchor: 'middle', fontSize: 10 }
        )
      }

      // Draw row numbers (left)
      for (let row = 0; row < controlState.gridSize; row++) {
        const cellSize = gridArea / controlState.gridSize
        const y = margin + row * cellSize + cellSize / 2
        svg.makeText(
          (row + 1).toString(),
          v(margin - 10, y + 3),
          annotationColor,
          { anchor: 'end', fontSize: 10 }
        )
      }
    }
  }

  // Initial draw
  draw()

  // React to control changes
  onControlChange((newControls) => {
    sendDebugLog({
      runId: 'initial',
      hypothesisId: 'H3',
      location: 'projects/pearlymats/index.ts:onControlChange',
      message: 'Received control change for amplitude sync',
      data: {
        incomingAmplitude: newControls.amplitude,
        previousAmplitude: controlState.amplitude
      }
    })
    syncControlState(controlState, newControls)
    sendDebugLog({
      runId: 'initial',
      hypothesisId: 'H3',
      location: 'projects/pearlymats/index.ts:onControlChange',
      message: 'Amplitude after syncControlState',
      data: {
        syncedAmplitude: controlState.amplitude
      }
    })
    if (import.meta.client) {
      const normalizedCustomPalette = normalizeColorList(controlState.customPalette, FALLBACK_CUSTOM_PALETTE)
      controlState.customPalette = normalizedCustomPalette
      localStorage.setItem(CUSTOM_PALETTE_STORAGE_KEY, JSON.stringify(normalizedCustomPalette))
    }
    draw()
  })

  // Cleanup function
  return () => {
    svg.stage.remove()
  }
}
