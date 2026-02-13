import type { ProjectContext, CleanupFunction } from '~/types/project'
import p5 from 'p5'

/**
 * Project Template
 * 
 * This is a minimal p5.js project template.
 * Copy this folder and modify to create your own projects.
 * 
 * Available context:
 * - controls: Reactive control values defined in projects.json
 * - utils: Global utilities (noise, seed, math)
 * - onControlChange: Register callback for control updates
 */

export async function init(
  container: HTMLElement,
  context: ProjectContext
): Promise<CleanupFunction> {
  const { controls, utils, onControlChange } = context

  const sketch = new p5((p) => {
    p.setup = () => {
      p.createCanvas(container.clientWidth, container.clientHeight)
      p.background(220)
    }

    p.draw = () => {
      // Your sketch code here
      p.background(220)
      
      // Example: draw a circle
      p.fill(0)
      p.circle(p.width / 2, p.height / 2, 50)
      
      // Example: use global utilities
      // const noise = utils.noise.perlin2D(p.frameCount * 0.01, 0)
      // const x = utils.math.map(noise, 0, 1, 0, p.width)
      // p.circle(x, p.height / 2, 20)
    }

    p.windowResized = () => {
      p.resizeCanvas(container.clientWidth, container.clientHeight)
    }

    // React to control changes
    onControlChange((newControls) => {
      // Update your sketch based on new control values
      // Example: const speed = newControls.speed as number
    })
  }, container)

  // Cleanup function - called when project is unmounted
  return () => {
    sketch.remove()
  }
}
