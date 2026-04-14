import { lightTheme } from '~/utils/theme'

export function draw(context) {
  const { svg, controls: c } = context

  if (!svg) return
  const { mm, pt, trimWidth, trimHeight } = svg.print

  svg.stage.style.background = lightTheme.background
  svg.rect(svg.c.sub(new Vec(mm(25), mm(15))), mm(50), mm(30), 'red')

  svg.drawTrimBox()
}