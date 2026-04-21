import { Grid, GridCell } from '~/types/project'
import { shortcuts } from '~/utils/shortcuts'
import { lightTheme } from '~/utils/theme'



// ----------------------------------------------------------------------------

class MyGrid extends Grid {
  constructor(config) {
    super(config)
  }

  buildLattice() {
    const { v } = shortcuts(this.utils)
    const origin = this.at(0, 0).tl()
    const cellW = this.at(0, 0).width
    const cellH = this.at(0, 0).height
    const lattice = Array.from({ length: this.rows + 1 }, (_, r) =>
      Array.from({ length: this.cols + 1 }, (_, c) =>
        v(origin.x + c * cellW, origin.y + r * cellH)
      )
    )
    return lattice
  }

  createCell(config) {
    return new MyCell(config)
  }
}

class MyCell extends GridCell {
  draw(canvas) {
    const { v, vMid } = shortcuts(this.grid.utils)
    const { mm, pt } = canvas.print

    // a quick test to see if the cell is on the right edge
    // if (this.edgeFlags().right) {
    //   canvas.circle(this.tl(), this.width, fill)
    // }

    const fill = lightTheme.background
    const stroke = lightTheme.foreground
    
    const corners = this.geom.corners
    if (!corners) return

    canvas.withContext(ctx => {
      ctx.beginPath()
      ctx.moveTo(corners[0].x, corners[0].y)
      for (let i = 1; i < corners.length; i++) {
        ctx.lineTo(corners[i].x, corners[i].y)
      }
      ctx.closePath()
      ctx.strokeStyle = lightTheme.background
      ctx.lineWidth = pt(1)
      ctx.stroke()
      ctx.fillStyle = fill
      ctx.fill()
    })

    const ct = vMid(corners[0], corners[1])
    const cr = vMid(corners[1], corners[2])
    const cb = vMid(corners[2], corners[3])
    const cl = vMid(corners[3], corners[0])

    canvas.line(ct, cb, stroke)
    // canvas.line(cl, cr, stroke, pt(1))

  }
}


// ----------------------------------------------------------------------------

export function draw(context) {
  const { canvas, utils, controls: c } = context
  const { v, rndInt } = shortcuts(utils)
  if (!canvas) return

  const { mm, pt } = canvas.print

  const border = {
    top: mm(12),
    right: mm(12),
    bottom: mm(18),
    left: mm(12),
  }

  const color = lightTheme.palette[2]
  const pinEdges = c.pinEdges ?? false
  const pinFalloff = c.pinFalloff ?? 20

  // context.setControls([
  //   {
  //   key: 'warpAmpMm',
  //   value: (rndInt(3, 15))
  //   }
  // ])


  // GRID
  const grid = new MyGrid({
    cols: c.cols ?? 80,
    rows: c.rows ?? 120,
    width: canvas.w - border.left - border.right,
    height: canvas.h - border.top - border.bottom,
    x: border.left,
    y: border.top,
    utils,
  })

  // WARPING LATTICE
  grid.lattice = grid.buildLattice()

  // WARPING NOISE (mean-subtracted)
  const warpAmp = mm(c.warpAmpMm ?? 20)
  const warpScale = c.warpScale ?? 0.003
  const warpScaleX = c.warpScaleX ?? 1
  const warpScaleY = c.warpScaleY ?? 1
  const octaves = Math.max(1, Math.floor(c.octaves ?? 1))
  const lacunarity = c.lacunarity ?? 2.0
  const persistence = c.persistence ?? 0.5
  
  const { simplex2 } = shortcuts(utils)

  const fbm2 = (x, y) => {
    let sum = 0
    let amp = 1
    let freq = 1
    let norm = 0
    for (let i = 0; i < octaves; i++) {
      sum += simplex2(x * freq, y * freq) * amp
      norm += amp
      amp *= persistence
      freq *= lacunarity
    }
    return norm > 0 ? sum / norm : 0
  }

  // First pass: compute offsets + mean
  let sumDx = 0
  let sumDy = 0
  const offsets = Array.from({ length: grid.rows + 1 }, () =>
    Array.from({ length: grid.cols + 1 }, () => ({ dx: 0, dy: 0 }))
  )
  for (let r = 0; r <= grid.rows; r++) {
    for (let c = 0; c <= grid.cols; c++) {
      const p = grid.lattice[r][c]
      const nx = p.x * warpScale * warpScaleX
      const ny = p.y * warpScale * warpScaleY
      const dx = fbm2(nx + 100, ny + 100)
      const dy = fbm2(nx - 100, ny - 100)
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
      const p = grid.lattice[r][c]
      const { dx, dy } = offsets[r][c]
      let wx = 1
      let wy = 1

      if (pinEdges) {
        if (pinFalloff <= 0) {
          const dEdge = Math.min(c, r, grid.cols - c, grid.rows - r)
          wx = wy = dEdge === 0 ? 0 : 1
        } else {
          const dH = Math.min(c, grid.cols - c)
          const dV = Math.min(r, grid.rows - r)
          const tH = Math.max(0, Math.min(1, dH / pinFalloff))
          const tV = Math.max(0, Math.min(1, dV / pinFalloff))

          // cubic ease-out
          wx = 1 - (1 - tH) ** 3
          wy = 1 - (1 - tV) ** 3

          // cubic ease-in
          // wx = tH ** 3
          // wy = tV ** 3

          // power
          // wx = tH ** .5
          // wy = tV ** .5

          // smootherstep
          // wx = tH * tH * tH * (tH * (tH * 6 - 15) + 10)
          // wy = tV * tV * tV * (tV * (tV * 6 - 15) + 10)
        }
      }

      p.x += (dx - meanDx) * warpAmp * wx
      p.y += (dy - meanDy) * warpAmp * wy
    }
  }

  // CELL GEOMETRY
  grid.forEach((cell) => {
    const r = cell.row
    const c = cell.col
    const tl = grid.lattice[r][c]
    const tr = grid.lattice[r][c + 1]
    const br = grid.lattice[r + 1][c + 1]
    const bl = grid.lattice[r + 1][c]
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
    cell.draw(canvas)
  })

}