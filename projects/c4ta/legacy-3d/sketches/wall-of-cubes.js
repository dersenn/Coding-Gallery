import { resolveContainer } from '~/types/project'
import p5 from 'p5'
import { syncControlState } from '~/composables/useControls'
import { shortcuts } from '~/utils/shortcuts'

/**
 * Wall Of Cubes (C4TA p5 migration)
 *
 * Intent:
 * - Preserve the dense cube field with animated noise elevation and dual moving lights.
 *
 * What is being tested/preserved:
 * - Seeded noise-driven z displacement across a centered WEBGL grid.
 * - Color-separated point-light sweep (green/red) as the main depth cue.
 */
export async function init(container, context) {
  const { controls, onControlChange, utils } = context
  const { map, noise2, v } = shortcuts(utils)

  const controlState = {
    gridSize: controls.gridSize,
    overallSpeed: controls.overallSpeed,
    lightSweep: controls.lightSweep,
    noiseAmplitude: controls.noiseAmplitude,
    elevationScale: controls.elevationScale
  }

  const { el, width, height } = resolveContainer(container, 'full')

  let gridSize = Math.max(1, Math.floor(controlState.gridSize))
  let cellSize = 0
  let origin = v(0, 0)

  const recomputeGeometry = (p, nextGridSize) => {
    const minSide = Math.min(p.width, p.height)
    cellSize = minSide / nextGridSize
    const gridSpan = cellSize * nextGridSize
    origin = v(-(gridSpan / 2) + cellSize / 2, -(gridSpan / 2) + cellSize / 2)
  }

  const sketch = new p5((p) => {
    p.setup = () => {
      p.createCanvas(width, height, p.WEBGL)
      recomputeGeometry(p, gridSize)
    }

    p.draw = () => {
      p.background(0)
      p.noStroke()

      const nextGridSize = Math.max(1, Math.floor(controlState.gridSize))
      if (nextGridSize !== gridSize) {
        gridSize = nextGridSize
        recomputeGeometry(p, gridSize)
      }

      const frame = p.frameCount * controlState.overallSpeed
      const speed = frame / 750
      const amplitude = p.width * controlState.noiseAmplitude

      const light1X = map(Math.cos(speed), -1, 1, -p.width, p.width)
      const light1Y = map(Math.sin(frame) * controlState.lightSweep, -1, 1, -p.height, p.height)
      const light2X = map(Math.sin(frame) * controlState.lightSweep, -1, 1, -p.width, p.width)
      const light2Y = map(Math.cos(speed), -1, 1, -p.height, p.height)

      p.pointLight(0, 255, 0, light1X, light1Y, 0)
      p.pointLight(255, 0, 0, light2X, light2Y, 0)

      for (let x = 0; x < gridSize; x++) {
        for (let y = 0; y < gridSize; y++) {
          const noiseHeight = noise2((x + 1) * speed, (y + 1) * speed) * amplitude

          p.push()
          p.translate(
            origin.x + x * cellSize,
            origin.y + y * cellSize,
            -p.width / gridSize + noiseHeight * controlState.elevationScale
          )
          p.ambientMaterial(255, 255, 255)
          p.box(cellSize)
          p.pop()
        }
      }
    }

    p.windowResized = () => {
      p.resizeCanvas(el.clientWidth, el.clientHeight)
      recomputeGeometry(p, gridSize)
    }

    onControlChange((newControls) => {
      syncControlState(controlState, newControls)
    })
  }, el)

  return () => {
    sketch.remove()
  }
}
