import type {
  CleanupFunction,
  ProjectActionDefinition,
  ProjectContext,
  ProjectControlDefinition,
  Vec
} from '~/types/project'
import { Color, Path, SVG, shortcuts, quadBezHandles, splineHandles, resolveContainer } from '~/types/project'
import { syncControlState } from '~/composables/useControls'

type CurveLayer = 'straight' | 'quadratic' | 'cubic'

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
const Y_LEVELS = [0.1, 0.25, 0.5, 0.75, 0.9] as const

export const controls: ProjectControlDefinition[] = [
  {
    type: 'group',
    id: 'curves',
    label: 'Curves',
    collapsible: true,
    defaultOpen: true,
    controls: [
      {
        type: 'checkbox-group',
        label: 'Curves',
        key: 'enabledCurves',
        default: ['straight', 'quadratic', 'cubic'],
        options: [
          { label: 'Straight', value: 'straight' },
          { label: 'Quadratic Bezier', value: 'quadratic' },
          { label: 'Cubic Spline', value: 'cubic' }
        ]
      },
      {
        type: 'slider',
        label: 'Quadratic Tension',
        key: 'quadraticTension',
        default: 0.5,
        min: -1,
        max: 1,
        step: 0.05
      },
      {
        type: 'slider',
        label: 'Quadratic Offset',
        key: 'quadraticOffset',
        default: 0.5,
        min: 0,
        max: 1,
        step: 0.05
      },
      {
        type: 'slider',
        label: 'Cubic Tension',
        key: 'cubicTension',
        default: 0.5,
        min: 0,
        max: 1,
        step: 0.05
      }
    ]
  },
  {
    type: 'group',
    id: 'overlay',
    label: 'Overlay',
    collapsible: true,
    defaultOpen: false,
    controls: [
      {
        type: 'toggle',
        label: 'Sample Points',
        key: 'showSamplePoints',
        default: true
      },
      {
        type: 'toggle',
        label: 'Show Handles',
        key: 'showHandles',
        default: false
      },
      {
        type: 'slider',
        label: 'Handle Opacity',
        key: 'handleOpacity',
        default: 0.5,
        min: 0.1,
        max: 1,
        step: 0.05,
        visibleWhenSelectKey: 'showHandles',
        visibleWhenSelectValue: true
      }
    ]
  }
]

export const actions: ProjectActionDefinition[] = [
  { key: 'download-svg', label: 'Download SVG' }
]

export const container = 'full'

export async function init(
  container: HTMLElement,
  context: ProjectContext
): Promise<CleanupFunction> {
  const { controls, utils, theme, onControlChange, registerAction } = context
  const { v, simplex2 } = shortcuts(utils)

  const controlState = {
    enabledCurves: controls.enabledCurves as CurveLayer[],
    showSamplePoints: controls.showSamplePoints as boolean,
    showHandles: controls.showHandles as boolean,
    quadraticTension: controls.quadraticTension as number,
    quadraticOffset: controls.quadraticOffset as number,
    cubicTension: controls.cubicTension as number,
    handleOpacity: controls.handleOpacity as number
  }
  const straightBase = Color.parse(theme.palette[0] ?? theme.foreground)
  const straightColor = straightBase?.toCss('rgba') ?? theme.foreground
  const quadraticBase = Color.parse(theme.palette[1] ?? theme.foreground)
  const quadraticColor = quadraticBase?.toCss('rgba') ?? theme.foreground
  const cubicBase = Color.parse(theme.palette[2] ?? theme.foreground)
  const cubicColor = cubicBase?.toCss('rgba') ?? theme.foreground
  const controlPointColor = theme.palette[0]

  const { el, width, height } = resolveContainer(container, 'full')
  const svg = new SVG({ parent: el, id: 'bezier-lab', width, height })

  // Deterministic point scaffold keeps shape stable when toggling curve types.
  // We map each row to one of 9 horizontal bands (10%-90% width positions),
  // mirroring the legacy `randInt(1, 9) / 10` pattern.
  const stableTenth = (rowIndex: number): number => {
    const n = (simplex2(13.7 + rowIndex * 0.31, rowIndex * 0.57 - 13.7) + 1) / 2
    const tenth = Math.floor(n * 9) + 1
    return Math.max(1, Math.min(9, tenth))
  }

  // These are normalized Y positions (0..1) for the anchor/sample points.
  // Example: 0.25 means "25% down the stage height".
  const buildPoints = (): Vec[] =>
    Y_LEVELS.map((level, i) => v(svg.w * (stableTenth(i) / 10), svg.h * level))

  const drawStraight = () => {
    const pts = buildPoints()
    const path = new Path(pts, true)
    svg.makePath(path.buildPolygon(false), 'transparent', straightColor, 2)
  }

  const drawQuadratic = () => {
    const pts = buildPoints()
    const path = new Path(pts, true)
    svg.makePath(
      path.buildQuadBez(controlState.quadraticTension, controlState.quadraticOffset, false),
      'transparent',
      quadraticColor,
      2
    )
  }

  const drawCubic = () => {
    const pts = buildPoints()
    const path = new Path(pts, true)
    svg.makePath(path.buildSpline(controlState.cubicTension, false), 'transparent', cubicColor, 2)
  }

  const drawSamplePoints = () => {
    const pts = buildPoints()
    pts.forEach((pt) => {
      svg.makeCircle(pt, 4, controlPointColor, 'transparent')
    })
  }

  const drawQuadraticHandles = () => {
    const pts = buildPoints()
    const quadraticHandleColor =
      quadraticBase?.withAlpha(controlState.handleOpacity).toCss('rgba') ?? theme.foreground
    for (const { a, cp, b } of quadBezHandles(pts, controlState.quadraticTension, controlState.quadraticOffset)) {
      svg.makeLine(a, cp, quadraticHandleColor, 1)
      svg.makeLine(cp, b, quadraticHandleColor, 1)
      svg.makeCircle(cp, 3, quadraticHandleColor, 'transparent')
    }
  }

  const drawCubicHandles = () => {
    const pts = buildPoints()
    const cubicHandleColor =
      cubicBase?.withAlpha(controlState.handleOpacity).toCss('rgba') ?? theme.foreground
    for (const { pt, cpIn, cpOut } of splineHandles(pts, controlState.cubicTension)) {
      svg.makeLine(pt, cpIn, cubicHandleColor, 1)
      svg.makeLine(pt, cpOut, cubicHandleColor, 1)
      svg.makeCircle(cpIn, 3, cubicHandleColor, 'transparent')
      svg.makeCircle(cpOut, 3, cubicHandleColor, 'transparent')
    }
  }

  const draw = () => {
    svg.stage.innerHTML = ''
    svg.makeRect(v(0, 0), svg.w, svg.h, theme.background, 'none', 0)

    // Curve toggles intentionally behave like "compare overlays" (can render all together).
    const enabled = new Set(controlState.enabledCurves)
    if (enabled.has('straight')) drawStraight()
    if (enabled.has('quadratic')) drawQuadratic()
    if (enabled.has('cubic')) drawCubic()
    if (controlState.showHandles && enabled.has('quadratic')) drawQuadraticHandles()
    if (controlState.showHandles && enabled.has('cubic')) drawCubicHandles()
    if (controlState.showSamplePoints) drawSamplePoints()
  }

  draw()

  onControlChange((nextControls) => {
    syncControlState(controlState, nextControls)
    draw()
  })

  registerAction('download-svg', () => {
    svg.save(utils.seed.current, 'bezier-lab')
  })

  return () => {
    svg.stage.remove()
  }
}
