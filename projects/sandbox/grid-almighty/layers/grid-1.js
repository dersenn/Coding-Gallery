import { Cell, Grid, GridCell } from '~/types/project'

const SET = {
  cols: 8,
  rows: 8,
  cellSizing: 'squareByShortSide',
  shortSideDivisions: 9,
  subdivision: {
    enabled: true,
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
  draw(canvas, theme) {
    const r = Math.min(this.width, this.height) * 0.12
    canvas.circle(this.center(), r, theme.foreground, 'transparent', 0)
  }
}

class DotLeafCell extends Cell {
  draw(canvas, theme) {
    const r = Math.min(this.width, this.height) * 0.12
    canvas.circle(this.center(), r, theme.foreground, 'transparent', 0)
  }
}

function createGrid(frame, utils) {
  return new DotGrid({
    cols: SET.cols,
    rows: SET.rows,
    cellSizing: SET.cellSizing,
    shortSideDivisions: SET.shortSideDivisions,
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
  if (SET.subdivision.enabled) {
    const leaves = grid.subdivide({
      maxLevel: SET.subdivision.maxLevel,
      chance: SET.subdivision.chance,
      subdivisionCols: SET.subdivision.cols,
      subdivisionRows: SET.subdivision.rows
    })
    leaves.forEach((cell) => {
      cell.draw(canvas, theme)
    })
    return
  }

  grid.forEach((cell) => {
    cell.draw(canvas, theme)
  })
}