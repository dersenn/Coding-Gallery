import type {
  CleanupFunction,
  ProjectActionDefinition,
  ProjectContext,
  ProjectControlDefinition,
  Vec
} from '~/types/project'
import { Path, SVG, shortcuts } from '~/types/project'
import { syncControlState } from '~/composables/useControls'

type EdgeDivisionMode =
  | 'uniform'
  | 'randomGaps'
  | 'gapDescending'
  | 'gapAscending'
  | 'randomSorted'
  | 'curveLog'
  | 'fibonacci'

type PointColorMode = 'rowRandom' | 'singleColor'

/**
 * Lattice Drift (mesh-01 port)
 *
 * Intent:
 * - Preserve the original "warped lattice + vertical spline strands" behavior.
 *
 * What is being tested/preserved:
 * - Two-stage random subdivision (left/right edges, then each row between edges).
 * - Column-wise strand extraction and spline rendering.
 * - Optional point overlay for scaffold visibility.
 *
 * Non-goals:
 * - This is not a strict pixel-perfect recreation of all legacy defaults.
 */
export const controls: ProjectControlDefinition[] = [
  {
    type: 'group',
    id: 'structure',
    label: 'Structure',
    collapsible: true,
    defaultOpen: true,
    controls: [
      { type: 'slider', label: 'Rows', key: 'rows', default: 10, min: 2, max: 40, step: 1 },
      { type: 'slider', label: 'Cols', key: 'cols', default: 20, min: 2, max: 60, step: 1 },
      { type: 'slider', label: 'Sub-Strands', key: 'subStrands', default: 1, min: 1, max: 8, step: 1 }
    ]
  },
  {
    type: 'group',
    id: 'subdivision',
    label: 'Subdivision',
    collapsible: true,
    defaultOpen: true,
    controls: [
      {
        type: 'select',
        label: 'Division Mode',
        key: 'edgeMode',
        default: 'randomGaps',
        options: [
          { label: 'Uniform', value: 'uniform' },
          { label: 'Random (Gap Weights)', value: 'randomGaps' },
          { label: 'Random (Gap Weights, Descending)', value: 'gapDescending' },
          { label: 'Random (Gap Weights, Ascending)', value: 'gapAscending' },
          { label: 'Random (Sorted Positions)', value: 'randomSorted' },
          { label: 'Curve (Log)', value: 'curveLog' },
          { label: 'Fibonacci', value: 'fibonacci' }
        ]
      },
      {
        type: 'slider',
        label: 'Min Segment Ratio',
        key: 'minSegmentRatio',
        default: 0,
        min: 0,
        max: 0.3,
        step: 0.005
      }
    ]
  },
  {
    type: 'group',
    id: 'layers',
    label: 'Layers',
    collapsible: true,
    defaultOpen: true,
    controls: [
      { type: 'toggle', label: 'Show Paths', key: 'showPaths', default: true },
      { type: 'toggle', label: 'Show Points', key: 'showPoints', default: true }
    ]
  },
  {
    type: 'group',
    id: 'style',
    label: 'Style',
    collapsible: true,
    defaultOpen: false,
    controls: [
      { type: 'color', label: 'Path Stroke', key: 'pathStroke', default: '#00ff00' },
      { type: 'slider', label: 'Path Stroke Width', key: 'pathStrokeWidth', default: 1, min: 0.5, max: 4, step: 0.5 },
      { type: 'slider', label: 'Point Radius', key: 'pointRadius', default: 5, min: 1, max: 12, step: 1 },
      {
        type: 'select',
        label: 'Point Colors',
        key: 'pointColorMode',
        default: 'rowRandom',
        options: [
          { label: 'Row Random', value: 'rowRandom' },
          { label: 'Single Color', value: 'singleColor' }
        ]
      },
      {
        type: 'color',
        label: 'Point Color',
        key: 'pointColor',
        default: '#ff0066',
        visibleWhenSelectKey: 'pointColorMode',
        visibleWhenSelectValue: 'singleColor'
      }
    ]
  }
]

export const actions: ProjectActionDefinition[] = [
  { key: 'download-svg', label: 'Download SVG' }
]

