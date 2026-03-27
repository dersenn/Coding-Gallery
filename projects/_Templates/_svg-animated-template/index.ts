import type {
  ProjectContext,
  CleanupFunction,
  ProjectControlDefinition,
  ProjectActionDefinition
} from '~/types/project'
import { SVG, shortcuts, resolveContainer } from '~/types/project'
import { syncControlState } from '~/composables/useControls'

/**
 * Animated SVG Template
 * 
 * Shows how to use requestAnimationFrame for SVG animations.
 * Minimal TypeScript - just enough for strict mode compliance.
 */

// Export controls - define them here in your sketch
export const controls: ProjectControlDefinition[] = [
  // Example controls for animation (uncomment and modify as needed):
  // {
  //   type: 'group',
  //   id: 'animation',
  //   label: 'Animation',
  //   controls: [
  //     {
  //       type: 'slider',
  //       label: 'Speed',
  //       key: 'speed',
  //       default: 1,
  //       min: 0.1,
  //       max: 5,
  //       step: 0.1
  //     }
  //   ]
  // }
]

export const actions: ProjectActionDefinition[] = [
  {
    key: 'download-svg',
    label: 'Download SVG'
  }
]

// Declarative container sizing — mirrors the resolveContainer() call in init().
// export const container = 'square'
// export const container = '4:3'
export const container = 'full'

export async function init(
  container: HTMLElement,
  context: ProjectContext
): Promise<CleanupFunction> {
  const { controls, utils, runtime, onControlChange, registerAction } = context
  const { v, rnd, map, rad, simplex2 } = shortcuts(utils)
  const controlState = { ...controls }

  // Enable the pause/play button in the viewer shell.
  runtime?.enablePause?.()

  // resolveContainer sets up container centering and returns the sized wrapper element.
  // Switch the mode string to change the layout — no other code needs to change.
  //
  //   'full'        fills the viewport (default)
  //   'square'      centered square
  //   '4:3'         centered rect at a custom ratio (any 'W:H' string works)
  //
  // Add padding for a responsive inset:
  //   resolveContainer(container, { mode: 'square', padding: '2vmin' })
  //   → result.padding is the resolved px value, useful for grid gaps / margins
  const { el, width, height } = resolveContainer(container, 'full')
  const svg = new SVG({ parent: el, id: 'animated-sketch', width, height })

  // Animation state
  let frameCount = 0
  let animationId: number | null = null
  let isRunning = true

  // Your animated elements
  const circles: Array<{
    el: SVGCircleElement
    angle: number
    speed: number
    radius: number
  }> = []
  
  for (let i = 0; i < 20; i++) {
    const circle = svg.circle(
      v(svg.w / 2, svg.h / 2),
      10,
      'none',
      '#0f0',
      2
    )
    circles.push({
      el: circle,
      angle: i * (Math.PI * 2 / 20),
      speed: rnd() * 0.02 + 0.01,
      radius: rnd() * 100 + 50,
    })
  }

  // Animation loop
  function animate() {
    if (!isRunning) return

    if (!runtime?.paused) {
      frameCount++

      // Update circles
      circles.forEach((c) => {
        const x = svg.c.x + Math.cos(c.angle + frameCount * c.speed) * c.radius
        const y = svg.c.y + Math.sin(c.angle + frameCount * c.speed) * c.radius

        // Update SVG attributes directly (convert numbers to strings)
        c.el.setAttribute('cx', x.toString())
        c.el.setAttribute('cy', y.toString())

        // Optional: use noise for organic movement
        const noiseVal = simplex2(x * 0.01, y * 0.01)
        const r = map(noiseVal, -1, 1, 5, 15)
        c.el.setAttribute('r', r.toString())
      })
    }

    // Continue animation loop
    animationId = requestAnimationFrame(animate)
  }

  // Start animation
  animate()

  // React to control changes
  onControlChange((newControls) => {
    syncControlState(controlState, newControls)
    // Update your animation based on controls
  })

  registerAction('download-svg', () => {
    svg.save(utils.seed.current, 'svg-animated')
  })

  // Cleanup function - IMPORTANT: cancel animation frame!
  return () => {
    isRunning = false
    if (animationId) {
      cancelAnimationFrame(animationId)
    }
    svg.stage.remove()
  }
}
