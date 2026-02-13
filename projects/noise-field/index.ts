import type { ProjectContext, CleanupFunction } from '~/types/project'
import p5 from 'p5'

interface Particle {
  x: number
  y: number
  prevX: number
  prevY: number
  vx: number
  vy: number
}

export async function init(
  container: HTMLElement,
  context: ProjectContext
): Promise<CleanupFunction> {
  const { controls, utils, onControlChange } = context

  // Reactive state
  let particleCount = controls.particleCount as number
  let flowSpeed = controls.flowSpeed as number
  let showTrails = controls.showTrails as boolean
  let bgColor = controls.bgColor as string
  let particles: Particle[] = []

  const sketch = new p5((p) => {
    p.setup = () => {
      p.createCanvas(container.clientWidth, container.clientHeight)
      p.colorMode(p.RGB)
      initParticles()
      
      if (!showTrails) {
        p.background(bgColor)
      }
    }

    p.draw = () => {
      if (showTrails) {
        // Semi-transparent background for trails
        p.fill(bgColor + '10')
        p.noStroke()
        p.rect(0, 0, p.width, p.height)
      } else {
        p.background(bgColor)
      }

      p.stroke(255, 255, 255, 150)
      p.strokeWeight(1)

      particles.forEach((particle) => {
        // Use noise to determine flow direction
        const noiseScale = 0.005
        const angle =
          utils.noise.perlin2D(
            particle.x * noiseScale,
            particle.y * noiseScale
          ) *
          Math.PI *
          4

        // Update velocity based on flow field
        particle.vx = Math.cos(angle) * flowSpeed
        particle.vy = Math.sin(angle) * flowSpeed

        // Store previous position for trail
        particle.prevX = particle.x
        particle.prevY = particle.y

        // Update position
        particle.x += particle.vx
        particle.y += particle.vy

        // Wrap around edges
        if (particle.x < 0) particle.x = p.width
        if (particle.x > p.width) particle.x = 0
        if (particle.y < 0) particle.y = p.height
        if (particle.y > p.height) particle.y = 0

        // Draw particle trail or point
        if (showTrails && Math.abs(particle.x - particle.prevX) < 50) {
          p.line(particle.prevX, particle.prevY, particle.x, particle.y)
        } else {
          p.point(particle.x, particle.y)
        }
      })
    }

    p.windowResized = () => {
      p.resizeCanvas(container.clientWidth, container.clientHeight)
      initParticles()
    }

    function initParticles() {
      particles = []
      for (let i = 0; i < particleCount; i++) {
        particles.push({
          x: utils.seed.randomRange(0, p.width),
          y: utils.seed.randomRange(0, p.height),
          prevX: 0,
          prevY: 0,
          vx: 0,
          vy: 0,
        })
      }
    }

    function reinitIfNeeded(newCount: number) {
      if (newCount !== particleCount) {
        particleCount = newCount
        initParticles()
      }
    }

    // React to control changes
    onControlChange((newControls) => {
      const newParticleCount = newControls.particleCount as number
      flowSpeed = newControls.flowSpeed as number
      showTrails = newControls.showTrails as boolean
      bgColor = newControls.bgColor as string

      reinitIfNeeded(newParticleCount)
    })
  }, container)

  // Cleanup function
  return () => {
    sketch.remove()
  }
}
