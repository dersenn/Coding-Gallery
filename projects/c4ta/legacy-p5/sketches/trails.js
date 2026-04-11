import { resolveContainer } from '~/types/project'
import p5 from 'p5'
import { syncControlState } from '~/composables/useControls'
import { shortcuts } from '~/utils/shortcuts'

/**
 * Trails (C4TA p5 migration)
 *
 * Intent:
 * - Preserve the original cursor-following particle with fading history circles.
 *
 * What is being tested/preserved:
 * - A simple time-ordered memory buffer rendered as progressively larger ellipses.
 * - Direct mapping from mouse position to trail head each frame.
 */
class ParticleTrail {
  constructor(x, y, size, memory, v) {
    this.x = x
    this.y = y
    this.size = size
    this.memory = memory
    this.history = []
    this.v = v
  }

  update(mouseX, mouseY) {
    this.x = mouseX
    this.y = mouseY
    this.history.push(this.v(this.x, this.y))
    if (this.history.length > this.memory) {
      this.history.splice(0, this.history.length - this.memory)
    }
  }

  draw(p) {
    const sizeStep = this.size / Math.max(1, this.memory)
    for (let i = 0; i < this.history.length; i++) {
      const pos = this.history[i]
      p.ellipse(pos.x, pos.y, i * sizeStep)
    }
  }
}

export async function init(container, context) {
  const { controls, theme, onControlChange } = context
  const { v } = shortcuts(context.utils)

  const controlState = {
    memory: controls.memory,
    size: controls.size
  }

  const { el, width, height } = resolveContainer(container, 'full')
  let trail

  const sketch = new p5((p) => {
    p.setup = () => {
      p.createCanvas(width, height)
      trail = new ParticleTrail(p.mouseX, p.mouseY, controlState.size, controlState.memory, v)
    }

    p.draw = () => {
      p.background(theme.background)
      p.noStroke()
      p.fill(theme.foreground)
      trail.memory = controlState.memory
      trail.size = controlState.size
      trail.update(p.mouseX, p.mouseY)
      trail.draw(p)
    }

    p.windowResized = () => {
      p.resizeCanvas(el.clientWidth, el.clientHeight)
    }

    onControlChange((newControls) => {
      syncControlState(controlState, newControls)
    })
  }, el)

  return () => {
    sketch.remove()
  }
}
