import { Grid, GridCell } from '~/types/project'

/**
 * Grid Almighty layer skeleton:
 * keep the grid/cell runtime structure, but draw only a simple circle per cell.
 */
export function drawGridCore(context) {
  const { svg, frame, theme, utils, controls, v } = context

  const rows = typeof controls?.grid_rows === 'number' ? controls.grid_rows : 8
  const cols = rows

  svg.makeRect(v(frame.x, frame.y), frame.width, frame.height, theme.background, 'none', 0)

  const grid = new GridCoreGrid({
    cols,
    rows,
    width: frame.width,
    height: frame.height,
    x: frame.x,
    y: frame.y,
    utils
  }).init({
    svg,
    fill: theme.foreground
  })

  grid.forEach((cell) => cell.draw())
}

class GridCoreGrid extends Grid {
  init(runtime) {
    this.svg = runtime.svg
    this.fill = runtime.fill
    return this
  }

  createCell(config) {
    return new GridCoreCell(config)
  }
}

class GridCoreCell extends GridCell {
  draw() {
    const center = this.center()
    const radius = Math.min(this.width, this.height) * 0.35
    this.grid.svg.makeCircle(center, radius, this.grid.fill, 'none', 0)
  }
}
