import { Grid, GridCell } from '~/types/project'
import { shortcuts } from '~/utils/shortcuts'
import { lightTheme, defaultTheme } from '~/utils/theme'


// ----------------------------------------------------------------------------

class MyGrid extends Grid {
  createCell(config) {
    return new MyCell(config)
  }
}

class MyCell extends GridCell {
  constructor(config) {
    super(config)
  }

  draw(canvas, stroke = lightTheme.foreground, fill = null) {
    const { mm, pt } = canvas.print
    
    const corners = this.geom.corners
    if (!corners) return
    canvas.withContext(ctx => {
      ctx.beginPath()
      ctx.moveTo(corners[0].x, corners[0].y)
      for (let i = 1; i < corners.length; i++) {
        ctx.lineTo(corners[i].x, corners[i].y)
      }
      ctx.closePath()
      if (fill) {
        ctx.fillStyle = fill
        ctx.fill()
      }
      ctx.strokeStyle = stroke
      ctx.lineWidth = pt(1)
      ctx.stroke()
    })
  }
}


// ----------------------------------------------------------------------------

export function draw(context) {
  const { canvas, utils, controls: c } = context
  const { v, pick, pickMany } = shortcuts(utils)
  if (!canvas) return

  const { mm, pt } = canvas.print

  const border = {
    top: mm(12),
    right: mm(12),
    bottom: mm(18),
    left: mm(12),
  }

  const color = lightTheme.foreground
  const pinEdges = false
  const pinFalloff = 20 // in vertex steps; tweak


  // GRID
  const grid = new MyGrid({
    cols: 80,
    rows: 120,
    width: canvas.w - border.left - border.right,
    height: canvas.h - border.top - border.bottom,
    x: border.left,
    y: border.top,
    utils,
  })

  // WARPING LATTICE
  const origin = grid.at(0, 0).tl()
  const cellW = grid.at(0, 0).width
  const cellH = grid.at(0, 0).height
  const lattice = Array.from({ length: grid.rows + 1 }, (_, r) =>
    Array.from({ length: grid.cols + 1 }, (_, c) =>
      v(origin.x + c * cellW, origin.y + r * cellH)
    )
  )

  // WARPING NOISE (mean-subtracted)
  const warpAmp = mm(20) // tweak
  const warpScale = 0.002 // tweak (noise frequency)
  const { noise2 } = shortcuts(utils)
  // First pass: compute offsets + mean
  let sumDx = 0
  let sumDy = 0
  const offsets = Array.from({ length: grid.rows + 1 }, () =>
    Array.from({ length: grid.cols + 1 }, () => ({ dx: 0, dy: 0 }))
  )
  for (let r = 0; r <= grid.rows; r++) {
    for (let c = 0; c <= grid.cols; c++) {
      const p = lattice[r][c]
      const nx = p.x * warpScale
      const ny = p.y * warpScale
      const dx = noise2(nx + 100, ny + 100)
      const dy = noise2(nx - 100, ny - 100)
      offsets[r][c].dx = dx
      offsets[r][c].dy = dy
      sumDx += dx
      sumDy += dy
    }
  }
  const count = (grid.rows + 1) * (grid.cols + 1)
  const meanDx = sumDx / count
  const meanDy = sumDy / count

  // Second pass: apply centered offsets
  for (let r = 0; r <= grid.rows; r++) {
    for (let c = 0; c <= grid.cols; c++) {
      const p = lattice[r][c]
      const { dx, dy } = offsets[r][c]
      let w = 1
      if (pinEdges) {
        const dEdge = Math.min(c, r, grid.cols - c, grid.rows - r) // 0 at edge
        w = Math.max(0, Math.min(1, dEdge / pinFalloff))
        w = w * w // ease-in (optional)
      }
      p.x += (dx - meanDx) * warpAmp * w
      p.y += (dy - meanDy) * warpAmp * w
    }
  }

  // CELL GEOMETRY
  grid.forEach((cell) => {
    const r = cell.row
    const c = cell.col
    const tl = lattice[r][c]
    const tr = lattice[r][c + 1]
    const br = lattice[r + 1][c + 1]
    const bl = lattice[r + 1][c]
    cell.geom = {
      corners: [tl, tr, br, bl],
      center: v(
        (tl.x + tr.x + br.x + bl.x) / 4,
        (tl.y + tr.y + br.y + bl.y) / 4
      ),
    }
  })


  // DRAWING
  canvas.background(lightTheme.background)
  grid.forEach(cell => {
    cell.draw(canvas, lightTheme.foreground)
  })

}