import type { CleanupFunction, ProjectContext, Vec } from '~/types/project'
import p5 from 'p5'
import { shortcuts } from '~/utils/shortcuts'

/**
 * Clickclass 2 / Clicky Polygon (C4TA p5 migration)
 *
 * Intent:
 * - Preserve the legacy moving-node polygon that grows via mouse clicks.
 *
 * What is being tested/preserved:
 * - Continuous node motion with edge reflection.
 * - Immediate structural change when a clicked node is injected.
 *
 * Non-goals:
 * - Not a constrained triangulation or mesh tool; polygon self-intersections are accepted behavior.
 */
class MovingNode {
  pos: Vec
  radius: number
  speed: Vec

  constructor(
    pos: Vec,
    speed: Vec,
    radius = 5
  ) {
    this.pos = pos
    this.radius = radius
    this.speed = speed
  }

  checkBounds(width: number, height: number) {
    // Reflect velocity on edges to preserve the original bouncing motion.
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
  const { v, rndInt, rndRange } = shortcuts(utils)

  const randomSignedSpeed = () => {
    const direction = rndRange(0, Math.PI * 2)
    const speedFactor = rndRange(1, 7)
    return v(
      Math.sin(direction) * speedFactor,
      Math.cos(direction) * speedFactor
    )
  }

  const createNode = (x: number, y: number) => {
    const speed = randomSignedSpeed()
    nodes.push(new MovingNode(v(x, y), speed))
  }

  const sketch = new p5((p) => {
    p.setup = () => {
      // Step 1: seed initial moving node set.
      p.createCanvas(container.clientWidth, container.clientHeight)

      const initialCount = rndInt(3, 15)
      for (let i = 0; i < initialCount; i++) {
        createNode(rndRange(0, p.width), rndRange(0, p.height))
      }
    }

    p.draw = () => {
      // Step 2: redraw polygon from current node positions, then advance simulation.
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
      // Step 3: clicking injects a new node into the running structure.
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
