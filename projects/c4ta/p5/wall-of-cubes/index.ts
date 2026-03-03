import type { CleanupFunction, ProjectContext, ProjectControlDefinition, Vec } from '~/types/project'
import { resolveCanvas } from '~/types/project'
import p5 from 'p5'
import { syncControlState } from '~/composables/useControls'
import { shortcuts } from '~/utils/shortcuts'

/**
 * 220128 3D Cubes / Wall Of Cubes (C4TA p5 migration)
 *
 * Intent:
 * - Preserve the dense cube field with animated noise elevation and dual moving lights.
 *
 * What is being tested/preserved:
 * - Seeded noise-driven z displacement across a centered WEBGL grid.
 * - Color-separated point-light sweep (green/red) as the main depth cue.
 *
 * Non-goals:
 * - Not a physically based lighting study; stylized light choreography is intentional.
 */
export const controls: ProjectControlDefinition[] = [
  {
    type: 'group',
    id: 'grid',
    label: 'Grid',
    collapsible: true,
    defaultOpen: true,
    controls: [
      {
        type: 'slider',
        label: 'Grid Size',
        key: 'gridSize',
        default: 11,
        min: 4,
        max: 30,
        step: 1
      }
    ]
  },
  {
    type: 'group',
    id: 'motion',
    label: 'Motion',
    collapsible: true,
    defaultOpen: true,
    controls: [
      {
        type: 'slider',
        label: 'Overall Speed',
        key: 'overallSpeed',
        default: 0.6,
        min: 0.1,
        max: 3,
        step: 0.05
      },
      {
        type: 'slider',
        label: 'Light Sweep',
        key: 'lightSweep',
        default: 0.02,
        min: 0.001,
        max: 0.08,
        step: 0.001
      }
    ]
  },
  {
    type: 'group',
    id: 'displacement',
    label: 'Displacement',
    collapsible: true,
    defaultOpen: true,
    controls: [
      {
        type: 'slider',
        label: 'Noise Amplitude',
        key: 'noiseAmplitude',
        default: 0.6,
        min: 0.2,
        max: 3,
        step: 0.05
      },
      {
        type: 'slider',
        label: 'Elevation Scale',
        key: 'elevationScale',
        default: 0.2,
        min: 0.02,
        max: 0.8,
        step: 0.01
      }
    ]
  }
]

export const canvas = 'full'

export async function init(
  container: HTMLElement,
  context: ProjectContext
): Promise<CleanupFunction> {
  const { controls, onControlChange, utils } = context
  const { map, noise2, v } = shortcuts(utils)
  const controlState = {
    gridSize: controls.gridSize as number,
    overallSpeed: controls.overallSpeed as number,
    lightSweep: controls.lightSweep as number,
    noiseAmplitude: controls.noiseAmplitude as number,
    elevationScale: controls.elevationScale as number
  }

  const { el, width, height } = resolveCanvas(container, 'full')

  let gridSize = Math.max(1, Math.floor(controlState.gridSize))
  let cellSize = 0
  let origin: Vec = v(0, 0)

  const recomputeGeometry = (p: p5, nextGridSize: number) => {
    const minSide = Math.min(p.width, p.height)
    cellSize = minSide / nextGridSize
    const gridSpan = cellSize * nextGridSize
    // Center the active square grid in WEBGL space for non-square canvases.
    origin = v(-(gridSpan / 2) + cellSize / 2, -(gridSpan / 2) + cellSize / 2)
  }

  const sketch = new p5((p) => {
    p.setup = () => {
      p.createCanvas(width, height, p.WEBGL)
      recomputeGeometry(p, gridSize)
    }

    p.draw = () => {
      // Step 1: preserve the original dark 3D scene and lighting behavior.
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

      // Step 2: draw the full cube grid with noise-based z elevation.
      for (let x = 0; x < gridSize; x++) {
        for (let y = 0; y < gridSize; y++) {
          // Use framework seeded noise so "new seed" changes sketch output.
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
