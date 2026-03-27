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
      maxLevel: SET.subdivision.maxLevel,
      useRule: SET.subdivision.useRule,
      chance: SET.subdivision.chance,
      subdivisionCols: SET.subdivision.subdivisionCols,
      subdivisionRows: SET.subdivision.subdivisionRows,
    },
  }
}

class MinimalGrid extends Grid {
  createCell(config) {
    return new MinimalCell(config)
  }
}

class MinimalCell extends GridCell {
  draw(canvas, theme, settings) {
    const fill = (this.row + this.col) % 2 === 0 ? theme.foreground : 'transparent'
    canvas.rect(this.tl(), this.width, this.height, fill, 'transparent', 0)
  }
}

export function draw(context) {
  const { canvas, frame, theme, utils, controls } = context
  if (!canvas) return

  const settings = resolveSettings(utils, controls)

  canvas.background(theme.background)

  const grid = new MinimalGrid({
    cols: settings.cols,
    rows: settings.rows,
    width: frame.width,
    height: frame.height,
    x: frame.x,
    y: frame.y,
    utils,
  })

  grid.forEach((cell) => {
    cell.draw(canvas, theme, settings)
  })
}
