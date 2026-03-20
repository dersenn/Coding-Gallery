import { Grid, GridCell } from '~/types/project'

const SET = {
  cols: 3,
  rows: 3,
  subdivision: {
    enabled: true,
    maxLevel: 3,
    chance: 50,
    cols: 2,
    rows: 2
  }
}

function resolveSettings(utils, controls) {
  return {
    cols: SET.cols,
    rows: SET.rows,
    subdivision: {
      enabled: SET.subdivision.enabled,
      maxLevel: utils.seed.randomInt(1, 3),
      chance: SET.subdivision.chance,
      cols: SET.cols,
      rows: SET.rows
    }
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
    let fill = palette[this.level % palette.length] ?? theme.foreground
    fill = 'transparent'
    canvas.rect(this.tl(), this.width, this.height, fill, 'transparent', 0)
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
  const { canvas, frame, theme, utils, controls } = context
  if (!canvas) return

  const settings = resolveSettings(utils, controls)
  canvas.background(theme.background)

  const grid = createGrid(frame, utils, settings)
  if (settings.subdivision.enabled) {
    const terminals = grid.subdivide({
      maxLevel: settings.subdivision.maxLevel,
      condition: (cell, level) => level <= 2 && ((cell.row + cell.col) % 2 === 0),
      chance: settings.subdivision.chance,
      subdivisionCols: settings.subdivision.cols,
      subdivisionRows: settings.subdivision.rows
    })
    terminals.forEach((cell) => {
      cell.draw(canvas, theme)
    })
    // draw cell edges / boundaries
    canvas.cellEdges(
      terminals,
      theme.foreground,
      1,
      { strokeAlign: 'inside', includeOuter: false }
    )
    return
  }

  /* If subdivision is disabled, draw the grid. */
  // grid.forEach((cell) => {
  //   cell.draw(canvas, theme)
  // })
  // canvas.gridLines(
  //   utils.vec.create(frame.x, frame.y),
  //   frame.width,
  //   frame.height,
  //   grid.cols,
  //   grid.rows,
  //   theme.foreground,
  //   1,
  //   { strokeAlign: 'inside', includeOuter: false }
  // )
}