import { Grid } from '~/types/project'

const SET = {
  cols: 8,
  rows: 8,
  width: frame.width,
  height: frame.height,
}

function createGrid(context) {
  const { canvas, frame, theme, utils, controls } = context
  if (!canvas) return
  return new Grid({
    cols: SET.cols,
    rows: SET.rows,
    width: SET.width,
    height: SET.height,
  })
}


export function draw(context) {
  const { canvas, frame, theme, utils, controls } = context
  if (!canvas) return
  canvas.background(theme.palette[0])

  const grid = createGrid(context)
  grid.forEach((cell) => {
    canvas.rect(cell.tl(), cell.width, cell.height, theme.palette[0], 'transparent', 0)
  })
}
