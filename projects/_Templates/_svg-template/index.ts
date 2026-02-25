import type {
  ProjectContext,
  CleanupFunction,
  ControlDefinition,
  ProjectActionDefinition
} from '~/types/project'
import { SVG, Path, shortcuts } from '~/types/project'
import { syncControlState } from '~/composables/useControls'

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

export const actions: ProjectActionDefinition[] = [
  {
    key: 'download-svg',
    label: 'Download SVG'
  }
]

export async function init(
  container: HTMLElement,
  context: ProjectContext
): Promise<CleanupFunction> {
  const { controls, utils, onControlChange, registerAction } = context
  const { v, rnd, map, rad } = shortcuts(utils)
  const controlState = { ...controls }

  // Create SVG canvas
  // Option 1: Full container size (default)
  const svg = new SVG({
    parent: container,
    id: 'svg-sketch',
  })
  
  // Option 2: Square canvas (uncomment for square-based sketches)
  // const size = Math.min(container.clientWidth, container.clientHeight)
  // container.style.display = 'flex'
  // container.style.alignItems = 'center'
  // container.style.justifyContent = 'center'
  // const svg = new SVG({
  //   parent: container,
  //   id: 'svg-sketch',
  //   width: size,
  //   height: size
  // })

  // Your sketch code here
  // Example: Draw a simple composition
  
  // Center circle
  svg.makeCircle(svg.c, 50, 'none', '#000', 2)
  
  // Random circles around center
  for (let i = 0; i < 8; i++) {
    const angle = rad(i * 45)
    const radius = 100
    const pos = v(
      svg.c.x + Math.cos(angle) * radius,
      svg.c.y + Math.sin(angle) * radius
    )
    svg.makeCircle(pos, 10, '#000', 'none')
  }
  
  // Example: Create a path with bezier curves
  const pts = [
    v(100, 100),
    v(200, 150),
    v(300, 100),
    v(350, 200),
    v(250, 250),
    v(150, 200),
  ]
  
  const path = new Path(pts, true)
  const pathStr = path.buildSpline(0.3)
  svg.makePath(pathStr, 'rgba(255, 0, 0, 0.1)', '#ff0000', 2)

  // React to control changes
  onControlChange((newControls) => {
    syncControlState(controlState, newControls)
    // Update your sketch based on controlState values
    // You might need to clear and redraw, or update elements directly
  })

  registerAction('download-svg', () => {
    svg.save(utils.seed.current, 'svg-sketch')
  })

  // Cleanup function - called when project is unmounted
  return () => {
    svg.stage.remove()
  }
}
