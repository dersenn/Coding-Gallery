import { Cell, Grid, GridCell } from '~/types/project'

const SET = {
  cols: 8,
  rows: 8,
  subdivision: {
    enabled: true,
    useCondition: true, // continue from here!
    maxLevel: 2,
    chance: 20,
    cols: 2,
    rows: 2
  }
}

class DotGrid extends Grid {
  createCell(config) {
    return new DotCell(config)
  }

  createLeafCell(config) {
    return new DotLeafCell(config)
  }
}

class DotCell extends GridCell {
  constructor(config) {
    super(config)
    this.subdivisionTag = (this.row + this.col) % 3 === 0 ? 'green' : 'base'
  }

  draw(canvas, theme) {
    const seed = this.grid.utils.seed
    const palette = Array.isArray(theme.palette) && theme.palette.length > 0
      ? theme.palette
      : [theme.foreground]
    let r = Math.min(this.width, this.height) * 0.12
    let fill = theme.foreground
    if (this.col % 2 === 0) {
      r *= 2
    }
    if (this.row === 3 || this.col === 2) {
      fill = palette[seed.randomInt(0, palette.length - 1)] ?? theme.foreground
    }
    canvas.circle(this.center(), r, fill, 'transparent', 0)
  }
}

class DotLeafCell extends Cell {
  constructor(config) {
    super(config)
    this.subdivisionTag = config.parent?.subdivisionTag ?? 'base'
  }

  draw(canvas, theme, seed) {
    const palette = Array.isArray(theme.palette) && theme.palette.length > 0
      ? theme.palette
      : [theme.foreground]
    const r = Math.min(this.width, this.height) * 0.32
    const fill = this.subdivisionTag === 'green'
      ? '#4caf50'
      : (palette[seed.randomInt(0, palette.length - 1)] ?? theme.foreground)
    canvas.circle(this.center(), r, fill, 'transparent', 0)
  }
}

function shouldStopSubdivision(cell) {
  return cell.subdivisionTag === 'green'
}

function createGrid(frame, utils) {
  return new DotGrid({
    cols: SET.cols,
    rows: SET.rows,
    width: frame.width,
    height: frame.height,
    x: frame.x,
    y: frame.y,
    utils
  })
}

export function draw(context) {
  const { canvas, frame, theme, utils } = context
  if (!canvas) return

  canvas.background(theme.background)

  const grid = createGrid(frame, utils)
  if (!SET.subdivision.enabled) {
    grid.forEach((cell) => {
      cell.draw(canvas, theme)
    })
    return
  }

  const subdivisionConfig = {
    maxLevel: SET.subdivision.maxLevel,
    chance: SET.subdivision.chance,
    subdivisionCols: SET.subdivision.cols,
    subdivisionRows: SET.subdivision.rows
  }
  if (SET.subdivision.useCondition) {
    subdivisionConfig.condition = (cell) => shouldStopSubdivision(cell)
  }
  const leaves = grid.subdivide(subdivisionConfig)

  leaves.forEach((cell) => {
    cell.draw(canvas, theme, grid.utils.seed)
  })
}