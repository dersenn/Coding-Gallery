import type { CleanupFunction, ProjectContext, Vec } from '~/types/project'
import { resolveCanvas } from '~/types/project'
import p5 from 'p5'
import { shortcuts } from '~/utils/shortcuts'

/**
 * 220131 3D Dandelion (C4TA p5 migration)
 *
 * Intent:
 * - Preserve the rotating radial "dandelion" made from sphere-distributed endpoints.
 *
 * What is being tested/preserved:
 * - Legacy 4D-based random sphere-point sampling.
 * - Animated lerp from center to endpoint to create breathing radial segments.
 *
 * Non-goals:
 * - Not a mathematically uniform spherical distribution guarantee; legacy visual feel is prioritized.
 */
type SpherePoint = {
  pos: Vec
  size: number
  dist: number
}

class RandomSpherePoints {
  points: SpherePoint[]
  center: Vec
  rndRange: (min: number, max: number) => number
  map: (value: number, start1: number, stop1: number, start2: number, stop2: number) => number
  vLerp: (a: Vec, b: Vec, t: number) => Vec
  v: (x: number, y: number, z?: number) => Vec

  constructor(
    pointCount: number,
    sphereRadius: number,
    center: Vec,
    rndRange: (min: number, max: number) => number,
    map: (value: number, start1: number, stop1: number, start2: number, stop2: number) => number,
    vLerp: (a: Vec, b: Vec, t: number) => Vec,
    v: (x: number, y: number, z?: number) => Vec
  ) {
    this.points = []
    this.center = center
    this.rndRange = rndRange
    this.map = map
    this.vLerp = vLerp
    this.v = v

    for (let p = 0; p < pointCount; p++) {
      this.points.push(this.randomSpherePoint(sphereRadius))
    }
  }

  draw(p: p5) {
    for (let i = 0; i < this.points.length; i++) {
      const speed = p.frameCount / 50
      const pt = this.points[i]!
      const quarter = this.vLerp(this.center, pt.pos, 0.25)
      const animatedTip = this.vLerp(quarter, pt.pos, this.map(Math.sin(speed), -1, 1, 0, 1))

      p.stroke(0, 255, 0)
      p.strokeWeight(1)
      p.beginShape()
      p.vertex(this.center.x, this.center.y, this.center.z)
      p.vertex(animatedTip.x, animatedTip.y, animatedTip.z)
      p.endShape()

      p.ambientMaterial(0, 255, 0)
      p.noStroke()
      p.push()
      p.translate(animatedTip.x, animatedTip.y, animatedTip.z)
      p.sphere(pt.size)
      p.pop()
    }
  }

  randomSpherePoint(sphereRadius: number): SpherePoint {
    // Step 1: pick a random normalized 4D direction (legacy algorithm).
    let a = 0
    let b = 0
    let c = 0
    let d = 0
    let k = 99
    while (k >= 1) {
      a = this.rndRange(-1, 1)
      b = this.rndRange(-1, 1)
      c = this.rndRange(-1, 1)
      d = this.rndRange(-1, 1)
      k = a * a + b * b + c * c + d * d
    }

    // Step 2: preserve original radius scaling behavior.
    const radiusScale = this.rndRange(sphereRadius / 3, sphereRadius)
    const scaledK = k / radiusScale

    return {
      pos: this.v(
        (2 * (b * d + a * c)) / scaledK,
        (2 * (c * d - a * b)) / scaledK,
        (a * a + d * d - b * b - c * c) / scaledK
      ),
      size: this.rndRange(5, 25),
      dist: scaledK
    }
  }
}

export const canvas = 'full'

export async function init(
  container: HTMLElement,
  context: ProjectContext
): Promise<CleanupFunction> {
  const { utils } = context
  const { rndRange, map, v, vLerp } = shortcuts(utils)

  const { el, width, height } = resolveCanvas(container, 'full')
  let sphereRadius = 0
  let rsp: RandomSpherePoints
  const center = v(0, 0, 0)
  const randomPoints = 100
  const rotX = 0.005
  const rotY = 0.005

  const sketch = new p5((p) => {
    p.setup = () => {
      p.createCanvas(width, height, p.WEBGL)
      const minSide = Math.min(p.width, p.height)
      sphereRadius = minSide / 2.5
      rsp = new RandomSpherePoints(randomPoints, sphereRadius, center, rndRange, map, vLerp, v)
    }

    p.draw = () => {
      p.background(0)
      p.orbitControl()
      p.pointLight(0, 255, 0, 0, 0, 0)

      p.push()
      p.rotateX(p.frameCount * rotX)
      p.rotateY(p.frameCount * rotY)
      rsp.draw(p)
      p.pop()
    }

    p.windowResized = () => {
      p.resizeCanvas(el.clientWidth, el.clientHeight)
    }
  }, el)

  return () => {
    sketch.remove()
  }
}
