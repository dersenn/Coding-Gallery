import type { CleanupFunction, ProjectContext, ProjectControlDefinition } from '~/types/project'
import { Grid, Cell, shortcuts } from '~/types/project'
import p5 from 'p5'
import { syncControlState } from '~/composables/useControls'

/**
 * Grid Division Pixels 3 (C4TA p5 migration)
 *
 * Intent:
 * - Preserve recursive 2x2 subdivision visuals plus moving-container accumulation.
 *
 * What is being tested/preserved:
 * - Chance-based recursive branch stopping.
 * - Temporal layering effect from repeatedly stamping a shifted recursive container.
 *
 * Non-goals:
 * - Not a deterministic static tiling export by default; accumulation over time is core behavior.
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
        label: 'Levels',
        key: 'levels',
        default: 2,
        min: 1,
        max: 5,
        step: 1
      },
      {
        type: 'slider',
        label: 'Branch Stop Chance',
        key: 'branchStopChance',
        default: 50,
        min: 0,
        max: 100,
        step: 1
      },
      {
        type: 'slider',
        label: 'Frame Rate',
        key: 'fps',
        default: 3,
        min: 1,
        max: 24,
        step: 1
      }
    ]
  }
]

export async function init(
  container: HTMLElement,
  context: ProjectContext
): Promise<CleanupFunction> {
  const { controls, utils, theme, onControlChange } = context
  const { rndInt } = shortcuts(utils)

  const controlState = {
    levels: controls.levels as number,
    branchStopChance: controls.branchStopChance as number,
    fps: controls.fps as number
  }

  const rootCols = 2
  const rootRows = 2
  const activePalette = theme.palette.slice(0, 3)

  // Step 1: sample from the active theme palette for each tile fill.
  const randomColor = () => {
    const index = rndInt(0, Math.max(0, activePalette.length - 1))
    return activePalette[index] ?? theme.foreground
  }

  const sketch = new p5((p) => {
    // Step 2: render a recursive 2x2 subdivision region as leaf Cells.
    const drawRecursiveTiles = (x: number, y: number, w: number, h: number) => {
      const grid = new Grid({
        cols: rootCols,
        rows: rootRows,
        width: w,
        height: h,
        x,
        y,
        utils
      })

      const cells = grid.subdivide({
        maxLevel: Math.max(1, Math.floor(controlState.levels)),
        chance: controlState.branchStopChance,
        subdivisionCols: rootCols,
        subdivisionRows: rootRows
      })

      // Grid.subdivide() returns Cell leaves; draw each cell directly.
      p.noStroke()
      for (const cell of cells as Cell[]) {
        p.fill(randomColor())
        p.rect(cell.x, cell.y, cell.width, cell.height)
      }
    }

    // Step 3: draw a moving recursive container each frame (legacy accumulation behavior).
    const drawMovingContainer = () => {
      const levels = Math.max(1, Math.floor(controlState.levels))
      const maxDivisionsX = rootCols ** (levels + 1)
      const maxDivisionsY = rootRows ** (levels + 1)
      const minTileW = p.width / maxDivisionsX
      const minTileH = p.height / maxDivisionsY

      const containerSlotX = rndInt(0, Math.floor(maxDivisionsX / rootCols))
      const containerSlotY = rndInt(0, Math.floor(maxDivisionsY / rootRows))
      const containerPosX = containerSlotX * minTileW
      const containerPosY = containerSlotY * minTileH

      drawRecursiveTiles(
        containerPosX,
        containerPosY,
        p.width / rootCols,
        p.height / rootRows
      )
    }

    p.setup = () => {
      // Step 4: initialize canvas and paint the base recursive grid once.
      p.createCanvas(container.clientWidth, container.clientHeight)
      p.frameRate(Math.max(1, Math.floor(controlState.fps)))
      drawRecursiveTiles(0, 0, p.width, p.height)
    }

    p.draw = () => {
      // Keep legacy accumulation behavior: draw moving recursive container each frame.
      drawMovingContainer()
    }

    p.windowResized = () => {
      p.resizeCanvas(container.clientWidth, container.clientHeight)
      p.background(theme.background)
      drawRecursiveTiles(0, 0, p.width, p.height)
    }

    onControlChange((newControls) => {
      // Step 5: apply control updates and redraw the base layer deterministically.
      const prevFps = controlState.fps
      syncControlState(controlState, newControls)

      if (controlState.fps !== prevFps) {
        p.frameRate(Math.max(1, Math.floor(controlState.fps)))
      }

      p.background(theme.background)
      drawRecursiveTiles(0, 0, p.width, p.height)
    })
  }, container)

  return () => {
    sketch.remove()
  }
}
