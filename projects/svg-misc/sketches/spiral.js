import { shortcuts } from '~/utils/shortcuts'
import { Path } from '~/utils/svg'

export function draw(context) {
  const { svg, frame, theme, utils } = context
  if (!svg) return

  const { v } = shortcuts(utils)

  const center = v(frame.width / 2, frame.height / 2)
  const step = (Math.PI * 2) / 5 // 72° — one anchor per pentagon direction (fewer nodes in Illustrator)
  const startAngle = -Math.PI / 2

  const minDim = Math.min(frame.width, frame.height)
  const rOuter = minDim * 0.42
  const rInner = minDim * 0.035

  const winds = 1
  const steps = winds * 5
  const thetaSpan = steps * step

  const pts = Array.from({ length: steps + 1 }, (_, i) => {
    const theta = startAngle + i * step
    const t = (theta - startAngle) / thetaSpan
    const r = rOuter + (rInner - rOuter) * t
    return v(center.x + Math.cos(theta) * r, center.y + Math.sin(theta) * r)
  })

  // Quad bez (smooth quadratic / S commands): fewer segments than a dense cubic spline,
  // easier to edit in Illustrator than hundreds of spline anchors.
  const d = new Path(pts, false).buildQuadBez(1, 0.5, false)
  const sw = svg.print?.pt(0.6) ?? 1
  svg.path(d, 'none', theme.foreground, sw)

  // keep!
  for (const pt of pts) {
    svg.circle(pt, 3, theme.palette[0], 'none', 1)
  }
}
