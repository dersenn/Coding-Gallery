import { Grid, GridCell, Color } from '~/types/project'
import {
  buildPaletteMap,
  getPaletteByKey,
  normalizeColorList,
  resolveActiveColors
} from '~/utils/color'
import { shortcuts } from '~/utils/shortcuts'
import { defaultTheme } from '~/utils/theme'

const CUSTOM_PALETTE_STORAGE_KEY = 'pearlymats:customPalette'
const FALLBACK_CUSTOM_PALETTE = ['#fdf2f8', '#ddd6fe', '#bfdbfe']
const STANDARD_PALETTE_KEY = 'standard'
const CUSTOM_PALETTE_KEY = 'custom'
const BEAD_PALETTE = [
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
const NAMED_PALETTES = {
  pearl: ['#fdf2f8', '#ddd6fe', '#bfdbfe', '#a7f3d0', '#f5d0fe', '#fde68a'],
  neon: ['#ff006e', '#8338ec', '#3a86ff', '#00f5d4', '#ffbe0b', '#fb5607'],
  earth: ['#6b4226', '#a98467', '#d5bdaf', '#9c6644', '#7f5539', '#b08968'],
  beads: BEAD_PALETTE
}

const colorPalettes = buildPaletteMap(defaultTheme.palette, NAMED_PALETTES)

export function draw(context) {
  const { svg, controls, utils, theme } = context
  const { v, simplex2 } = shortcuts(utils)

  const size = svg.w
  const margin = 40
  const backgroundColor = theme.background
  const annotationColor = (Color.parse(theme.annotation) ?? Color.fromHex('#666')).toCss('rgba')

  // Persist custom palette to localStorage whenever it's the active preset
  if (import.meta.client && controls.palettePreset === CUSTOM_PALETTE_KEY) {
    const normalized = normalizeColorList(controls.customPalette, FALLBACK_CUSTOM_PALETTE)
    localStorage.setItem(CUSTOM_PALETTE_STORAGE_KEY, JSON.stringify(normalized))
  }

  // Background
  svg.rect(v(0, 0), size, size, backgroundColor, 'none')

  const grid = new Grid({
    cols: controls.gridSize,
    rows: controls.gridSize,
    width: size,
    height: size,
    x: 0,
    y: 0,
    margin,
    utils
  })

  // PearlyCell: GridCell subclass with multi-octave noise-driven color assignment
  class PearlyCell extends GridCell {
    constructor(baseCell, scale, stretchX, stretchY, amp, oct, lac, pers, activeColors) {
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

      const steps = Math.max(1, activeColors.length)
      if (steps === 2) {
        // In 2-color mode, use a per-cell threshold that shrinks with higher amplitude.
        const normalized = (this.noiseValue + 1) / 2
        const ampInfluence = Math.max(0, Math.min(1, amp / 2))
        const thresholdNoise = (simplex2(this.col * 0.217 + 19.3, this.row * 0.217 - 7.4) + 1) / 2
        const threshold = 0.5 + (thresholdNoise - 0.5) * (1 - ampInfluence)
        this.color = normalized >= threshold ? activeColors[1] : activeColors[0]
      } else {
        const normalized = (this.noiseValue + 1) / 2
        const quantized = steps === 1 ? 0 : Math.floor(normalized * steps) / (steps - 1)
        const index = Math.min(Math.floor(quantized * steps), steps - 1)
        this.color = activeColors[index]
      }
      this.alpha = 1
    }

    draw() {
      const center = this.center()
      const radius = this.width / 2
      const parsedColor = Color.parse(this.color)
      const fillColor = parsedColor
        ? parsedColor.withAlpha(parsedColor.a * this.alpha).toCss('rgba')
        : this.color
      svg.circle(center, radius, fillColor, 'none', 0)
    }
  }

  const innerDiameterCells = Math.max(1, Math.floor(controls.innerLimit))
  const outerDiameterCells = Math.max(innerDiameterCells, Math.floor(controls.outerLimit))
  const innerRadiusCells = innerDiameterCells / 2
  const outerRadiusCells = outerDiameterCells / 2
  // "Off" opacity for cells outside/failed connectivity; 0 for fully hidden.
  const outsideAlpha = 0.15
  const centerCol = (controls.gridSize - 1) / 2
  const centerRow = (controls.gridSize - 1) / 2

  const standardPalette = getPaletteByKey(colorPalettes, STANDARD_PALETTE_KEY)
  const paletteColors = getPaletteByKey(colorPalettes, controls.palettePreset)
  const activeColors = resolveActiveColors({
    paletteColors,
    selectedValues: controls.selectedPaletteIndices,
    customColors: controls.customPalette,
    useCustomPalette: controls.palettePreset === CUSTOM_PALETTE_KEY,
    fallbackColors: standardPalette
  })

  const cells = grid.map(cell =>
    new PearlyCell(
      cell,
      controls.noiseScale,
      controls.stretchX,
      controls.stretchY,
      controls.amplitude,
      controls.octaves,
      controls.lacunarity,
      controls.persistence,
      activeColors
    )
  )

  // Lookup map for neighbor resolution during local-rule pass
  const cellMap = new Map()
  cells.forEach(cell => {
    cellMap.set(`${cell.row},${cell.col}`, cell)
  })

  const distanceToCenter = (candidate) =>
    candidate.gridDistance({ col: centerCol, row: centerRow })

  // Evaluate from center outward so inward-neighbor decisions are stable
  const cellsByDistance = [...cells].sort((a, b) => distanceToCenter(a) - distanceToCenter(b))

  // Local rule: only inward 4-neighbor same-color support turns a ring cell "on"
  cellsByDistance.forEach(cell => {
    if (!controls.circularCutoff) {
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
      .filter(neighbor => Boolean(neighbor))
      .filter(neighbor => distanceToCenter(neighbor) < distToCenter)
    const hasCardinalSupport = inwardCardinalNeighbors.some(
      neighbor => neighbor.alpha === 1 && neighbor.color === cell.color
    )
    cell.alpha = hasCardinalSupport ? 1 : outsideAlpha
  })

  // BFS lookup map for path connectivity passes
  const cellByKey = new Map()
  cells.forEach(cell => {
    cellByKey.set(`${cell.row},${cell.col}`, cell)
  })

  // Same-color BFS: which ring cells are center-reachable via a same-color 4-path?
  const reachableBy4Path = new Set()
  const queue = []
  cells.forEach(cell => {
    if (distanceToCenter(cell) <= innerRadiusCells) {
      const key = `${cell.row},${cell.col}`
      reachableBy4Path.add(key)
      queue.push(cell)
    }
  })
  while (queue.length > 0) {
    const current = queue.shift()
    const currentKey = `${current.row},${current.col}`
    const currentDist = distanceToCenter(current)
    if (currentDist > outerRadiusCells) continue
    current.getNeighbors4().forEach(neighborBase => {
      const neighbor = cellByKey.get(`${neighborBase.row},${neighborBase.col}`)
      if (!neighbor) return
      if (distanceToCenter(neighbor) > outerRadiusCells) return
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

  // Any-color BFS: identifies enclosed pockets reachable from center via mixed colors
  const reachableBy4PathAnyColor = new Set()
  const queueAnyColor = []
  cells.forEach(cell => {
    if (distanceToCenter(cell) <= innerRadiusCells) {
      const key = `${cell.row},${cell.col}`
      reachableBy4PathAnyColor.add(key)
      queueAnyColor.push(cell)
    }
  })
  while (queueAnyColor.length > 0) {
    const current = queueAnyColor.shift()
    const currentDist = distanceToCenter(current)
    if (currentDist > outerRadiusCells) continue
    current.getNeighbors4().forEach(neighborBase => {
      const neighbor = cellByKey.get(`${neighborBase.row},${neighborBase.col}`)
      if (!neighbor) return
      if (distanceToCenter(neighbor) > outerRadiusCells) return
      const neighborKey = `${neighbor.row},${neighbor.col}`
      if (reachableBy4PathAnyColor.has(neighborKey)) return
      reachableBy4PathAnyColor.add(neighborKey)
      queueAnyColor.push(neighbor)
    })
  }

  // Snapshot alpha before rescue passes
  const prePathAlphaByKey = new Map()
  cells.forEach(cell => {
    prePathAlphaByKey.set(`${cell.row},${cell.col}`, cell.alpha)
  })

  // Rescue pass: soft same-color fill + hole fill for organic edge texture
  cells.forEach(cell => {
    const distToCenter = distanceToCenter(cell)
    if (distToCenter <= innerRadiusCells || distToCenter > outerRadiusCells) return
    const key = `${cell.row},${cell.col}`
    const isReachable4Path = reachableBy4Path.has(key)
    const isReachable4PathAnyColor = reachableBy4PathAnyColor.has(key)
    const previousAlpha = cell.alpha
    const acceptedCardinalNeighborCount = cell
      .getNeighbors4()
      .map(neighborBase => prePathAlphaByKey.get(`${neighborBase.row},${neighborBase.col}`) ?? outsideAlpha)
      .filter(alpha => alpha === 1)
      .length
    // Soft same-color rescue: restores organic edge where local pass missed valid path cells
    const softPathFillNoise = (simplex2(cell.col * 0.29 - 5.7, cell.row * 0.29 + 13.2) + 1) / 2
    const softPathFillEligible = isReachable4Path && previousAlpha < 1
    const shouldSoftPathFill = softPathFillEligible && (
      acceptedCardinalNeighborCount >= 2 || softPathFillNoise > 0.58
    )
    // Hole fill rescue: fills enclosed blanks center-reachable only via mixed colors
    const holeFillEligible = !isReachable4Path && isReachable4PathAnyColor && acceptedCardinalNeighborCount >= 3
    const holeFillNoise = (simplex2(cell.col * 0.37 + 17.1, cell.row * 0.37 - 9.4) + 1) / 2
    const shouldHoleFill = holeFillEligible && (
      acceptedCardinalNeighborCount >= 4 || holeFillNoise > 0.62
    )
    cell.alpha = previousAlpha === 1
      ? 1
      : (shouldSoftPathFill || shouldHoleFill ? 1 : outsideAlpha)
  })

  // Draw all cells
  cells.forEach(cell => cell.draw())

  // Grid overlay with row/column number annotations
  if (controls.showGrid) {
    const gridArea = size - (margin * 2)
    const cellSize = gridArea / controls.gridSize
    for (let col = 0; col <= controls.gridSize; col++) {
      const x = margin + col * cellSize
      svg.line(v(x, margin), v(x, margin + gridArea), annotationColor, 0.5)
    }
    for (let row = 0; row <= controls.gridSize; row++) {
      const y = margin + row * cellSize
      svg.line(v(margin, y), v(margin + gridArea, y), annotationColor, 0.5)
    }
    for (let col = 0; col < controls.gridSize; col++) {
      const x = margin + col * cellSize + cellSize / 2
      svg.text((col + 1).toString(), v(x, margin - 10), annotationColor, { anchor: 'middle', fontSize: 10 })
    }
    for (let row = 0; row < controls.gridSize; row++) {
      const y = margin + row * cellSize + cellSize / 2
      svg.text((row + 1).toString(), v(margin - 10, y + 3), annotationColor, { anchor: 'end', fontSize: 10 })
    }
  }
}
