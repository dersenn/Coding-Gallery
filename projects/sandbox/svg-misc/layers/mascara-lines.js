import { Grid, GridCell } from '~/types/project'

export function draw(context) {
  const { svg, frame, theme, utils } = context
  if (!svg) return

  // Keep cell density explicit so circles stay visible.
  const cols = 50
  const rows = 1


  const grid = createMascaraLinesGrid(frame, utils, cols, rows)

  grid.forEach((cell) => cell.draw(svg, theme))
}

class MascaraLinesGrid extends Grid {
  createCell(config) {
    return new MascaraLinesCell(config)
  }
}

class MascaraLinesCell extends GridCell {
  constructor(config) {
    super(config)
  }
  draw(svg, theme) {
    svg.rectAB(this.tl(), this.br(), 'transparent', theme.foreground, 1)
    const radius = Math.min(this.width, this.height) * 0.45
    svg.circle(this.center(), radius, 'none', theme.foreground, 1)

  }
}

function createMascaraLinesGrid(frame, utils, cols, rows) {
  return new MascaraLinesGrid({
    cols,
    rows,
    width: frame.width,
    height: frame.height,
    x: frame.x,
    y: frame.y,
    utils
  })
}