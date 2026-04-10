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
    return(total * ns.amplitude + 1) / 2
  }

  normalizeNoise(min, max, amplitude) {
    const normalized = max > min ? (this.noise - min) / (max - min) : 0.5
    this.noise = Math.pow(normalized, 1 / amplitude)
  }

  assignColor(colors) {
    const i = Math.min(Math.floor(this.noise * colors.length), colors.length - 1)
    this.color = colors[i]
  }

  drawWeave(canvas, weave) {
    const { v, rnd, curve } = shortcuts(this.grid.utils)
    const colSize = this.width / weave.cols
    const rowSize = this.height / weave.rows
    const spacing = Math.max(1, Math.ceil(Math.min(colSize, rowSize) / 80))
    const margin = Math.max(0.04, Math.min(0.12, spacing / Math.min(colSize, rowSize)))

    for (let row = 0; row < weave.rows; row++) {
      for (let col = 0; col < weave.cols; col++) {
        const warpUp = weave.drawdown[row][col]
        const fill = warpUp
          ? weave.warpColors[col % weave.warpColors.length]
          : weave.weftColors[row % weave.weftColors.length]

        if (fill === 'transparent') continue

        canvas.halftone(
          v(this.x + col * colSize, this.y + row * rowSize),
          colSize, rowSize,
          fill,
          (nx) => 1 - curve.easeIn(nx),
          { spacing, rng: rnd }
        )
      }
    }
  }

  // drawWeave(canvas, weave) {
  //   const { v } = shortcuts(this.grid.utils)
  //   const colSize = this.width / weave.cols
  //   const rowSize = this.height / weave.rows

  //   for (let row = 0; row < weave.rows; row++) {
  //     for (let col = 0; col < weave.cols; col++) {
  //       const warpUp = weave.drawdown[row][col]
  //       const fill = warpUp
  //         ? weave.warpColors[col % weave.warpColors.length]
  //         : weave.weftColors[row % weave.weftColors.length]
  //       canvas.rect(
  //         v(this.x + col * colSize, this.y + row * rowSize),
  //         colSize,
  //         rowSize,
  //         fill,
  //         'transparent',
  //         0
  //       )
  //     }
  //   }
  // }

  draw(canvas, theme) {
    const { v, shuffle } = shortcuts(this.grid.utils)
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
          warpColors: [this.color, 'transparent'],
          weftColors: ['transparent', this.color],
        }))
        break
      case 1: {
        // this.drawWeave(canvas, buildWeave({
        //   threading: [1, 2],
        //   treadling: [1, 2],
        //   tieup: [
        //     [true, false],
        //     [false, true]
        //   ],
        //   warpColors: ['transparent', 'transparent'],
        //   weftColors: [this.color, this.color],
        // }))
        const { rnd } = shortcuts(this.grid.utils)
        const { curve } = shortcuts(this.grid.utils)
        canvas.halftone(
          this.tl(), this.width, this.height,
          this.color,
          (_, ny) => curve.easeIn(ny),// top → bottom
          { spacing: Math.max(1, Math.ceil(this.width / 80)), rng: rnd }
        )
        break
        }
      case 2:
        this.drawWeave(canvas, buildWeave({
          threading: [1, 2, 3, 4],
          treadling: [1, 2, 3, 4],
          tieup: [
            [true, true, true, false],
            [false, true, true, true],
            [true, false, true, true],
            [true, true, false, true],
          ],
          warpColors: [this.color],
          weftColors: ['transparent'],
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
          warpColors: ['transparent', this.color],
          weftColors: [this.color, 'transparent'],
        }))
        break
      // case 4:
      //   this.drawWeave(canvas, buildWeave({
      //     threading: [1, 1, 2, 2, 3, 3, 4, 4, 1, 1, 1, 2, 2, 3, 3, 4, 4, 1, 2, 3, 4],
      //     treadling: [1, 2, 3, 4, 1, 1, 2, 2, 3, 3, 4, 4, 1, 1, 1, 2, 2, 3, 3, 4, 4],
      //     tieup: [
      //       [false, false, true, true],
      //       [false, true, true, false],
      //       [true, true, false, false],
      //       [true, false, false, true],
      //     ],
      //     warpColors: ['transparent'],
      //     weftColors: [this.color],
      //   }))
      //   break
      case 5:
        this.drawWeave(canvas, buildWeave({
          threading: [1, 2, 3, 4, 1, 2, 3, 4],
          treadling: [1, 2, 3, 4, 1, 2, 3, 4],
          tieup: [
            [false, false, true, true],
            [false, true, true, false],
            [true, true, false, false],
            [true, false, false, true],
          ],
          warpColors: [
            'transparent', 'transparent', 'transparent', 'transparent',
            this.color, this.color, this.color, this.color,
          ],
          weftColors: [
            this.color, this.color, this.color, this.color,
            'transparent', 'transparent', 'transparent', 'transparent',
          ],
        }))
        break

      default:
        const { rnd } = shortcuts(this.grid.utils)
        const { curve } = shortcuts(this.grid.utils)
        canvas.halftone(
          this.tl(), this.width, this.height,
          this.color,
          (nx) => 1 - curve.easeIn(nx),
          { spacing: Math.max(1, Math.ceil(this.width / 80)), rng: rnd }
        )
        break
    }
  }
}


export function draw(context) {
  const { canvas, theme, utils, controls: c } = context
  const { v, map, simplex2, pick, rndInt, shuffle } = shortcuts(utils)

  if (!canvas) return

  const palette = c.shuffleColors ? shuffle(theme.palette) : theme.palette

  const grid = new MyGrid({ 
    cols: 1, 
    rows: rndInt(1, 4), 
    width: canvas.w, 
    height: canvas.h, 
    fit: 'contain',
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
      if (level === 0) return squareDivisions(cell.width, cell.height, 15)
      return false
    }
  })

  if (c.drawBackground) {
    canvas.background(theme.background)
  }

  terminals.forEach(cell => { cell.noise = cell.noiseSample(noiseSettings) })

  const min = Math.min(...terminals.map(cell => cell.noise))
  const max = Math.max(...terminals.map(cell => cell.noise))

  terminals.forEach(cell => {
    cell.normalizeNoise(min, max, noiseSettings.amplitude)
    cell.assignColor(palette)
    cell.draw(canvas, theme)
  })


  // canvas.cellEdges(terminals, theme.annotation, 1, { strokeAlign: 'center', includeOuter: false })



}