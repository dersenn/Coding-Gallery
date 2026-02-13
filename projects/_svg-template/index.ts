import type { ProjectContext, CleanupFunction } from '~/types/project'
import { SVG, Path } from '~/utils/svg'
import { shortcuts } from '~/utils/shortcuts'

/**
 * SVG Project Template
 * 
 * This is a minimal SVG template using the ported engine from your original work.
 * Copy this folder and modify to create your own SVG-based generative art projects.
 * 
 * Available context:
 * - controls: Reactive control values defined in projects.json
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

export async function init(
  container: HTMLElement,
  context: ProjectContext
): Promise<CleanupFunction> {
  const { controls, utils, onControlChange } = context
  const { v, rnd, map, rad } = shortcuts(utils)

  // Create SVG canvas
  const svg = new SVG({
    parent: container,
    id: 'svg-sketch',
    // width and height are optional, defaults to container size
  })

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

  // React to control changes (if you have controls in projects.json)
  onControlChange((newControls) => {
    // Update your sketch based on new control values
    // You might need to clear and redraw, or update elements directly
  })

  // Cleanup function - called when project is unmounted
  return () => {
    svg.stage.remove()
  }
}
