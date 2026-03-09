import { createFrameTransform, resolveInnerFrame } from '~/types/project'

export function drawAnni2(context) {
  const { svg, frame, theme, utils, v } = context
  const settings = {
    grid: { cols: 6, rows: 9 },
    colors: { background: 0, primary: 1, accent: 3 },
    frame: { inset: '8%', borderWidthScale: 0.003 }
  }
  const background = theme.palette[settings.colors.background] ?? theme.foreground
  const accent = theme.palette[settings.colors.primary] ?? background
  const lightAccent = theme.palette[settings.colors.accent] ?? theme.foreground
  svg.rect(v(frame.x, frame.y), frame.width, frame.height, background, 'none', 0)

  // Demonstrate frame utility by carving a nested artboard inside the layer frame.
  const inner = resolveInnerFrame(frame.width, frame.height, { mode: 'full', padding: settings.frame.inset })
  const artFrame = {
    x: frame.x + inner.x,
    y: frame.y + inner.y,
    width: inner.width,
    height: inner.height
  }
  const tf = createFrameTransform(artFrame)
  const gv = (x, y) => {
    const point = tf.toGlobal(x, y)
    return v(point.x, point.y)
  }
  const borderStroke = Math.max(1, frame.width * settings.frame.borderWidthScale)
  svg.rect(gv(0, 0), artFrame.width, artFrame.height, 'none', lightAccent, borderStroke)

  const cellW = artFrame.width / settings.grid.cols
  const cellH = artFrame.height / settings.grid.rows
  for (let row = 0; row < settings.grid.rows; row++) {
    for (let col = 0; col < settings.grid.cols; col++) {
      const x = col * cellW
      const y = row * cellH
      const center = gv(x + cellW / 2, y + cellH / 2)
      const radius = Math.min(cellW, cellH) * (0.2 + 0.5 * utils.noise.cell(col, row, 2))
      const stroke = (row + col) % 2 === 0 ? accent : lightAccent
      const fill = (row + col) % 2 === 0 ? accent : lightAccent
      svg.circle(center, radius, fill, stroke, 0)
    }
  }
}