export async function init(
  container: HTMLElement,
  context: ProjectContext
): Promise<CleanupFunction> {
  const { controls, onControlChange, registerAction, utils, theme } = context
  const { v } = shortcuts(utils)

  const controlState = {
    rows: controls.rows as number,
    cols: controls.cols as number,
    subStrands: controls.subStrands as number,
    edgeMode: controls.edgeMode as EdgeDivisionMode,
    minSegmentRatio: controls.minSegmentRatio as number,
    showPaths: controls.showPaths as boolean,
    showPoints: controls.showPoints as boolean,
    pathStroke: theme.foreground,
    pathStrokeWidth: controls.pathStrokeWidth as number,
    pointRadius: controls.pointRadius as number,
    pointColorMode: controls.pointColorMode as PointColorMode,
    pointColor: controls.pointColor as string
  }

  const svg = new SVG({
    parent: container,
    id: 'lattice-drift'
  })

  const divLengthByMode = (
    a: Vec,
    b: Vec,
    nSeg: number,
    includeEndpoints: boolean,
    minSegmentRatio: number,
    mode: EdgeDivisionMode
  ): Vec[] => {
    if (mode === 'curveLog') {
      return utils.math.divLength(a, b, nSeg, {
        mode: 'curve',
        curve: { kind: 'log', strength: 8 },
        includeEndpoints,
        minSegmentRatio
      })
    }
    return utils.math.divLength(a, b, nSeg, { mode, includeEndpoints, minSegmentRatio })
  }

  const rowColor = (rowIndex: number): string => {
    if (controlState.pointColorMode === 'singleColor') {
      return controlState.pointColor
    }

    // Stable row colors keyed by (channelId, rowIndex) — order-independent, seed-dependent.
    const r = Math.floor(utils.noise.cell(7.1, rowIndex) * 255)
    const g = Math.floor(utils.noise.cell(13.7, rowIndex) * 255)
    const b = Math.floor(utils.noise.cell(19.1, rowIndex) * 255)
    return `rgb(${r}, ${g}, ${b})`
  }

  interface LatticeStructure {
    rows: number
    cols: number
    pointsByRow: Vec[][]
    strands: Vec[][]
  }

  const buildStructure = (): LatticeStructure => {
    const rows = Math.max(2, Math.floor(controlState.rows))
    const cols = Math.max(2, Math.floor(controlState.cols))
    const subStrands = Math.max(1, Math.floor(controlState.subStrands))
    const minSegmentRatio = Math.max(0, controlState.minSegmentRatio)
    const mode = controlState.edgeMode

    const leftEdge = divLengthByMode(v(0, 0), v(0, svg.h), rows, true, minSegmentRatio, mode)
    const rightEdge = divLengthByMode(v(svg.w, 0), v(svg.w, svg.h), rows, true, minSegmentRatio, mode)

    const pointsByRow: Vec[][] = []
    for (let y = 0; y <= rows; y++) {
      pointsByRow[y] = divLengthByMode(
        leftEdge[y]!,
        rightEdge[y]!,
        cols,
        true,
        minSegmentRatio,
        mode
      )
    }

    const strands: Vec[][] = []
    for (let x = 0; x < cols; x++) {
      for (let s = 0; s < subStrands; s++) {
        const strandPts: Vec[] = []
        for (let y = 0; y <= rows; y++) {
          const row = pointsByRow[y]!
          const segmentPts = divLengthByMode(
            row[x]!,
            row[x + 1]!,
            subStrands,
            true,
            minSegmentRatio,
            mode
          )
          strandPts.push(segmentPts[s]!)
        }
        strands.push(strandPts)
      }
    }

    return { rows, cols, pointsByRow, strands }
  }

  const draw = () => {
    utils.seed.reset()
    svg.stage.replaceChildren()
    const structure = buildStructure()

    if (controlState.showPaths) {
      for (const strandPts of structure.strands) {
        const strand = new Path(strandPts, false)
        svg.makePath(
          strand.buildSpline(0.4, false),
          'transparent',
          controlState.pathStroke,
          controlState.pathStrokeWidth
        )
      }
    }

    if (controlState.showPoints) {
      for (let y = 0; y <= structure.rows; y++) {
        svg.makeCircles(
          structure.pointsByRow[y]!,
          controlState.pointRadius,
          rowColor(y),
          'transparent',
          1
        )
      }
    }
  }

  draw()

  onControlChange((nextControls) => {
    syncControlState(controlState, nextControls)
    draw()
  })

  registerAction('download-svg', () => {
    svg.save(utils.seed.current, 'lattice-drift')
  })

  return () => {
    svg.stage.remove()
  }
}
