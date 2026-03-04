import { createFrameTransform } from '~/types/project'

export function drawAnni2(context) {
  const { svg, frame, theme, utils, v } = context
  const settings = {
    grid: { cols: 6, rows: 9 },
    colors: { background: 0, primary: 1, accent: 3 }
  }
  const tf = createFrameTransform(frame)
  const background = theme.palette[settings.colors.background] ?? theme.foreground
  const accent = theme.palette[settings.colors.primary] ?? background
  const lightAccent = theme.palette[settings.colors.accent] ?? theme.foreground
  const origin = tf.toGlobal(0, 0)
  svg.makeRect(v(origin.x, origin.y), frame.width, frame.height, background, 'none', 0)

  const cellW = frame.width / settings.grid.cols
  const cellH = frame.height / settings.grid.rows
  for (let row = 0; row < settings.grid.rows; row++) {
    for (let col = 0; col < settings.grid.cols; col++) {
      const x = col * cellW
      const y = row * cellH
      const center = tf.toGlobal(x + cellW / 2, y + cellH / 2)
      const radius = Math.min(cellW, cellH) * (0.2 + 0.5 * utils.noise.cell(col, row, 2))
      const stroke = (row + col) % 2 === 0 ? accent : lightAccent
      const fill = (row + col) % 2 === 0 ? accent : lightAccent
      svg.makeCircle(v(center.x, center.y), radius, fill, stroke, 0)
    }
  }
}
