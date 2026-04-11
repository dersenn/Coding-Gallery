import { shortcuts, quadBezHandles, splineHandles, Color, Path } from '~/types/project'

/**
 * Bezier Lab
 *
 * Intent:
 * - Provide a compact showcase of path builders using one shared point scaffold.
 *
 * What is being tested:
 * - Relative behavior of straight (polygon), quadratic bezier, and cubic spline
 *   constructions from identical source points.
 *
 * Non-goals:
 * - Not a full curve editor; controls only toggle curve families for comparison.
 */
const Y_LEVELS = [0.1, 0.25, 0.5, 0.75, 0.9]

export function draw(context) {
  const { svg, controls, utils, theme } = context
  const { v, simplex2 } = shortcuts(utils)

  const straightBase = Color.parse(theme.palette[0] ?? theme.foreground)
  const straightColor = straightBase?.toCss('rgba') ?? theme.foreground
  const quadraticBase = Color.parse(theme.palette[1] ?? theme.foreground)
  const quadraticColor = quadraticBase?.toCss('rgba') ?? theme.foreground
  const cubicBase = Color.parse(theme.palette[2] ?? theme.foreground)
  const cubicColor = cubicBase?.toCss('rgba') ?? theme.foreground
  const controlPointColor = theme.palette[0]

  // Deterministic point scaffold keeps shape stable when toggling curve types.
  const stableTenth = (rowIndex) => {
    const n = (simplex2(13.7 + rowIndex * 0.31, rowIndex * 0.57 - 13.7) + 1) / 2
    const tenth = Math.floor(n * 9) + 1
    return Math.max(1, Math.min(9, tenth))
  }

  const buildPoints = () =>
    Y_LEVELS.map((level, i) => v(svg.w * (stableTenth(i) / 10), svg.h * level))

  const drawStraight = () => {
    const pts = buildPoints()
    const path = new Path(pts, true)
    svg.path(path.buildPolygon(false), 'transparent', straightColor, 2)
  }

  const drawQuadratic = () => {
    const pts = buildPoints()
    const path = new Path(pts, true)
    svg.path(
      path.buildQuadBez(controls.quadraticTension, controls.quadraticOffset, false),
      'transparent',
      quadraticColor,
      2
    )
  }

  const drawCubic = () => {
    const pts = buildPoints()
    const path = new Path(pts, true)
    svg.path(path.buildSpline(controls.cubicTension, false), 'transparent', cubicColor, 2)
  }

  const drawSamplePoints = () => {
    const pts = buildPoints()
    pts.forEach((pt) => {
      svg.circle(pt, 4, controlPointColor, 'transparent')
    })
  }

  const drawQuadraticHandles = () => {
    const pts = buildPoints()
    const quadraticHandleColor =
      quadraticBase?.withAlpha(controls.handleOpacity).toCss('rgba') ?? theme.foreground
    for (const { a, cp, b } of quadBezHandles(pts, controls.quadraticTension, controls.quadraticOffset)) {
      svg.line(a, cp, quadraticHandleColor, 1)
      svg.line(cp, b, quadraticHandleColor, 1)
      svg.circle(cp, 3, quadraticHandleColor, 'transparent')
    }
  }

  const drawCubicHandles = () => {
    const pts = buildPoints()
    const cubicHandleColor =
      cubicBase?.withAlpha(controls.handleOpacity).toCss('rgba') ?? theme.foreground
    for (const { pt, cpIn, cpOut } of splineHandles(pts, controls.cubicTension)) {
      svg.line(pt, cpIn, cubicHandleColor, 1)
      svg.line(pt, cpOut, cubicHandleColor, 1)
      svg.circle(cpIn, 3, cubicHandleColor, 'transparent')
      svg.circle(cpOut, 3, cubicHandleColor, 'transparent')
    }
  }

  const render = () => {
    svg.stage.innerHTML = ''
    svg.rect(v(0, 0), svg.w, svg.h, theme.background, 'none', 0)

    const enabled = new Set(controls.enabledCurves)
    if (enabled.has('straight')) drawStraight()
    if (enabled.has('quadratic')) drawQuadratic()
    if (enabled.has('cubic')) drawCubic()
    if (controls.showHandles && enabled.has('quadratic')) drawQuadraticHandles()
    if (controls.showHandles && enabled.has('cubic')) drawCubicHandles()
    if (controls.showSamplePoints) drawSamplePoints()
  }

  render()
}
