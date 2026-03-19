import { Grid, GridCell } from '~/types/project'

export function draw(context) {
  const { svg, frame, theme, utils, rnd } = context
  if (!svg) return

  // Keep cell density explicit so circles stay visible.
  const cols = 90
  const rows = 4

  const grid = createMascaraLinesGrid(frame, utils, cols, rows)

  grid.forEach((cell) => cell.draw(svg, theme, utils, rnd))
}

class MascaraLinesGrid extends Grid {
  createCell(config) {
    return new MascaraLinesCell(config)
  }
}

class MascaraLinesCell extends GridCell {
  constructor(config) {
    super(config)
    this.mode = this.row
  }
  draw(svg, theme, utils, rnd) {
    // svg.rectAB(this.tl(), this.br(), 'transparent', theme.foreground, 1)
    let rx = this.width * 0.39
    let ry = this.width * 0.39

    const minRy = 6
    const maxRy = 28

    const u = this.grid.cols > 1 ? this.col / (this.grid.cols - 1) : 0
    const v = this.grid.rows > 1 ? this.row / (this.grid.rows - 1) : 0

    let cycles
    let phase
    let scale
    let n
    let Off

    switch (this.mode) {
      case 0:
        cycles = 6
        phase = u * Math.PI * 2 * cycles
        let wave01 = (Math.sin(phase) + 1) * 0.3
        ry = utils.math.lerp(minRy, maxRy, wave01)
        svg.ellipse(this.center(), rx, ry, theme.foreground, 'none', 1)
        break
      case 1:
        scale = 90 
        n = utils.noise.cell(u * scale, 1, 0)
        ry = utils.math.lerp(minRy, maxRy, n)
        svg.ellipse(this.center(), rx, ry, theme.foreground, 'none', 1)
        break
      case 2:
        cycles = 3
        phase = u * Math.PI * 2 * cycles
        let wave02 = (Math.sin(phase) + 1) * 0.5
        Off = new Vec(-minRy * wave02 * 0.5, maxRy * wave02)
        const ln2 = svg.line(
          this.center().sub(Off),
          this.center().add(Off), 
          theme.foreground, 
          3
        )
        ln2.setAttribute('stroke-linecap', 'round')
        // svg.ellipse(this.center(), rx, ry, theme.palette[3], 'none', 1)
        break
      case 3:
        scale = 30
        n = utils.noise.cell(u * scale, 1, 0)
        ry = utils.math.lerp(minRy, maxRy, n)
        Off = new Vec(minRy * n * 0.5, maxRy * n)
        const ln3 = svg.line(
          this.center().sub(Off),
          this.center().add(Off),
          theme.foreground,
          3
        )
        ln3.setAttribute('stroke-linecap', 'round')

        break

    }

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