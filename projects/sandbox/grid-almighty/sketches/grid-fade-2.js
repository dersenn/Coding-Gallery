import { Grid, GridCell } from '~/types/project'
import { shortcuts } from '~/utils/shortcuts'
import { lightTheme } from '~/utils/theme'


class MyGrid extends Grid {
  createCell(config) {
    return new MyCell(config)
  }
}

class MyCell extends GridCell {
  constructor(config) {
    super(config)
  }

  draw(canvas, colors, maxLevel, spacing) {
    const { curve, rnd, rndInt, map, norm } = shortcuts(this.grid.utils)
    // const { cols } = this.contextSize()
    // const tx = cols > 1 ? this.col / (cols - 1) : 0

    const tx = (this.x - this.grid.x) / this.parent.width / 2 //grid or parent works
    const colBell = 1 - (Math.sin(Math.PI * tx * 2)) // 0..1, peaks at center col

    const k = map(colBell, 0, 1, 0.4, 6)
    const centerBell = (t, k = 1) => Math.pow(Math.sin(Math.PI * t), k)

    const positive = (this.row + this.col) % 2 === 0

    const density = positive 
      ? (nx, ny) => centerBell(ny, k)
      : (nx, ny) => 1 - centerBell(ny, k)

    console.log(this.grid)

    const fill = this.col % 2 === 0 && this.row % 2 === 0 ? colors[this.level] : colors[this.level + 1]
    // const fill = theme.palette[this.level]

    canvas.halftone(
      this.tl(),
      this.width, this.height,
      fill,
      density,
      { spacing, rng: rnd }
    )

  }
}

export function draw(context) {
  const { canvas, utils, controls: c } = context
  const { rndInt, pick, coin, pickMany } = shortcuts(utils)

  if (!canvas) return

  const cols = c.cols ?? pick([2, 4, 6])
  const rows = c.rows ?? pick([2, 4, 6])
  const maxLevel = c.maxLevel ?? 1

  const colors = pickMany(lightTheme.palette, maxLevel + 2)

  let spacing = c.spacing ?? 1
  spacing = canvas.pixelRatio < 2 ? spacing : spacing / 2
  
  const grid = new MyGrid({
    cols,
    rows,
    width: canvas.w,
    height: canvas.h,
    utils
  })

  const terminals = grid.subdivide({
    maxLevel,
    // condition: () => coin(50),
    rule: (cell, level) => {
      return { cols: (cell.row + 1) * 2, rows: 1 }
    }
  })

  canvas.background(lightTheme.background)

  terminals.forEach(cell => {
    cell.draw(canvas, colors, maxLevel, spacing)
  })

  // canvas.cellEdges(terminals, theme.annotation, 1, { strokeAlign: 'center', includeOuter: false })

}