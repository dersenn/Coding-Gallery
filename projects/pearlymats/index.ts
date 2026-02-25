import type { ProjectContext, CleanupFunction, ControlDefinition } from '~/types/project'
import { SVG, Grid, Cell, Color } from '~/types/project'
import { shortcuts } from '~/utils/shortcuts'
import { syncControlState } from '~/composables/useControls'

/**
 * Pearlymats - Noise-based Grid Pattern
 * 
 * A grid of circles with colors determined by multi-octave simplex noise.
 * 
 * Controls:
 * - Frequency: Base noise frequency (detail level)
 * - Amplitude: Overall noise intensity
 * - Octaves: Number of noise layers (1-4)
 * - Lacunarity: Frequency multiplier per octave (2.0 = each octave doubles frequency)
 * - Persistence: Amplitude multiplier per octave (0.5 = each octave halves amplitude)
 * 
 */

// Export controls
export const controls: ControlDefinition[] = [
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
    type: 'slider',
    label: 'Frequency',
    key: 'frequency',
    default: 0.15,
    min: 0,
    max: 0.3,
    step: 0.01
  },
  {
    type: 'slider',
    label: 'Amplitude',
    key: 'amplitude',
    default: 1.0,
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
    default: 2.0,
    min: 1.5,
    max: 3.0,
    step: 0.1
  },
  {
    type: 'slider',
    label: 'Persistence',
    key: 'persistence',
    default: 0.5,
    min: 0.1,
    max: 1.0,
    step: 0.1
  },
  {
    type: 'toggle',
    label: 'Show Grid',
    key: 'showGrid',
    default: false
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
    frequency: controls.frequency as number,
    amplitude: controls.amplitude as number,
    octaves: controls.octaves as number,
    lacunarity: controls.lacunarity as number,
    persistence: controls.persistence as number,
    showGrid: controls.showGrid as boolean
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

    constructor(
      baseCell: Cell,
      freq: number,
      amp: number,
      oct: number,
      lac: number,
      pers: number
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
      let currentFreq = freq
      let currentAmp = 1.0
      let maxValue = 0
      
      for (let i = 0; i < oct; i++) {
        total += simplex2(this.col * currentFreq, this.row * currentFreq) * currentAmp
        maxValue += currentAmp
        currentFreq *= lac
        currentAmp *= pers
      }
      
      this.noiseValue = (total / maxValue) * amp
      this.noiseValue = Math.max(-1, Math.min(1, this.noiseValue))
      
      const normalized = (this.noiseValue + 1) / 2
      const index = Math.min(Math.floor(normalized * colors.length), colors.length - 1)
      
      this.color = colors[index]!
    }

    draw() {
      const center = this.center()
      const radius = this.width / 2
      
      svg.makeCircle(center, radius, this.color, 'none', 0)
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

    // Create PearlyCells from grid cells
    const cells: PearlyCell[] = grid.map(cell => 
      new PearlyCell(
        cell,
        controlState.frequency,
        controlState.amplitude,
        controlState.octaves,
        controlState.lacunarity,
        controlState.persistence
      )
    )

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
