import type { ProjectContext, CleanupFunction, ControlDefinition } from '~/types/project'
import { SVG } from '~/utils/svg'
import { shortcuts } from '~/utils/shortcuts'

/**
 * Animated SVG Template
 * 
 * Shows how to use requestAnimationFrame for SVG animations.
 * Minimal TypeScript - just enough for strict mode compliance.
 */

// Export controls - define them here in your sketch
export const controls: ControlDefinition[] = [
  // Example controls for animation (uncomment and modify as needed):
  // {
  //   type: 'slider',
  //   label: 'Speed',
  //   key: 'speed',
  //   default: 1,
  //   min: 0.1,
  //   max: 5,
  //   step: 0.1
  // }
]

export async function init(
  container: HTMLElement,
  context: ProjectContext
): Promise<CleanupFunction> {
  const { controls, utils, onControlChange } = context
  const { v, rnd, map, rad, noise2 } = shortcuts(utils)

  // Create SVG canvas
  // Option 1: Full container size (default)
  const svg = new SVG({
    parent: container,
    id: 'animated-sketch',
  })
  
  // Option 2: Square canvas (uncomment for square-based sketches)
  // const size = Math.min(container.clientWidth, container.clientHeight)
  // container.style.display = 'flex'
  // container.style.alignItems = 'center'
  // container.style.justifyContent = 'center'
  // const svg = new SVG({
  //   parent: container,
  //   id: 'animated-sketch',
  //   width: size,
  //   height: size
  // })

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
    const circle = svg.makeCircle(
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
    
    frameCount++
    
    // Update circles
    circles.forEach((c, i) => {
      const x = svg.c.x + Math.cos(c.angle + frameCount * c.speed) * c.radius
      const y = svg.c.y + Math.sin(c.angle + frameCount * c.speed) * c.radius
      
      // Update SVG attributes directly (convert numbers to strings)
      c.el.setAttribute('cx', x.toString())
      c.el.setAttribute('cy', y.toString())
      
      // Optional: use noise for organic movement
      const noiseVal = noise2(x * 0.01, y * 0.01)
      const r = map(noiseVal, -1, 1, 5, 15)
      c.el.setAttribute('r', r.toString())
    })

    // Continue animation loop
    animationId = requestAnimationFrame(animate)
  }

  // Start animation
  animate()

  // React to control changes
  onControlChange((newControls: any) => {
    // Update your animation based on controls
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
      svg.save(utils.seed.current, 'svg-animated')
    }
  }
  
  window.addEventListener('keydown', handleKeyPress)

  // Cleanup function - IMPORTANT: cancel animation frame!
  return () => {
    window.removeEventListener('keydown', handleKeyPress)
    isRunning = false
    if (animationId) {
      cancelAnimationFrame(animationId)
    }
    svg.stage.remove()
  }
}
