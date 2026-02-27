import type { CleanupFunction, ProjectContext, ProjectControlDefinition } from '~/types/project'
import { Grid } from '~/types/project'
import p5 from 'p5'
import { syncControlState } from '~/composables/useControls'

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

  const controlState = {
    levels: controls.levels as number,
    branchStopChance: controls.branchStopChance as number,
    fps: controls.fps as number
  }

  const rootCols = 2
  const rootRows = 2

  const randomColor = () => {
    const index = utils.seed.randomInt(0, Math.max(0, theme.palette.length - 1))
    return theme.palette[index] ?? theme.foreground
  }

  const sketch = new p5((p) => {
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

      p.noStroke()
      for (const cell of cells) {
        p.fill(randomColor())
        p.rect(cell.x, cell.y, cell.width, cell.height)
      }
    }

    const drawMovingContainer = () => {
      const levels = Math.max(1, Math.floor(controlState.levels))
      const maxDivisionsX = rootCols ** (levels + 1)
      const maxDivisionsY = rootRows ** (levels + 1)
      const minTileW = p.width / maxDivisionsX
      const minTileH = p.height / maxDivisionsY

      const containerPosX =
        Math.floor(utils.seed.randomRange(0, maxDivisionsX / rootCols + 1)) * minTileW
      const containerPosY =
        Math.floor(utils.seed.randomRange(0, maxDivisionsY / rootRows + 1)) * minTileH

      drawRecursiveTiles(
        containerPosX,
        containerPosY,
        p.width / rootCols,
        p.height / rootRows
      )
    }

    p.setup = () => {
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
