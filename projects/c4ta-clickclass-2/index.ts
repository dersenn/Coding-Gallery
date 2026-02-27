import type { CleanupFunction, ProjectContext } from '~/types/project'
import p5 from 'p5'

interface NodePoint {
  x: number
  y: number
}

class MovingNode {
  pos: NodePoint
  radius: number
  speed: NodePoint

  constructor(
    x: number,
    y: number,
    speedX: number,
    speedY: number,
    radius = 5
  ) {
    this.pos = { x, y }
    this.radius = radius
    this.speed = { x: speedX, y: speedY }
  }

  checkBounds(width: number, height: number) {
    if (this.pos.x < this.radius || this.pos.x > width - this.radius) {
      this.speed.x *= -1
    }
    if (this.pos.y < this.radius || this.pos.y > height - this.radius) {
      this.speed.y *= -1
    }
  }

  update() {
    this.pos.x += this.speed.x
    this.pos.y += this.speed.y
  }
}

export async function init(
  container: HTMLElement,
  context: ProjectContext
): Promise<CleanupFunction> {
  const { utils, theme } = context
  const nodes: MovingNode[] = []

  const rand = (min: number, max: number) => utils.seed.randomRange(min, max)

  const randomSignedSpeed = () => {
    const direction = rand(0, Math.PI * 2)
    const speedFactor = rand(1, 7)
    return {
      x: Math.sin(direction) * speedFactor,
      y: Math.cos(direction) * speedFactor
    }
  }

  const createNode = (x: number, y: number) => {
    const speed = randomSignedSpeed()
    nodes.push(new MovingNode(x, y, speed.x, speed.y))
  }

  const sketch = new p5((p) => {
    p.setup = () => {
      p.createCanvas(container.clientWidth, container.clientHeight)

      const initialCount = Math.floor(rand(3, 39))
      for (let i = 0; i < initialCount; i++) {
        createNode(rand(0, p.width), rand(0, p.height))
      }
    }

    p.draw = () => {
      p.background(theme.background)
      p.noStroke()
      p.fill(theme.foreground)
      p.beginShape()
      for (const node of nodes) {
        p.vertex(node.pos.x, node.pos.y)
        node.checkBounds(p.width, p.height)
        node.update()
      }
      p.endShape()
    }

    p.mouseClicked = () => {
      if (p.mouseX >= 0 && p.mouseX <= p.width && p.mouseY >= 0 && p.mouseY <= p.height) {
        createNode(p.mouseX, p.mouseY)
      }
    }

    p.windowResized = () => {
      p.resizeCanvas(container.clientWidth, container.clientHeight)
    }
  }, container)

  return () => {
    sketch.remove()
  }
}
