import type { ProjectContext, CleanupFunction, ControlDefinition } from '~/types/project'
import p5 from 'p5'
import { syncControlState } from '~/composables/useControls'

/**
 * Project Template
 * 
 * This is a minimal p5.js project template.
 * Copy this folder and modify to create your own projects.
 * 
 * Available context:
 * - controls: Reactive control values (defined below)
 * - utils: Global utilities (noise, seed, math)
 * - theme: Global color tokens (with optional project overrides)
 * - onControlChange: Register callback for control updates
 * - registerAction: Register contextual action handlers
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

// Optional: override only the color tokens your sketch needs
// export const theme = {
//   background: '#111827',
//   foreground: '#e2e8f0',
//   annotation: '#475569',
//   palette: ['#22d3ee', '#a78bfa', '#f472b6']
// }

// Optional: expose contextual actions shown in the control panel
// export const actions = [
//   { key: 'do-something', label: 'Do Something' }
// ] satisfies import('~/types/project').ProjectActionDefinition[]

export async function init(
  container: HTMLElement,
  context: ProjectContext
): Promise<CleanupFunction> {
  const { controls, utils, theme, onControlChange } = context
  const controlState = { ...controls }

  const sketch = new p5((p) => {
    p.setup = () => {
      p.createCanvas(container.clientWidth, container.clientHeight)
      p.background(theme.background)
    }

    p.draw = () => {
      // Your sketch code here
      p.background(theme.background)
      
      // Example: draw a circle
      p.fill(theme.foreground)
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
      syncControlState(controlState, newControls)
      // Example: const speed = controlState.speed as number
    })

    // Optional: wire handlers for actions exported above
    // context.registerAction('do-something', () => {
    //   console.log('Action triggered')
    // })
  }, container)

  // Cleanup function - called when project is unmounted
  return () => {
    sketch.remove()
  }
}
