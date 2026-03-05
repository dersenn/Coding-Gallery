import { Grid, GridCell, createFrameTransform } from '~/types/project'

export function drawAnni1(context) {
  const { svg, frame, theme, utils, rnd, v } = context

  const anniColors = [
    '#fdf0d5', '#03071e', '#bb3e03'
  ]

  const settings = {
    grid: {
      cols: 12,
      rows: 6
    },
    pattern: {
      stripeRows: 12,
      crossThickness: 0.03,
      primaryOverlayAlpha: 0.39
    },
    colors: {
      background: anniColors[0] ?? theme.background,
      primary: anniColors[1] ?? theme.foreground,
      accent: anniColors[2] ?? theme.foreground
    }
  }

  const borderY = frame.height / (settings.grid.rows * settings.grid.cols + 2)

  const tf = createFrameTransform(frame)
  const origin = tf.toGlobal(0, 0)

  const startMode = utils.seed.randomInt(0, 1)
  const rowBaseMode = (row) => (1 - startMode + row) % 2
  const bottomMode = (1 - startMode + settings.grid.rows) % 2


  svg.makeRect(v(origin.x, origin.y), frame.width, frame.height, settings.colors.background, 'none', 0)

  svg.makeRectAB(v(origin.x, origin.y), v(origin.x + frame.width, origin.y + borderY), anniColors[startMode], 'none', 0)

  svg.makeRectAB(v(origin.x, origin.y + frame.height - borderY), v(origin.x + frame.width, origin.y + frame.height), anniColors[bottomMode], 'none', 0)

  const color = {
    background: settings.colors.background,
    primary: settings.colors.primary,
    accent: settings.colors.accent
  }

  const grid = new Anni1Grid({
    cols: settings.grid.cols,
    rows: settings.grid.rows,
    width: frame.width,
    height: frame.height - 2 * borderY,
    x: origin.x,
    y: origin.y + borderY,
    utils
  }).init({ svg, color, pattern: settings.pattern, rnd, modeCount: 4, startMode })

  grid.forEach((cell) => cell.draw())
}



class Anni1Grid extends Grid {
  /** Post-construction setup. Resolves colors and seeded rnd shortcut. */
  init(runtime) {
    this.svg = runtime.svg
    this.color = runtime.color
    this.pattern = runtime.pattern
    this.rnd = runtime.rnd

    const rowBaseMode = (rowIndex) => (1 - runtime.startMode + rowIndex) % 2
    this.rowModes = Array.from({ length: this.rows }, (_, rowIndex) => [
      rowBaseMode(rowIndex),
      2,
      3
    ])
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
    const center = this.center()

    const rowModes = g.rowModes[this.row] ?? []
    if (rowModes.length === 0) return
    const left = this.getNeighbor('left')
    const leftMode = left?.selectedMode
    // Favor base composition modes (0/1) over texture overlays (2/3).
    const candidates = leftMode === undefined
      ? rowModes
      : rowModes.filter((m) => m !== leftMode)
    const weightedModes = candidates.flatMap((m) => ((m === 0 || m === 1) ? [m, m, m] : [m]))
    const modePool = weightedModes.length > 0 ? weightedModes : rowModes
    const mode = modePool[Math.floor(g.rnd() * modePool.length)]
    this.selectedMode = mode
    const primary30 =
      g.utils.color.parse(g.color.primary)?.withAlpha(g.pattern.primaryOverlayAlpha).toCss('rgba') ??
      g.color.primary

    switch (mode) {
      case 0:
        g.svg.makeRectC(center, this.width * g.pattern.crossThickness, this.height, g.color.primary, 'none', 0)
        g.svg.makeRectC(center, this.width, this.width * g.pattern.crossThickness, g.color.primary, 'none', 0)
        break
      case 1:
        g.svg.makeRectAB(this.tl(), this.br(), g.color.primary, 'none', 0)
        g.svg.makeRectC(center, this.width * g.pattern.crossThickness, this.height, g.color.background, 'none', 0)
        g.svg.makeRectC(center, this.width, this.width * g.pattern.crossThickness, g.color.background, 'none', 0)
        break
      case 2: {
        drawOddRowStripes(this, g, g.pattern.stripeRows, g.color.accent)
        break
      }
      case 3: {
        drawOddRowStripes(this, g, g.pattern.stripeRows, g.color.accent)
        g.svg.makeRectAB(this.tl(), this.br(), primary30, 'none', 0)
        break
      }
    }
  }
}



function drawOddRowStripes(cell, grid, stripeRows, fill) {
  const tl = cell.tl()
  const br = cell.br()
  const stripeH = cell.height / stripeRows

  for (let i = 0; i < stripeRows; i++) {
    if (i % 2 === 0) continue
    const y = tl.y + i * stripeH
    const a = grid.utils.vec.create(tl.x, y)
    const b = grid.utils.vec.create(br.x, y + stripeH)
    grid.svg.makeRectAB(a, b, fill, 'none', 0)
  }
}