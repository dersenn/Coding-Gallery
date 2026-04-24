import { shortcuts, Path } from '~/types/project'

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
 */
export function draw(context) {
  const { svg, controls, utils, theme } = context
  const { v } = shortcuts(utils)

  const divLengthByMode = (a, b, nSeg, includeEndpoints, minSegmentRatio, mode) => {
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

  const rowColor = (rowIndex) => {
    if (controls.pointColorMode === 'singleColor') {
      return controls.pointColor
    }
    const r = Math.floor(utils.noise.cell(7.1, rowIndex) * 255)
    const g = Math.floor(utils.noise.cell(13.7, rowIndex) * 255)
    const b = Math.floor(utils.noise.cell(19.1, rowIndex) * 255)
    return `rgb(${r}, ${g}, ${b})`
  }

  const buildStructure = () => {
    const rows = Math.max(2, Math.floor(controls.rows))
    const cols = Math.max(2, Math.floor(controls.cols))
    const subStrands = Math.max(1, Math.floor(controls.subStrands))
    const minSegmentRatio = Math.max(0, controls.minSegmentRatio)
    const mode = controls.edgeMode

    const leftEdge = divLengthByMode(v(0, 0), v(0, svg.h), rows, true, minSegmentRatio, mode)
    const rightEdge = divLengthByMode(v(svg.w, 0), v(svg.w, svg.h), rows, true, minSegmentRatio, mode)

    const pointsByRow = []
    for (let y = 0; y <= rows; y++) {
      pointsByRow[y] = divLengthByMode(leftEdge[y], rightEdge[y], cols, true, minSegmentRatio, mode)
    }

    const strands = []
    for (let x = 0; x < cols; x++) {
      for (let s = 0; s < subStrands; s++) {
        let stableT
        if (s === 0) {
          stableT = 0
        } else {
          const lo = minSegmentRatio
          const hi = 1 - minSegmentRatio
          const rawT = utils.noise.cell(x, s)
          stableT = lo < hi ? lo + rawT * (hi - lo) : 0.5
        }

        const strandPts = []
        for (let y = 0; y <= rows; y++) {
          const row = pointsByRow[y]
          strandPts.push(row[x].lerp(row[x + 1], stableT))
        }
        strands.push(strandPts)
      }
    }

    return { rows, cols, pointsByRow, strands }
  }

  const render = () => {
    utils.seed.reset()
    svg.stage.replaceChildren()
    const structure = buildStructure()

    if (controls.showPaths) {
      for (const strandPts of structure.strands) {
        const strand = new Path(strandPts, false)
        svg.path(
          strand.buildSpline(0.4, false),
          'transparent',
          controls.pathStroke,
          controls.pathStrokeWidth
        )
      }
    }

    if (controls.showPoints) {
      for (let y = 0; y <= structure.rows; y++) {
        svg.circles(
          structure.pointsByRow[y],
          controls.pointRadius,
          rowColor(y),
          'transparent',
          1
        )
      }
    }
  }

  render()
}
