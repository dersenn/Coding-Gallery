import { Grid, GridCell } from '~/types/project'
import { shortcuts } from '~/utils/shortcuts'



function squareDivisions(width, height, divisions) {
  if (width <= height) {
    const cellSize = width / divisions
    return { cols: divisions, rows: Math.max(1, Math.floor(height / cellSize)) }
  } else {
    const cellSize = height / divisions
    return { cols: Math.max(1, Math.floor(width / cellSize)), rows: divisions }
  }
}



class MyGrid extends Grid {
  createCell(config) {
    return new MyCell(config)
  }
}

class MyCell extends GridCell {
  constructor(config) {
    super(config)
    this.noise = 0
    this.sampleSize = 0
    this.color = ''
  }

  noiseSample(ns) {
    const { simplex2 } = shortcuts(this.grid.utils)
    const cx = this.x + this.width / 2
    const cy = this.y + this.height / 2
    const rootCell = this.parent ?? this
    const offsetX = rootCell.index * ns.offset
    const offsetY = rootCell.index * ns.offset

    this.sampleSize = this.width * ns.sampleMultiplier

    // snap to coarser sample grid
    const sx = this.sampleSize > 0 ? Math.floor((cx + offsetX) / this.sampleSize) * this.sampleSize : cx + offsetX
    const sy = this.sampleSize > 0 ? Math.floor((cy + offsetY) / this.sampleSize) * this.sampleSize : cy + offsetY

    let total = 0
    let frequency = ns.scale
    let amplitude = 1
    for (let i = 0; i < ns.octaves; i++) {
      total += simplex2(sx * frequency * ns.stretchX, sy * frequency * ns.stretchY) * amplitude
      frequency *= ns.lacunarity
      amplitude *= ns.persistence
    }
    return Math.max(0, Math.min(1, ((total * ns.amplitude) + 1) / 2))
  }

  assignColor(colors) {
    const i = Math.min(Math.floor(this.noise * colors.length), colors.length - 1)
    this.color = colors[i]
  }

  draw(canvas, theme) {
    const r = this.width / 2
    const bucket = Math.min(Math.floor(this.noise * theme.palette.length), theme.palette.length - 1)

    switch (bucket) {
      case 0:
        canvas.circle(this.center(), r, this.color, 'transparent', 0)
        break
      case 1:
        canvas.circle(this.center(), r * 0.5, this.color, 'transparent', 0)
        break
      case 2:
        canvas.rect(this.tl(), this.width / 2, this.height, theme.white, 'transparent', 0)
        canvas.rect(new Vec(this.center().x, this.center().y - this.height / 2), this.width / 2, this.height, this.color, 'transparent', 0)
        break
      case 3:
        const height = this.height / 3
        canvas.rect(this.tl(), height, height, this.color, 'transparent', 0)
        canvas.rect({ x: this.tl().x + 2 * height, y: this.tl().y }, height, height, this.color, 'transparent', 0)
        canvas.rect({ x: this.tl().x + height, y: this.tl().y + height }, 2 * height, height, this.color, 'transparent', 0)
        canvas.rect({ x: this.tl().x, y: this.tl().y + 2 * height }, 2 * height, height, this.color, 'transparent', 0)
        break
      case 4:
        canvas.rect(this.tl(), this.width, this.height / 2, this.color, 'transparent', 0)
        canvas.rect(new Vec(this.center().x, this.center().y - this.height / 2), this.width / 2, this.height, this.color, 'transparent', 0)
        break
      default:
        canvas.rect(this.tl(), this.width, this.height, this.color, 'transparent', 0)
    }
  }
}







export function draw(context) {
  const { canvas, theme, utils, controls: c } = context
  const { v, map, simplex2, pick, rndInt } = shortcuts(utils)

  if (!canvas) return

  const palette = theme.palette

  const grid = new MyGrid({ 
    cols: 1, 
    rows: rndInt(2, 6), 
    width: 
    canvas.w, 
    height: 
    canvas.h, 
    utils 
  })

  const noiseSettings = {
    sampleMultiplier: c.sampleMultiplier,
    scale: c.scale,
    offset: c.offset,
    stretchX: c.stretchX,
    stretchY: c.stretchY,
    amplitude: c.amplitude,
    octaves: c.octaves,
    lacunarity: c.lacunarity,
    persistence: c.persistence,
  }

  const terminals = grid.subdivide({
    maxLevel: 1,
    rule: (cell, level) => {
      if (level === 0) return squareDivisions(cell.width, cell.height, 20)
      return false
    }
  })

  terminals.forEach(cell => {
    cell.noise = cell.noiseSample(noiseSettings)
    cell.assignColor(palette)
    cell.draw(canvas, theme, palette)
  })


  canvas.cellEdges(terminals, theme.annotation, 1, { strokeAlign: 'center', includeOuter: false })



}