import type { ProjectContext, CleanupFunction, ControlDefinition } from '~/types/project'
import { SVG, Path } from '~/utils/svg'
import { shortcuts } from '~/utils/shortcuts'

/**
 * SVG Project Template
 * 
 * This is a minimal SVG template using the ported engine from your original work.
 * Copy this folder and modify to create your own SVG-based generative art projects.
 * 
 * Available context:
 * - controls: Reactive control values (defined below)
 * - utils: Global utilities (noise, seed, math, vec, array)
 * - onControlChange: Register callback for control updates
 * 
 * Shorthand functions:
 * - v(x, y, z?): Create vector
 * - rnd(): Random 0-1
 * - rndInt(min, max): Random integer
 * - map(val, min1, max1, min2, max2): Map value to range
 * - lerp(a, b, t): Linear interpolation
 * - And many more! See utils/shortcuts.ts
 */

// Export controls - define them here in your sketch
export const controls: ControlDefinition[] = [
  // Example controls (uncomment and modify as needed):
  // {
  //   type: 'slider',
  //   label: 'Line Count',
  //   key: 'lineCount',
  //   default: 10,
  //   min: 1,
  //   max: 50,
  //   step: 1
  // },
  // {
  //   type: 'slider',
  //   label: 'Stroke Width',
  //   key: 'strokeWidth',
  //   default: 2,
  //   min: 0.5,
  //   max: 10,
  //   step: 0.5
  // }
]

export async function init(
  container: HTMLElement,
  context: ProjectContext
): Promise<CleanupFunction> {
  const { controls, utils, onControlChange } = context
  const { v, rnd, map, rad } = shortcuts(utils)

  // Calculate square size (based on smaller dimension)
  const size = Math.min(container.clientWidth, container.clientHeight)
  
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

  // Your sketch code here
  // Example: Draw a simple composition

  const nRows = 29
  const nCols = 29
  const settings = {
    nRows,
    nCols,
    cellSize: size / nRows,
    cellPadding: 10,
    cellColor: '#fff',
    cellStroke: '#000',
    cellStrokeWidth: 2,
  }

  

  for (let row = 0; row < settings.nRows; row++) {
    for (let col = 0; col < settings.nCols; col++) {
      const x = col * settings.cellSize + settings.cellPadding
      const y = row * settings.cellSize + settings.cellPadding
      svg.makeCircle(v(x, y), settings.cellSize / 2, settings.cellColor, settings.cellStroke, settings.cellStrokeWidth)
    }
  }
  
  // Center circle
  svg.makeCircle(svg.c, 50, 'none', '#fff', 2)
  



  // React to control changes
  onControlChange((newControls) => {
    // Update your sketch based on new control values
    // You might need to clear and redraw, or update elements directly
  })

  // Keyboard shortcut for downloading SVG
  const handleKeyPress = (event: KeyboardEvent) => {
    if (
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement
    ) {
      return
    }
    
    if (event.key.toLowerCase() === 'd') {
      event.preventDefault()
      svg.save(utils.seed.current, 'svg-sketch')
    }
  }
  
  window.addEventListener('keydown', handleKeyPress)

  // Cleanup function - called when project is unmounted
  return () => {
    window.removeEventListener('keydown', handleKeyPress)
    svg.stage.remove()
  }
}
