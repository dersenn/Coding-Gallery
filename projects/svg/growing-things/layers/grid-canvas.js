import { Grid } from '~/types/project'

const GRID_ROWS = 8
const GRID_COLS = 8
const GRID_CELL_SIZING = 'squareByShortSide'
const GRID_FIT = 'stretch'

const DEFAULTS = {
  shortSideDivisions: 60,
  seedCount: 8,
  growthChance: 68,
  maxPasses: 420,
  targetFill: 100,
  neighborhood: '8'
}

export function resolveGrowthControls(controls) {
  return {
    shortSideDivisions: typeof controls?.grid_short_side_divisions === 'number'
      ? controls.grid_short_side_divisions
      : DEFAULTS.shortSideDivisions,
    seedCountInput: typeof controls?.growth_seed_count === 'number'
      ? controls.growth_seed_count
      : DEFAULTS.seedCount,
    growthChanceInput: typeof controls?.growth_chance === 'number'
      ? controls.growth_chance
      : DEFAULTS.growthChance,
    maxPassesInput: typeof controls?.growth_max_passes === 'number'
      ? controls.growth_max_passes
      : DEFAULTS.maxPasses,
    targetFillInput: typeof controls?.growth_target_fill === 'number'
      ? controls.growth_target_fill
      : DEFAULTS.targetFill,
    neighborhood: controls?.growth_neighborhood === '4' ? '4' : DEFAULTS.neighborhood
  }
}

export function createGrowthGrid(frame, shortSideDivisions, utils) {
  return new Grid({
    cols: GRID_COLS,
    rows: GRID_ROWS,
    width: frame.width,
    height: frame.height,
    x: frame.x,
    y: frame.y,
    cellSizing: GRID_CELL_SIZING,
    fit: GRID_FIT,
    shortSideDivisions,
    utils
  })
}

export function resolvePalette(theme) {
  const palette = Array.isArray(theme.palette) && theme.palette.length > 0
    ? theme.palette
    : [theme.foreground]
  return {
    palette,
    colorCount: Math.max(1, palette.length)
  }
}

export function resolveGrowthTargets(inputs, totalCells, utils) {
  const seedCount = Math.floor(utils.math.clamp(inputs.seedCountInput, 1, totalCells))
  const growthChance = utils.math.clamp(inputs.growthChanceInput, 0, 100)
  const maxPasses = Math.floor(utils.math.clamp(inputs.maxPassesInput, 1, totalCells * 3))
  const targetFillRatio = utils.math.clamp(inputs.targetFillInput / 100, 0.1, 1)
  const targetCount = Math.max(seedCount, Math.floor(totalCells * targetFillRatio))
  return { seedCount, growthChance, maxPasses, targetCount }
}

export function growOwnership(grid, targets, colorCount, neighborhood, utils, coin) {
  const totalCells = grid.cells.length
  const ownerByIndex = Array(totalCells).fill(-1)
  let filledCount = 0

  let frontier = seedRandomCells(grid, targets.seedCount, utils).map((cell, order) => {
    ownerByIndex[cell.index] = order % colorCount
    filledCount++
    return cell.index
  })

  let pass = 0
  while (frontier.length > 0 && filledCount < targets.targetCount && pass < targets.maxPasses) {
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

        if (!coin(targets.growthChance)) continue
        ownerByIndex[neighborIndex] = owner
        filledCount++
        newlyFilledThisPass++
        nextFrontier.push(neighborIndex)
      }

      if (hasUnfilledNeighbor) {
        nextFrontier.push(cellIndex)
      }
    }

    if (newlyFilledThisPass === 0) break
    frontier = uniqueInts(nextFrontier)
    pass++
  }

  return ownerByIndex
}

function drawFilledCells(canvas, grid, ownerByIndex, palette, fallbackFill) {
  for (const cell of grid.cells) {
    const owner = ownerByIndex[cell.index]
    if (owner < 0) continue
    const fill = palette[owner] ?? fallbackFill
    canvas.rect(cell.tl(), cell.width, cell.height, fill, 'transparent', 0)
  }
}

/**
 * Canvas variation of the grid-growth layer:
 * preserves the seeded frontier fill behavior while drawing through Canvas2D.
 */
export function draw(context) {
  const { canvas, frame, theme, utils, controls, coin } = context
  if (!canvas) return

  const inputs = resolveGrowthControls(controls)
  const { palette, colorCount } = resolvePalette(theme)

  canvas.background(theme.background)

  const grid = createGrowthGrid(frame, inputs.shortSideDivisions, utils)
  const totalCells = grid.cells.length
  if (totalCells <= 0) return

  const targets = resolveGrowthTargets(inputs, totalCells, utils)
  const ownerByIndex = growOwnership(grid, targets, colorCount, inputs.neighborhood, utils, coin)
  drawFilledCells(canvas, grid, ownerByIndex, palette, theme.foreground)
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
