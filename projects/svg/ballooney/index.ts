import type {
  CleanupFunction,
  ProjectActionDefinition,
  ProjectContext,
  Vec
} from '~/types/project'
import { SVG, shortcuts } from '~/types/project'

/**
 * Ballooney (standalone legacy port)
 *
 * Intent:
 * - Preserve the earliest "organic tile blob" output from the original standalone sketch.
 *
 * What is being tested/preserved:
 * - Progressive random edge subdivision around rectangular tiles.
 * - Quadratic segments whose control points are pulled toward each tile center.
 *
 * Non-goals:
 * - This is not a parametric/interactive version yet; it is a faithful baseline port.
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

export async function init(
  container: HTMLElement,
  context: ProjectContext
): Promise<CleanupFunction> {
  const { utils, registerAction } = context
  const { v, rnd, rndInt } = shortcuts(utils)

  const svg = new SVG({
    parent: container,
    id: 'ballooney'
  })

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

  // Legacy-equivalent progressive random subdivision:
  // each next split lerps from the last split point toward the segment end.
  // This creates the characteristic "end-heavy" clustering seen in the source sketch.
  const divLengthRandom = (a: Vec, b: Vec, nSeg: number): Vec[] => {
    const out: Vec[] = []
    let current = a
    for (let i = 0; i < nSeg - 1; i++) {
      current = current.lerp(b, rnd())
      out.push(current)
    }
    return out
  }

  const nRows = 2
  const nCols = 2
  const cellW = svg.w / nCols
  const cellH = svg.h / nRows

  // Legacy composition: fixed 2x2 tiling with one independent path per tile.
  for (let x = 0; x < nCols; x++) {
    const xOff = x * cellW
    for (let y = 0; y < nRows; y++) {
      const yOff = y * cellH
      const tile = buildTile(v(xOff, yOff), v(xOff + cellW, yOff + cellH))

      let pts: Vec[] = []
      pts = pts.concat(
        divLengthRandom(tile.tl, tile.bl, rndInt(2, 4)),
        divLengthRandom(tile.bl, tile.br, rndInt(2, 4)),
        divLengthRandom(tile.br, tile.tr, rndInt(2, 4)),
        divLengthRandom(tile.tr, tile.tl, rndInt(2, 4))
      )

      // Close the local point ring so final segment returns to first sampled point.
      pts = pts.concat(pts[0]!)

      let d = ''
      for (let j = 0; j < pts.length; j++) {
        if (j === 0) {
          d += `M ${pts[j]!.x} ${pts[j]!.y} `
          continue
        }
        // Control point is midpoint of edge, then pulled halfway toward tile center.
        // This reproduces the inward-curving edge behavior from the legacy sketch.
        const m = pts[j]!.mid(pts[j - 1]!)
        const cp = m.lerp(tile.c, 0.5)
        d += `Q ${cp.x} ${cp.y} ${pts[j]!.x} ${pts[j]!.y} `
      }

      svg.makePath(d, '#0f0', 'transparent', 1)
    }
  }

  registerAction('download-svg', () => {
    svg.save(utils.seed.current, 'ballooney')
  })

  return () => {
    svg.stage.remove()
  }
}
