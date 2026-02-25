import type { ProjectContext, CleanupFunction, ProjectControlDefinition } from '~/types/project'
import { SVG, Grid, Cell, Color } from '~/types/project'
import { shortcuts } from '~/utils/shortcuts'
import { syncControlState } from '~/composables/useControls'

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
    id: 'grid',
    label: 'Grid',
    collapsible: true,
    defaultOpen: true,
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
  },
  {
    type: 'group',
    id: 'noise',
    label: 'Noise',
    collapsible: true,
    defaultOpen: true,
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
    id: 'color',
    label: 'Color',
    collapsible: true,
    defaultOpen: true,
    controls: [
      {
        type: 'slider',
        label: 'Color Steps',
        key: 'colorSteps',
        default: 3,
        min: 1,
        max: 6,
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
  const { v, map, simplex2 } = shortcuts(utils)

  const controlState = {
    gridSize: controls.gridSize as number,
    noiseScale: controls.noiseScale as number,
    stretchX: controls.stretchX as number,
    stretchY: controls.stretchY as number,
    amplitude: controls.amplitude as number,
    octaves: controls.octaves as number,
    lacunarity: controls.lacunarity as number,
    persistence: controls.persistence as number,
    colorSteps: controls.colorSteps as number,
    showGrid: controls.showGrid as boolean,
    circularCutoff: controls.circularCutoff as boolean,
    innerLimit: controls.innerLimit as number,
    outerLimit: controls.outerLimit as number
  }

  // Fixed settings
  const colors = theme.palette
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
      colorSteps: number
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
      const steps = Math.min(colors.length, Math.max(1, Math.floor(colorSteps)))
      const activeColors = colors.slice(0, steps)
      const quantized = steps === 1 ? 0 : Math.floor(normalized * steps) / (steps - 1)
      const index = Math.min(Math.floor(quantized * activeColors.length), activeColors.length - 1)
      
      this.color = activeColors[index]!
      this.alpha = 1
    }

    draw() {
      const center = this.center()
      const radius = this.width / 2
      const parsedColor = Color.parse(this.color)
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
    const outsideAlpha = 0.15
    const centerCol = (controlState.gridSize - 1) / 2
    const centerRow = (controlState.gridSize - 1) / 2

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
        controlState.colorSteps
      )
    )

    const cellMap = new Map<string, PearlyCell>()
    cells.forEach(cell => {
      cellMap.set(`${cell.row},${cell.col}`, cell)
    })

    const clampToGrid = (value: number): number => {
      return Math.max(0, Math.min(controlState.gridSize - 1, value))
    }

    const getInwardNeighbor = (cell: PearlyCell): PearlyCell | undefined => {
      const dx = cell.col - centerCol
      const dy = cell.row - centerRow
      const dist = Math.hypot(dx, dy)
      if (dist === 0) return undefined

      const inwardCol = clampToGrid(Math.round(cell.col - (dx / dist)))
      const inwardRow = clampToGrid(Math.round(cell.row - (dy / dist)))
      return cellMap.get(`${inwardRow},${inwardCol}`)
    }

    const cellsByDistance = [...cells].sort((a, b) => {
      const distA = Math.hypot(a.col - centerCol, a.row - centerRow)
      const distB = Math.hypot(b.col - centerCol, b.row - centerRow)
      return distA - distB
    })

    cellsByDistance.forEach(cell => {
      if (!controlState.circularCutoff) {
        cell.alpha = 1
        return
      }

      const dx = cell.col - centerCol
      const dy = cell.row - centerRow
      const distToCenter = Math.hypot(dx, dy)

      if (distToCenter > outerRadiusCells) {
        cell.alpha = outsideAlpha
        return
      }

      if (distToCenter <= innerRadiusCells) {
        cell.alpha = 1
        return
      }

      const inwardNeighbor = getInwardNeighbor(cell)
      const canPropagateOutward = Boolean(
        inwardNeighbor &&
        inwardNeighbor.alpha === 1 &&
        inwardNeighbor.color === cell.color
      )

      cell.alpha = canPropagateOutward ? 1 : outsideAlpha
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
    syncControlState(controlState, newControls)
    draw()
  })

  // Cleanup function
  return () => {
    svg.stage.remove()
  }
}
