import { Grid } from '~/types/project'

/**
 * Frontier-based 2D growth:
 * - starts from random seed cells
 * - expands into 4- or 8-neighborhood
 * - retries boundary cells across passes until coverage/max-pass stop
 */
export function drawGridGrowth(context) {
  const { svg, frame, theme, utils, controls, v } = context

  const shortSideDivisions = typeof controls?.grid_short_side_divisions === 'number'
    ? controls.grid_short_side_divisions
    : 60
  const seedCountInput = typeof controls?.growth_seed_count === 'number'
    ? controls.growth_seed_count
    : 8
  const growthChanceInput = typeof controls?.growth_chance === 'number'
    ? controls.growth_chance
    : 68
  const maxPassesInput = typeof controls?.growth_max_passes === 'number'
    ? controls.growth_max_passes
    : 420
  const targetFillInput = typeof controls?.growth_target_fill === 'number'
    ? controls.growth_target_fill
    : 100
  const neighborhood = controls?.growth_neighborhood === '4' ? '4' : '8'

  svg.rect(v(frame.x, frame.y), frame.width, frame.height, theme.background, 'none', 0)

  const grid = new Grid({
    cols: 8,
    rows: 8,
    width: frame.width,
    height: frame.height,
    x: frame.x,
    y: frame.y,
    cellSizing: 'squareByShortSide',
    fit: 'stretch',
    shortSideDivisions,
    utils
  })

  const totalCells = grid.cells.length
  if (totalCells <= 0) return

  const palette = Array.isArray(theme.palette) && theme.palette.length > 0
    ? theme.palette
    : [theme.foreground]
  const colorCount = Math.max(1, palette.length)

  const seedCount = clampInt(seedCountInput, 1, totalCells)
  const growthChance = clamp(growthChanceInput, 0, 100)
  const maxPasses = clampInt(maxPassesInput, 1, totalCells * 3)
  const targetFillRatio = clamp(targetFillInput / 100, 0.1, 1)
  const targetCount = Math.max(seedCount, Math.floor(totalCells * targetFillRatio))

  const ownerByIndex = Array(totalCells).fill(-1)
  let filledCount = 0

  let frontier = seedRandomCells(grid, seedCount, utils).map((cell, order) => {
    ownerByIndex[cell.index] = order % colorCount
    filledCount++
    return cell.index
  })

  let pass = 0
  while (frontier.length > 0 && filledCount < targetCount && pass < maxPasses) {
    const nextFrontier = []
    let newlyFilledThisPass = 0

    for (const cellIndex of frontier) {
      const cell = grid.cellAt(cellIndex)
      if (!cell) continue

      const owner = ownerByIndex[cellIndex]
      if (owner < 0) continue

      const neighbors = neighborhood === '4' ? cell.getNeighbors4() : cell.getNeighbors()
      let hasUnfilledNeighbor = false

      for (const neighbor of neighbors) {
        const neighborIndex = neighbor.index
        if (ownerByIndex[neighborIndex] >= 0) continue
        hasUnfilledNeighbor = true

        if (!utils.seed.coinToss(growthChance)) continue
        ownerByIndex[neighborIndex] = owner
        filledCount++
        newlyFilledThisPass++
        nextFrontier.push(neighborIndex)
      }

      // Keep boundary cells active so failed probability checks can retry.
      if (hasUnfilledNeighbor) {
        nextFrontier.push(cellIndex)
      }
    }

    if (newlyFilledThisPass === 0) break
    frontier = uniqueInts(nextFrontier)
    pass++
  }

  grid.forEach((cell) => {
    const owner = ownerByIndex[cell.index]
    if (owner < 0) return
    const fill = palette[owner % colorCount] ?? theme.foreground
    svg.rect(cell.tl(), cell.width, cell.height, fill, 'none', 0)
  })
}

function seedRandomCells(grid, count, utils) {
  const selected = new Set()
  const cells = []

  while (cells.length < count && selected.size < grid.cells.length) {
    const index = utils.seed.randomInt(0, grid.cells.length - 1)
    if (selected.has(index)) continue
    selected.add(index)
    const cell = grid.cellAt(index)
    if (!cell) continue
    cells.push(cell)
  }

  return cells
}

function uniqueInts(values) {
  return Array.from(new Set(values))
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function clampInt(value, min, max) {
  return Math.floor(clamp(value, min, max))
}
