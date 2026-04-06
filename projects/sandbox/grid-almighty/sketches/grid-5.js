import { Grid, GridCell } from '~/types/project'
import { shortcuts } from '~/utils/shortcuts'
import { buildWeave, renderWeave } from '~/utils/weave'





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

  drawWeave(canvas, weave) {
    const cellSize = this.width / weave.cols
    const ctx = canvas.ctx
    const ox = Math.round(this.x)
    const oy = Math.round(this.y)

    for (let row = 0; row < weave.rows; row++) {
      for (let col = 0; col < weave.cols; col++) {
        const x0 = Math.round(ox + col * cellSize)
        const x1 = Math.round(ox + (col + 1) * cellSize)
        const y0 = Math.round(oy + row * cellSize)
        const y1 = Math.round(oy + (row + 1) * cellSize)
        const warpUp = weave.drawdown[row][col]
        ctx.fillStyle = warpUp
          ? weave.warpColors[col % weave.warpColors.length]
          : weave.weftColors[row % weave.weftColors.length]
        ctx.fillRect(x0, y0, x1 - x0, y1 - y0)
      }
    }
  }


  draw(canvas, theme) {
    const { v } = shortcuts(this.grid.utils)
    const r = this.width / 2
    const bucket = Math.min(Math.floor(this.noise * theme.palette.length), theme.palette.length - 1)

    switch (bucket) {
      case 0:
        this.drawWeave(canvas, buildWeave({
          threading: [1, 2, 3, 4],
          treadling: [1, 2, 3, 4],
          tieup: [
            [true, false, false, false],
            [false, true, false, false],
            [false, false, true, false],
            [false, false, false, true],
          ],
          warpColors: [this.color, theme.white],
          weftColors: [theme.white, this.color],
        }))
        break
      case 1:
        this.drawWeave(canvas, buildWeave({
          threading: [1, 2],
          treadling: [1, 2],
          tieup: [
            [true, false],
            [false, true]
          ],
          warpColors: [theme.white, theme.white],
          weftColors: [this.color, this.color],
        }))
        break
      case 2:
        this.drawWeave(canvas, buildWeave({
          threading: [1, 2, 3, 4],
          treadling: [1, 2, 3, 4],
          tieup: [
            [true, true, false, false],
            [false, true, true, false],
            [false, false, true, true],
            [true, false, false, true]
          ],
          warpColors: [this.color, theme.white],
          weftColors: [theme.white, this.color],
        }))
        break
      case 3:
        this.drawWeave(canvas, buildWeave({
          threading: [1, 2, 1, 2],
          treadling: [1, 2, 1, 2],
          tieup: [
            [true, false],
            [false, true]
          ],
          warpColors: [theme.white, this.color],
          weftColors: [this.color, theme.white],
        }))
        break
      case 4:
        this.drawWeave(canvas, buildWeave({
          threading: [1, 2, 3, 4],
          treadling: [1, 2, 3, 4],
          tieup: [
            [true, false, false, false],
            [false, false, false, true],
            [false, false, true, false],
            [false, true, false, false]
          ],
          warpColors: [this.color, theme.white],
          weftColors: [theme.white, this.color],
        }))
        break

      default:
        canvas.rect(this.tl(), this.width, this.height, theme.black, 'transparent', 0)
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
    rows: rndInt(1, 4), 
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


  // canvas.cellEdges(terminals, theme.annotation, 1, { strokeAlign: 'center', includeOuter: false })



}