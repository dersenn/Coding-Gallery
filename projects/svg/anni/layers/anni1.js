import { Grid, GridCell, createFrameTransform } from '~/types/project'

class Anni1Grid extends Grid {
  /** Post-construction setup. Resolves colors and seeded rnd shortcut. */
  init(extras) {
    this.svg = extras.svg
    this.color = extras.color
    this.accentColor = extras.accentColor
    this.rnd = extras.rnd
    return this
  }

  createCell(config) {
    return new Anni1Cell(config)
  }
}

class Anni1Cell extends GridCell {
  /** Draw this cell using seeded random color choice from grid runtime. */
  draw() {
    const g = this.grid
    const stroke = g.rnd() < 0.25 ? g.accentColor : g.color
    g.svg.makeRectAB(this.tl(), this.br(), 'none', stroke, 1)
    if (this.row === 3) {
      g.svg.makeCircle(this.center(), this.width * 0.2, 'none', stroke, 1)
    }
  }
}

export function drawAnni1(context) {
  const { svg, frame, theme, utils, rnd, v } = context
  const settings = {
    grid: { cols: 12, rows: 6 },
    colors: { primary: 1, accent: 2 }
  }
  const tf = createFrameTransform(frame)
  const origin = tf.toGlobal(0, 0)
  svg.makeRect(v(origin.x, origin.y), frame.width, frame.height, theme.background, 'none', 0)
  const primaryColor = theme.palette[settings.colors.primary] ?? theme.foreground
  const accentColor = theme.palette[settings.colors.accent] ?? theme.foreground

  const grid = new Anni1Grid({
    cols: settings.grid.cols,
    rows: settings.grid.rows,
    width: frame.width,
    height: frame.height,
    x: origin.x,
    y: origin.y,
    utils
  }).init({ svg, color: primaryColor, accentColor, rnd })

  grid.forEach((cell) => cell.draw())
}
