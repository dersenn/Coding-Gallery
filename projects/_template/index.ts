import type { ProjectContext, CleanupFunction, ControlDefinition } from '~/types/project'
import p5 from 'p5'

/**
 * Project Template
 * 
 * This is a minimal p5.js project template.
 * Copy this folder and modify to create your own projects.
 * 
 * Available context:
 * - controls: Reactive control values (defined below)
 * - utils: Global utilities (noise, seed, math)
 * - onControlChange: Register callback for control updates
 */

// Export controls - define them here in your sketch
export const controls: ControlDefinition[] = [
  // Example controls (uncomment and modify as needed):
  // {
  //   type: 'slider',
  //   label: 'Speed',
  //   key: 'speed',
  //   default: 1,
  //   min: 0.1,
  //   max: 5,
  //   step: 0.1
  // },
  // {
  //   type: 'toggle',
  //   label: 'Show Grid',
  //   key: 'showGrid',
  //   default: false
  // },
  // {
  //   type: 'color',
  //   label: 'Color',
  //   key: 'color',
  //   default: '#ff0000'
  // }
]

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
