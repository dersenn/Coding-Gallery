import { Grid, GridCell } from '~/types/project'
import { shortcuts } from '~/utils/shortcuts'
import { lightTheme } from '~/utils/theme'

export const controls = [
  { type: 'slider', key: 'cols', label: 'Cols', default: 80, min: 2, max: 240, step: 1 },
  { type: 'slider', key: 'rows', label: 'Rows', default: 120, min: 2, max: 360, step: 1 },
  { type: 'slider', key: 'warpAmpMm', label: 'Warp amp (mm)', default: 20, min: 0, max: 80, step: 1 },
  { type: 'slider', key: 'warpScale', label: 'Warp scale', default: 0.003, min: 0.0002, max: 0.02, step: 0.0001 },
  { type: 'slider', key: 'warpScaleX', label: 'Warp scale X', default: 1, min: 0.2, max: 5, step: 0.05 },
  { type: 'slider', key: 'warpScaleY', label: 'Warp scale Y', default: 1, min: 0.2, max: 5, step: 0.05 },
  { type: 'slider', key: 'octaves', label: 'Octaves', default: 1, min: 1, max: 6, step: 1 },
  { type: 'slider', key: 'lacunarity', label: 'Lacunarity', default: 2.0, min: 1.2, max: 4.0, step: 0.1 },
  { type: 'slider', key: 'persistence', label: 'Persistence', default: 0.5, min: 0.1, max: 0.95, step: 0.05 },
  { type: 'toggle', key: 'pinEdges', label: 'Pin edges', default: false },
  { type: 'slider', key: 'pinFalloff', label: 'Pin falloff', default: 20, min: 0, max: 80, step: 1 },
]


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
  const { v } = shortcuts(utils)
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
  const origin = grid.at(0, 0).tl()
  const cellW = grid.at(0, 0).width
  const cellH = grid.at(0, 0).height
  const lattice = Array.from({ length: grid.rows + 1 }, (_, r) =>
    Array.from({ length: grid.cols + 1 }, (_, c) =>
      v(origin.x + c * cellW, origin.y + r * cellH)
    )
  )

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
      const p = lattice[r][c]
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
      const p = lattice[r][c]
      const { dx, dy } = offsets[r][c]
      let w = 1
      if (pinEdges) {
        const dEdge = Math.min(c, r, grid.cols - c, grid.rows - r) // 0 at edge
        if (pinFalloff <= 0) {
          w = dEdge === 0 ? 0 : 1
        } else {
          w = Math.max(0, Math.min(1, dEdge / pinFalloff))
        }
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
    cell.draw(canvas, color)
  })

}