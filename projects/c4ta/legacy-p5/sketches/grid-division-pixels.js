import { Grid, shortcuts, resolveContainer } from '~/types/project'
import p5 from 'p5'
import { syncControlState } from '~/composables/useControls'

/**
 * Grid Division Pixels (C4TA p5 migration)
 *
 * Intent:
 * - Preserve recursive 2x2 subdivision visuals plus moving-container accumulation.
 *
 * What is being tested/preserved:
 * - Chance-based recursive branch stopping.
 * - Temporal layering effect from repeatedly stamping a shifted recursive container.
 */
export async function init(container, context) {
  const { controls, utils, theme, onControlChange } = context
  const { rndInt } = shortcuts(utils)

  const controlState = {
    levels: controls.levels,
    branchStopChance: controls.branchStopChance,
    fps: controls.fps
  }

  const rootCols = 2
  const rootRows = 2
  const activePalette = theme.palette.slice(0, 3)

  const randomColor = () => {
    const index = rndInt(0, Math.max(0, activePalette.length - 1))
    return activePalette[index] ?? theme.foreground
  }

  const { el, width, height } = resolveContainer(container, 'full')

  const sketch = new p5((p) => {
    const drawRecursiveTiles = (x, y, w, h) => {
      const grid = new Grid({
        cols: rootCols,
        rows: rootRows,
        width: w,
        height: h,
        x,
        y,
        utils
      })

      const terminals = grid.subdivide({
        maxLevel: Math.max(1, Math.floor(controlState.levels)),
        chance: controlState.branchStopChance,
        subdivisionCols: rootCols,
        subdivisionRows: rootRows
      })

      p.noStroke()
      for (const cell of terminals) {
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
      p.createCanvas(width, height)
      p.frameRate(Math.max(1, Math.floor(controlState.fps)))
      drawRecursiveTiles(0, 0, p.width, p.height)
    }

    p.draw = () => {
      drawMovingContainer()
    }

    p.windowResized = () => {
      p.resizeCanvas(el.clientWidth, el.clientHeight)
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
  }, el)

  return () => {
    sketch.remove()
  }
}
