import type { CleanupFunction, ProjectContext, ProjectControlDefinition, Vec } from '~/types/project'
import p5 from 'p5'
import { syncControlState } from '~/composables/useControls'
import { shortcuts } from '~/utils/shortcuts'

class ParticleTrail {
  x: number
  y: number
  size: number
  memory: number
  history: Vec[]
  v: (x: number, y: number, z?: number) => Vec

  constructor(
    x: number,
    y: number,
    size: number,
    memory: number,
    v: (x: number, y: number, z?: number) => Vec
  ) {
    this.x = x
    this.y = y
    this.size = size
    this.memory = memory
    this.history = []
    this.v = v
  }

  update(mouseX: number, mouseY: number) {
    this.x = mouseX
    this.y = mouseY
    this.history.push(this.v(this.x, this.y))
    if (this.history.length > this.memory) {
      this.history.splice(0, this.history.length - this.memory)
    }
  }

  draw(p: p5) {
    const sizeStep = this.size / Math.max(1, this.memory)
    for (let i = 0; i < this.history.length; i++) {
      const pos = this.history[i]!
      p.ellipse(pos.x, pos.y, i * sizeStep)
    }
  }
}

export const controls: ProjectControlDefinition[] = [
  {
    type: 'group',
    id: 'trail',
    label: 'Trail',
    collapsible: true,
    defaultOpen: true,
    controls: [
      {
        type: 'slider',
        label: 'Memory',
        key: 'memory',
        default: 60,
        min: 5,
        max: 200,
        step: 1
      },
      {
        type: 'slider',
        label: 'Max Size',
        key: 'size',
        default: 30,
        min: 4,
        max: 120,
        step: 1
      }
    ]
  }
]

export async function init(
  container: HTMLElement,
  context: ProjectContext
): Promise<CleanupFunction> {
  const { controls, theme, onControlChange } = context
  const { v } = shortcuts(context.utils)

  const controlState = {
    memory: controls.memory as number,
    size: controls.size as number
  }

  let trail: ParticleTrail

  const sketch = new p5((p) => {
    p.setup = () => {
      p.createCanvas(container.clientWidth, container.clientHeight)
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
      p.resizeCanvas(container.clientWidth, container.clientHeight)
    }

    onControlChange((newControls) => {
      syncControlState(controlState, newControls)
    })
  }, container)

  return () => {
    sketch.remove()
  }
}
