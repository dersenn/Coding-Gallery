import { shortcuts } from '~/types/project'

/**
 * Ballooney (legacy port)
 *
 * Intent:
 * - Preserve the earliest "organic tile blob" output from the original standalone sketch.
 *
 * What is being tested/preserved:
 * - Utility-driven edge subdivision modes around rectangular tiles.
 * - Quadratic segments whose control points are pulled toward each tile center.
 */
export function draw(context) {
  const { svg, controls, utils, theme } = context
  const { v } = shortcuts(utils)

  const buildTile = (tl, br) => {
    const bl = v(tl.x, br.y)
    const tr = v(br.x, tl.y)
    return { tl, bl, br, tr, c: tl.mid(br) }
  }

  const divLengthByMode = (a, b, nSeg) => {
    const minSegmentRatio = Math.max(0, controls.minSegmentRatio)
    const mode = controls.edgeDivisionMode

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

  const buildStructure = () => {
    const out = []
    grid.forEach((cell) => {
      const tile = buildTile(v(cell.x, cell.y), v(cell.x + cell.width, cell.y + cell.height))
      let pts = []
      const edgeSegments = (edgeIndex) => 2 + ((cell.col * 7 + cell.row * 11 + edgeIndex * 3) % 3)
      pts = pts.concat(
        divLengthByMode(tile.tl, tile.bl, edgeSegments(0)),
        divLengthByMode(tile.bl, tile.br, edgeSegments(1)),
        divLengthByMode(tile.br, tile.tr, edgeSegments(2)),
        divLengthByMode(tile.tr, tile.tl, edgeSegments(3))
      )
      pts = pts.concat(pts[0])
      out.push({ tile, pts })
    })
    return out
  }

  const render = () => {
    utils.seed.reset()
    svg.stage.replaceChildren()
    for (const { tile, pts } of buildStructure()) {
      let d = ''
      for (let j = 0; j < pts.length; j++) {
        if (j === 0) {
          d += `M ${pts[j].x} ${pts[j].y} `
          continue
        }
        const m = pts[j].mid(pts[j - 1])
        const cp = m.lerp(tile.c, 0.5)
        d += `Q ${cp.x} ${cp.y} ${pts[j].x} ${pts[j].y} `
      }
      svg.path(d, theme.foreground, 'transparent', 1)
    }
  }

  render()
}
