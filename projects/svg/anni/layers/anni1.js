import { Grid, GridCell } from '~/types/project'

export function drawAnni1(context) {
  const { svg, frame, theme, utils, rnd, v, controls } = context

  const anniColors = [
    '#fdf0d5', '#03071e', '#FF4400'
  ]

  const gridRows =
    typeof controls?.anni1_rows === 'number' ? controls.anni1_rows : 6
  const gridCols = gridRows * 2

  const settings = {
    grid: {
      cols: gridCols,
      rows: gridRows
    },
    pattern: {
      stripeRows: gridCols,
      crossThickness: 0.03,
      primaryOverlayAlpha: 0.39,
    },
    colors: {
      background: anniColors[0] ?? theme.background,
      primary: anniColors[1] ?? theme.foreground,
      accent: anniColors[2] ?? theme.foreground
    }
  }

  const borderY = frame.height / (settings.grid.rows * settings.grid.cols + 2)

  const startMode = utils.seed.randomInt(0, 1)
  const bottomMode = (1 - startMode + settings.grid.rows) % 2


  svg.makeRect(v(frame.x, frame.y), frame.width, frame.height, settings.colors.background, 'none', 0)

  svg.makeRectAB(v(frame.x, frame.y), v(frame.x + frame.width, frame.y + borderY), anniColors[startMode], 'none', 0)

  svg.makeRectAB(v(frame.x, frame.y + frame.height - borderY), v(frame.x + frame.width, frame.y + frame.height), anniColors[bottomMode], 'none', 0)

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
    x: frame.x,
    y: frame.y + borderY,
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
    const top = this.getNeighbor('top')
    const topMode = top?.selectedMode
    // Vertical restriction: if top already uses a base cross mode, force this
    // cell into texture/overlay modes to avoid stacked base marks.
    const topBlocksBaseModes = topMode === 0 || topMode === 1

    // Build the legal mode set from row-level defaults under neighborhood rules:
    // - avoid repeating the immediate left mode
    // - when top blocks base modes, remove 0/1 entirely
    const candidates = rowModes.filter((m) => {
      if (leftMode !== undefined && m === leftMode) return false
      if (topBlocksBaseModes && (m === 0 || m === 1)) return false
      return true
    })

    // Keep legacy weighting feel: prefer base compositions (0/1) over textures
    // when they are legal. If candidates collapse, fallback still respects top
    // blocking so 0/1 never sneak back in through fallback.
    const weightedModes = candidates.flatMap((m) => ((m === 0 || m === 1) ? [m, m, m] : [m]))
    const fallbackModes = rowModes.filter((m) => !(topBlocksBaseModes && (m === 0 || m === 1)))
    const modePool = weightedModes.length > 0 ? weightedModes : fallbackModes
    if (modePool.length === 0) return
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