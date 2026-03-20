import { Grid, GridCell } from '~/types/project'

const SET = {
  cols: 8,
  rows: 8,
  cellSizing: 'squareByShortSide',
  shortSideDivisions: 9,
  subdivision: {
    enabled: true,
    maxLevel: 2,
    chance: 80,
    cols: 2,
    rows: 2
  }
}

class DotGrid extends Grid {
  createCell(config) {
    return new DotCell(config)
  }
}

class DotCell extends GridCell {
  draw(canvas, theme) {
    const palette = theme.palette.length > 0 ? theme.palette : [theme.foreground]
    const fill = palette[this.level % palette.length] ?? theme.foreground
    canvas.rect(this.tl(), this.width, this.height, 'transparent', fill, 1)
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
    const terminals = grid.subdivide({
      maxLevel: SET.subdivision.maxLevel,
      chance: SET.subdivision.chance,
      subdivisionCols: SET.subdivision.cols,
      subdivisionRows: SET.subdivision.rows
    })
    terminals.forEach((cell) => {
      cell.draw(canvas, theme)
    })
    return
  }

  grid.forEach((cell) => {
    cell.draw(canvas, theme)
  })
}