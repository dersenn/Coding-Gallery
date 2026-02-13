import type { ProjectContext, CleanupFunction, ControlDefinition } from '~/types/project'
import { SVG } from '~/utils/svg'
import { shortcuts } from '~/utils/shortcuts'

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
 * Keyboard shortcuts:
 * - 'd': Download SVG
 * - 'r': Reset to defaults
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
  const { controls, utils, onControlChange } = context
  const { v, map, simplex2 } = shortcuts(utils)

  // Get control values
  let gridSize = controls.gridSize as number
  let frequency = controls.frequency as number
  let amplitude = controls.amplitude as number
  let octaves = controls.octaves as number
  let lacunarity = controls.lacunarity as number
  let persistence = controls.persistence as number
  let showGrid = controls.showGrid as boolean

  // Fixed settings
  const colors = ['#ff0000', '#ffff00', '#00ff00', '#0000ff', '#ff00ff'] // Array of colors to cycle through
  const backgroundColor = '#000000'

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

  // Cell class - takes noise parameters to use current values
  class Cell {
    noiseValue: number
    color: string

    constructor(
      public row: number,
      public col: number,
      public x: number,
      public y: number,
      public cellSize: number,
      freq: number,
      amp: number,
      oct: number,
      lac: number,
      pers: number
    ) {
      // Multi-octave noise (fractional Brownian motion)
      let total = 0
      let currentFreq = freq
      let currentAmp = 1.0 // Start with amplitude 1.0 for first octave
      let maxValue = 0
      
      for (let i = 0; i < oct; i++) {
        total += simplex2(col * currentFreq, row * currentFreq) * currentAmp
        maxValue += currentAmp
        currentFreq *= lac // Increase frequency by lacunarity
        currentAmp *= pers // Decrease amplitude by persistence
      }
      
      // Normalize by the sum of amplitudes, then apply global amplitude
      this.noiseValue = (total / maxValue) * amp
      
      // Clamp to -1, 1 range (amplitude > 1 can push beyond)
      this.noiseValue = Math.max(-1, Math.min(1, this.noiseValue))
      
      // Map noise value to color index based on colors array length
      // Normalize from -1,1 to 0,1, then multiply by array length and floor
      const normalized = (this.noiseValue + 1) / 2 // 0 to 1
      const index = Math.min(Math.floor(normalized * colors.length), colors.length - 1)
      
      this.color = colors[index]!
    }

    // Draw the cell as a circle
    draw() {
      const centerX = this.x + this.cellSize / 2
      const centerY = this.y + this.cellSize / 2
      const radius = this.cellSize / 2
      
      svg.makeCircle(v(centerX, centerY), radius, this.color, 'none', 0)
    }
  }

  // Draw function - creates and renders all cells
  function draw() {
    // Clear previous content
    svg.stage.innerHTML = ''

    // Add background
    svg.makeRect(v(0, 0), size, size, backgroundColor, 'none')

    const gridArea = size - (margin * 2)
    const cellSize = gridArea / gridSize
    const cells: Cell[] = []

    // Create grid of cells - pass current noise parameters
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const x = margin + col * cellSize
        const y = margin + row * cellSize
        const cell = new Cell(row, col, x, y, cellSize, frequency, amplitude, octaves, lacunarity, persistence)
        cells.push(cell)
      }
    }

    // Draw all cells
    cells.forEach(cell => cell.draw())

    // Draw grid overlay if enabled
    if (showGrid) {
      // Draw vertical grid lines through cell centers
      for (let col = 0; col <= gridSize; col++) {
        const x = margin + col * cellSize
        svg.makeLine(v(x, margin), v(x, margin + gridArea), '#666', 0.5)
      }

      // Draw horizontal grid lines through cell centers
      for (let row = 0; row <= gridSize; row++) {
        const y = margin + row * cellSize
        svg.makeLine(v(margin, y), v(margin + gridArea, y), '#666', 0.5)
      }

      // Draw column numbers (top)
      for (let col = 0; col < gridSize; col++) {
        const x = margin + col * cellSize + cellSize / 2
        const text = svg.stage.ownerDocument!.createElementNS('http://www.w3.org/2000/svg', 'text')
        text.setAttribute('x', x.toString())
        text.setAttribute('y', (margin - 10).toString())
        text.setAttribute('text-anchor', 'middle')
        text.setAttribute('font-size', '10')
        text.setAttribute('fill', '#666')
        text.textContent = (col + 1).toString()
        svg.stage.appendChild(text)
      }

      // Draw row numbers (left)
      for (let row = 0; row < gridSize; row++) {
        const y = margin + row * cellSize + cellSize / 2
        const text = svg.stage.ownerDocument!.createElementNS('http://www.w3.org/2000/svg', 'text')
        text.setAttribute('x', (margin - 10).toString())
        text.setAttribute('y', (y + 3).toString())
        text.setAttribute('text-anchor', 'end')
        text.setAttribute('font-size', '10')
        text.setAttribute('fill', '#666')
        text.textContent = (row + 1).toString()
        svg.stage.appendChild(text)
      }
    }
  }

  // Initial draw
  draw()

  // React to control changes
  onControlChange((newControls) => {
    gridSize = newControls.gridSize as number
    frequency = newControls.frequency as number
    amplitude = newControls.amplitude as number
    octaves = newControls.octaves as number
    lacunarity = newControls.lacunarity as number
    persistence = newControls.persistence as number
    showGrid = newControls.showGrid as boolean
    draw()
  })

  // Reset to defaults
  const resetControls = () => {
    gridSize = 29
    frequency = 0.15
    amplitude = 1.0
    octaves = 2
    lacunarity = 2.0
    persistence = 0.5
    showGrid = false
    draw()
  }

  // Keyboard shortcuts
  const handleKeyPress = (event: KeyboardEvent) => {
    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement
    ) {
      return
    }
    
    if (event.key.toLowerCase() === 'd') {
      event.preventDefault()
      svg.save(utils.seed.current, 'pearlymats')
    }
    
    if (event.key.toLowerCase() === 'r') {
      event.preventDefault()
      resetControls()
    }
  }
  
  window.addEventListener('keydown', handleKeyPress)

  // Cleanup function
  return () => {
    window.removeEventListener('keydown', handleKeyPress)
    svg.stage.remove()
  }
}
