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
    top: mm(9),
    right: mm(9),
    bottom: mm(15),
    left: mm(9),
  }

  const color = lightTheme.foreground

  // GRID
  const grid = new MyGrid({
    cols: 40,
    rows: 60,
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

  // WARPING NOISE
  const warpAmp = mm(20) // tweak
  const warpScale = 0.001 // tweak (noise frequency)
  const { noise2 } = shortcuts(utils)
  for (let r = 0; r <= grid.rows; r++) {
    for (let c = 0; c <= grid.cols; c++) {
      const p = lattice[r][c]
      const nx = p.x * warpScale
      const ny = p.y * warpScale
      // two decorrelated noise samples for x/y offsets
      const dx = noise2(nx + 100, ny + 100)
      const dy = noise2(nx - 100, ny - 100)
      p.x += dx * warpAmp
      p.y += dy * warpAmp
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
  grid.forEach(cell => cell.draw(canvas, lightTheme.foreground))

}