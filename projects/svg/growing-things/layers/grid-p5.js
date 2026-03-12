import p5 from 'p5'
import { syncControlState } from '~/composables/useControls'
import { shortcuts } from '~/utils/shortcuts'
import {
  createGrowthGrid,
  growOwnership,
  resolveGrowthControls,
  resolveGrowthTargets,
  resolvePalette
} from './grid-canvas'

/**
 * p5 variation of grid-growth:
 * reuses the same seeded frontier ownership algorithm and renders via p5 rectangles.
 */
export function init(container, context) {
  const { controls, utils, theme, onControlChange } = context
  const { coin } = shortcuts(utils)
  const controlState = { ...controls }
  let sketch

  const drawGrowth = (p) => {
    const frame = { x: 0, y: 0, width: p.width, height: p.height }
    const inputs = resolveGrowthControls(controlState)
    const { palette, colorCount } = resolvePalette(theme)

    p.background(theme.background)
    const grid = createGrowthGrid(frame, inputs.shortSideDivisions, utils)
    const totalCells = grid.cells.length
    if (totalCells <= 0) return

    utils.seed.reset()
    const targets = resolveGrowthTargets(inputs, totalCells, utils)
    const ownerByIndex = growOwnership(grid, targets, colorCount, inputs.neighborhood, utils, coin)

    p.noStroke()
    for (const cell of grid.cells) {
      const owner = ownerByIndex[cell.index]
      if (owner < 0) continue
      const fill = palette[owner] ?? theme.foreground
      p.fill(fill)
      p.rect(cell.x, cell.y, cell.width, cell.height)
    }
  }

  sketch = new p5((p) => {
    p.setup = () => {
      p.createCanvas(container.clientWidth, container.clientHeight)
      p.noLoop()
      drawGrowth(p)
    }

    p.draw = () => {
      drawGrowth(p)
    }

    p.windowResized = () => {
      p.resizeCanvas(container.clientWidth, container.clientHeight)
      p.redraw()
    }
  }, container)

  onControlChange((nextControls) => {
    syncControlState(controlState, nextControls)
    sketch?.redraw()
  })

  return () => {
    sketch?.remove()
  }
}
