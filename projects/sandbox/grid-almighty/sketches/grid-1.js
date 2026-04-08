import { Grid, GridCell } from '~/types/project'

const SET = {
  cols: 2,
  rows: 2,
  subdivision: {
    enabled: true,
    useRule: true,
    maxLevel: 3,
    chance: 50,
    subdivisionCols: 2,
    subdivisionRows: 2,
  },
  showgrid: false,
}

function resolveSettings(utils, controls) {
  return {
    cols: SET.cols,
    rows: SET.rows,
    subdivision: {
      enabled: SET.subdivision.enabled,
      maxLevel: SET.subdivision.maxLevel, // utils.seed.randomInt(0, 3),
      useRule: SET.subdivision.useRule,
      chance: SET.subdivision.chance,
      subdivisionCols: SET.subdivision.subdivisionCols,
      subdivisionRows: SET.subdivision.subdivisionRows,
    }
  }
}

class DotGrid extends Grid {
  createCell(config) {
    return new DotCell(config)
  }
}

class DotCell extends GridCell {
  draw(canvas, theme, settings) {
    let fill = 'transparent'
    if ((this.row + this.col) % 2 === 0) {
      fill = theme.foreground
    }
    canvas.rect(this.tl(), this.width, this.height, fill, 'transparent', 0)
  }
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

function subdivideCondition(cell, level, settings, utils) {
  if (level === 0) return utils.seed.coinToss(settings.subdivision.chance)
  // if (level >= 1) return utils.seed.coinToss(20)
  if (level >= 1) return (cell.row < 2 && cell.col < 2) && utils.seed.coinToss(20)  // assuming 4×4 splits

  return true
}


export function draw(context) {
  const { canvas, frame, theme, utils, controls } = context
  if (!canvas) return

  const settings = resolveSettings(utils, controls)
  canvas.background(theme.background)

  const grid = createGrid(frame, utils, settings)
  if (settings.subdivision.enabled) {
    const terminals = grid.subdivide(
      settings.subdivision.useRule
        ? {
            maxLevel: settings.subdivision.maxLevel,
            rule: (cell, level) => {
              if (!subdivideCondition(cell, level, settings, utils)) return false
              const div = utils.seed.coinToss(settings.subdivision.chance) ? 2 : 4   // e.g. mostly 2, sometimes 4
              return { cols: div, rows: div }
            }
          }
        : {
            maxLevel: settings.subdivision.maxLevel,
            condition: (cell, level) => subdivideCondition(cell, level, settings, utils),
            chance: settings.subdivision.chance,
            subdivisionCols: settings.subdivision.subdivisionCols,
            subdivisionRows: settings.subdivision.subdivisionRows,
          }
    )
    terminals.forEach((cell) => {
      cell.draw(canvas, theme, settings)
    })
    // draw cell edges / boundaries
    if (SET.showgrid) {
      canvas.cellEdges(
        terminals,
        theme.palette[0],
        1,
        { strokeAlign: 'center', includeOuter: false }
      )
    }
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