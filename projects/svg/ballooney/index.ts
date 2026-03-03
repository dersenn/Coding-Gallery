import type {
  CleanupFunction,
  ProjectActionDefinition,
  ProjectContext,
  ProjectControlDefinition,
  Vec
} from '~/types/project'
import { SVG, shortcuts } from '~/types/project'
import { syncControlState } from '~/composables/useControls'

/**
 * Ballooney (standalone legacy port)
 *
 * Intent:
 * - Preserve the earliest "organic tile blob" output from the original standalone sketch.
 *
 * What is being tested/preserved:
 * - Utility-driven edge subdivision modes around rectangular tiles.
 * - Quadratic segments whose control points are pulled toward each tile center.
 *
 * Update after port:
 * - Added controls to show the upgraded divLength() utility in action.
 */
export const actions: ProjectActionDefinition[] = [
  { key: 'download-svg', label: 'Download SVG' }
]

interface TileCorners {
  tl: Vec
  bl: Vec
  br: Vec
  tr: Vec
  c: Vec
}

type EdgeDivisionMode =
  | 'randomGaps'
  | 'randomSorted'
  | 'gapAscending'
  | 'gapDescending'
  | 'uniform'
  | 'curveLog'
  | 'fibonacci'

export const controls: ProjectControlDefinition[] = [
  {
    type: 'group',
    id: 'subdivision',
    label: 'Subdivision',
    collapsible: true,
    defaultOpen: true,
    controls: [
      {
        type: 'select',
        label: 'Edge Division Mode',
        key: 'edgeDivisionMode',
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
  }
]

export async function init(
  container: HTMLElement,
  context: ProjectContext
): Promise<CleanupFunction> {
  const { controls, onControlChange, utils, registerAction, theme } = context
  const { v } = shortcuts(utils)

  const svg = new SVG({
    parent: container,
    id: 'ballooney'
  })
  const controlState = {
    edgeDivisionMode: (controls.edgeDivisionMode as EdgeDivisionMode) ?? 'uniform',
    minSegmentRatio: (controls.minSegmentRatio as number) ?? 0
  }

  // Rebuild legacy corner naming so path generation reads like original code.
  const buildTile = (tl: Vec, br: Vec): TileCorners => {
    const bl = v(tl.x, br.y)
    const tr = v(br.x, tl.y)
    return {
      tl,
      bl,
      br,
      tr,
      c: tl.mid(br)
    }
  }

  const divLengthByMode = (a: Vec, b: Vec, nSeg: number): Vec[] => {
    const minSegmentRatio = Math.max(0, controlState.minSegmentRatio)
    const mode = controlState.edgeDivisionMode

    if (mode === 'curveLog') {
      return utils.math.divLength(a, b, nSeg, {
        mode: 'curve',
        curve: { kind: 'log', strength: 8 },
        minSegmentRatio
      })
    }
    return utils.math.divLength(a, b, nSeg, { mode, minSegmentRatio })
  }

  const grid = utils.grid.create({ cols: 2, rows: 2, width: svg.w, height: svg.h })

  interface TilePathData {
    tile: TileCorners
    pts: Vec[]
  }

  const buildStructure = (): TilePathData[] => {
    const out: TilePathData[] = []
    grid.forEach((cell) => {
      const tile = buildTile(v(cell.x, cell.y), v(cell.x + cell.width, cell.y + cell.height))

      let pts: Vec[] = []
      const edgeSegments = (edgeIndex: number) => 2 + ((cell.col * 7 + cell.row * 11 + edgeIndex * 3) % 3)
      pts = pts.concat(
        divLengthByMode(tile.tl, tile.bl, edgeSegments(0)),
        divLengthByMode(tile.bl, tile.br, edgeSegments(1)),
        divLengthByMode(tile.br, tile.tr, edgeSegments(2)),
        divLengthByMode(tile.tr, tile.tl, edgeSegments(3))
      )

      // Close the local point ring so final segment returns to first sampled point.
      pts = pts.concat(pts[0]!)
      out.push({ tile, pts })
    })
    return out
  }

  const draw = () => {
    utils.seed.reset()
    svg.stage.replaceChildren()
    for (const data of buildStructure()) {
      const { tile, pts } = data
      let d = ''
      for (let j = 0; j < pts.length; j++) {
        if (j === 0) {
          d += `M ${pts[j]!.x} ${pts[j]!.y} `
          continue
        }
        const m = pts[j]!.mid(pts[j - 1]!)
        const cp = m.lerp(tile.c, 0.5)
        d += `Q ${cp.x} ${cp.y} ${pts[j]!.x} ${pts[j]!.y} `
      }
      svg.makePath(d, theme.foreground, 'transparent', 1)
    }
  }
  draw()

  onControlChange((nextControls) => {
    syncControlState(controlState, nextControls)
    draw()
  })

  registerAction('download-svg', () => {
    svg.save(utils.seed.current, 'ballooney')
  })

  return () => {
    svg.stage.remove()
  }
}
