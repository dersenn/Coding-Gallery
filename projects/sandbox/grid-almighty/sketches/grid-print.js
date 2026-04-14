import { Grid, GridCell } from '~/types/project'
import { shortcuts } from '~/utils/shortcuts'
import { lightTheme } from '~/utils/theme'


export function draw(context) {
  const { canvas, utils, controls: c } = context
  const { v } = shortcuts(utils)

  if (!canvas) return
  const { mm, pt, trimWidth, trimHeight } = canvas.print

  canvas.background(lightTheme.background)
  canvas.rect(v(mm(10), mm(10)), mm(50), mm(30), 'red')

}