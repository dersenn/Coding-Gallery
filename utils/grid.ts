import { Cell, type CellConfig } from './cell'
import type { GenerativeUtils } from './generative'

export type NeighborDirection = 
  | 'top' 
  | 'topRight' 
  | 'right' 
  | 'bottomRight' 
  | 'bottom' 
  | 'bottomLeft' 
  | 'left' 
  | 'topLeft'

export interface GridConfig {
  cols: number
  rows: number
  width: number
  height: number
  x?: number
  y?: number
  margin?: number
  cellSizing?: GridCellSizing
  fit?: GridFit
  alignX?: GridAlign
  alignY?: GridAlign
  shortSideDivisions?: number
  utils: GenerativeUtils
}

export type GridCellSizing = 'stretch' | 'squareByCount' | 'squareByShortSide'
export type GridFit = 'contain' | 'cover' | 'stretch'
export type GridAlign = 'start' | 'center' | 'end'

export interface SubdivideConfig {
  maxLevel: number
  chance?: number
  subdivisionCols?: number
  subdivisionRows?: number
  condition?: (cell: Cell, level: number) => boolean
}

export interface GridCellConfig extends CellConfig {
  grid: Grid
}

/**
 * GridCell — a Cell created and owned by a Grid.
 *
 * Extends `Cell` with a required `grid` reference and grid-specific methods:
 * edge/corner detection and neighbor lookup in all 8 directions.
 *
 * GridCell instances are created by `Grid` via its protected `createCell()`
 * factory method. To use a custom subclass, subclass `Grid` and override
 * `createCell()` — do NOT instantiate the subclass directly and expect `Grid`
 * to use it:
 *
 * ```typescript
 * class MyCell extends GridCell {
 *   draw(svg: SVG) { /* ... *‌/ }
 * }
 *
 * class MyGrid extends Grid {
 *   protected createCell(config: GridCellConfig): GridCell {
 *     return new MyCell(config)
 *   }
 * }
 *
 * const grid = new MyGrid({ cols: 3, rows: 3, ... })
 * grid.cells.forEach(cell => (cell as MyCell).draw(svg))
 * ```
 *
 * For standalone sketch use without a grid, extend `Cell` directly instead.
 */
export class GridCell extends Cell {
  grid: Grid

  constructor(config: GridCellConfig) {
    super(config)
    this.grid = config.grid
  }

  /**
   * Check if this cell is on the edge of the grid
   */
  isEdge(): boolean {
    return (
      this.row === 0 ||
      this.row === this.grid.rows - 1 ||
      this.col === 0 ||
      this.col === this.grid.cols - 1
    )
  }

  /**
   * Check if this cell is a corner cell
   */
  isCorner(): boolean {
    return (
      (this.row === 0 && this.col === 0) ||
      (this.row === 0 && this.col === this.grid.cols - 1) ||
      (this.row === this.grid.rows - 1 && this.col === 0) ||
      (this.row === this.grid.rows - 1 && this.col === this.grid.cols - 1)
    )
  }

  /**
   * Get a specific neighbor by direction
   */
  getNeighbor(direction: NeighborDirection): GridCell | null {
    const { row, col } = this
    const { rows, cols } = this.grid

    let targetRow = row
    let targetCol = col

    switch (direction) {
      case 'top':
        targetRow = row - 1
        break
      case 'topRight':
        targetRow = row - 1
        targetCol = col + 1
        break
      case 'right':
        targetCol = col + 1
        break
      case 'bottomRight':
        targetRow = row + 1
        targetCol = col + 1
        break
      case 'bottom':
        targetRow = row + 1
        break
      case 'bottomLeft':
        targetRow = row + 1
        targetCol = col - 1
        break
      case 'left':
        targetCol = col - 1
        break
      case 'topLeft':
        targetRow = row - 1
        targetCol = col - 1
        break
    }

    if (targetRow < 0 || targetRow >= rows || targetCol < 0 || targetCol >= cols) {
      return null
    }

    return this.grid.at(targetRow, targetCol)
  }

  /**
   * Get all 4 cardinal neighbors (top, right, bottom, left)
   */
  getNeighbors4(): GridCell[] {
    const neighbors: GridCell[] = []
    const directions: NeighborDirection[] = ['top', 'right', 'bottom', 'left']

    for (const direction of directions) {
      const neighbor = this.getNeighbor(direction)
      if (neighbor) neighbors.push(neighbor)
    }

    return neighbors
  }

  /**
   * Get all 8 neighbors (including diagonals)
   */
  getNeighbors(): GridCell[] {
    const neighbors: GridCell[] = []
    const directions: NeighborDirection[] = [
      'top',
      'topRight',
      'right',
      'bottomRight',
      'bottom',
      'bottomLeft',
      'left',
      'topLeft'
    ]

    for (const direction of directions) {
      const neighbor = this.getNeighbor(direction)
      if (neighbor) neighbors.push(neighbor)
    }

    return neighbors
  }

  /**
   * Euclidean distance in grid-coordinate space (col/row steps).
   *
   * Mirrors `Cell.distance()` but operates on col/row indices rather than
   * pixel x/y positions. Accepts another GridCell or a plain `{ col, row }`
   * point — useful when the target is a fractional grid coordinate (e.g. the
   * center of an even-sized grid).
   *
   * ```typescript
   * const distToCenter = cell.gridDistance({ col: (cols - 1) / 2, row: (rows - 1) / 2 })
   * ```
   */
  gridDistance(other: GridCell | { col: number; row: number }): number {
    const dc = this.col - other.col
    const dr = this.row - other.row
    return Math.sqrt(dc * dc + dr * dr)
  }
}

/**
 * Grid - Base class for creating uniform and subdivided grids
 * 
 * Provides 2D and 1D cell access, neighbor lookup, iteration methods,
 * and recursive subdivision support.
 * 
 * Usage:
 * ```typescript
 * const grid = new Grid({ cols: 10, rows: 10, width: 500, height: 500, utils })
 * 
 * // Access cells
 * const cell = grid.at(5, 5)
 * const cellByIndex = grid.cellAt(55)
 * 
 * // Iterate
 * grid.forEach((cell, row, col) => { ... })
 * 
 * // Subdivide recursively
 * const subdividedCells = grid.subdivide({ maxLevel: 3, chance: 50 })
 * ```
 */
export class Grid {
  cols: number
  rows: number
  width: number
  height: number
  x: number
  y: number
  margin: number
  cellSizing: GridCellSizing
  fit: GridFit
  alignX: GridAlign
  alignY: GridAlign
  shortSideDivisions: number | null
  utils: GenerativeUtils
  
  cells: GridCell[] = []
  private grid2D: GridCell[][] = []

  constructor(config: GridConfig) {
    this.cols = Math.max(1, Math.floor(config.cols))
    this.rows = Math.max(1, Math.floor(config.rows))
    this.width = config.width
    this.height = config.height
    this.x = config.x ?? 0
    this.y = config.y ?? 0
    this.margin = config.margin ?? 0
    this.cellSizing = config.cellSizing ?? 'stretch'
    this.fit = config.fit ?? (this.cellSizing === 'stretch' ? 'stretch' : 'contain')
    this.alignX = config.alignX ?? 'center'
    this.alignY = config.alignY ?? 'center'
    this.shortSideDivisions =
      typeof config.shortSideDivisions === 'number'
        ? Math.max(1, Math.floor(config.shortSideDivisions))
        : null
    this.utils = config.utils

    this.initializeCells()
  }

  /**
   * Factory method for primary grid cells.
   *
   * Override in a `Grid` subclass to produce custom `GridCell` instances.
   * This method is called once per cell during construction — the returned
   * instance is what appears in `grid.cells`, `grid.at()`, `grid.forEach()`, etc.
   *
   * ```typescript
   * class MyGrid extends Grid {
   *   protected createCell(config: GridCellConfig): GridCell {
   *     return new MyCell(config)
   *   }
   * }
   * ```
   */
  protected createCell(config: GridCellConfig): GridCell {
    return new GridCell(config)
  }

  /**
   * Factory method for subdivision leaf cells.
   *
   * Override alongside `createCell` when you also need custom types from
   * `grid.subdivide()`. Leaf cells have `row/col/index = -1` since they are
   * positional only and not part of the primary grid topology.
   *
   * ```typescript
   * class MyGrid extends Grid {
   *   protected createLeafCell(config: CellConfig): Cell {
   *     return new MyLeafCell(config)
   *   }
   * }
   * ```
   */
  protected createLeafCell(config: CellConfig): Cell {
    return new Cell(config)
  }

  /**
   * Initialize the grid cells via the `createCell` factory.
   * Called once from the constructor — override `createCell` to inject
   * custom cell types rather than overriding this method.
   */
  private initializeCells(): void {
    const layout = this.resolveLayout()
    const { cols, rows, cellWidth, cellHeight, originX, originY } = layout
    this.cols = cols
    this.rows = rows

    this.cells = []
    this.grid2D = []

    for (let row = 0; row < this.rows; row++) {
      const rowCells: GridCell[] = []
      
      for (let col = 0; col < this.cols; col++) {
        const x = originX + col * cellWidth
        const y = originY + row * cellHeight
        const index = row * this.cols + col

        const cell = this.createCell({
          x,
          y,
          width: cellWidth,
          height: cellHeight,
          row,
          col,
          index,
          level: 0,
          grid: this
        })

        this.cells.push(cell)
        rowCells.push(cell)
      }

      this.grid2D.push(rowCells)
    }
  }

  private resolveLayout(): {
    cols: number
    rows: number
    cellWidth: number
    cellHeight: number
    originX: number
    originY: number
  } {
    const gridWidth = Math.max(0, this.width - this.margin * 2)
    const gridHeight = Math.max(0, this.height - this.margin * 2)
    const baseX = this.x + this.margin
    const baseY = this.y + this.margin

    let cols = Math.max(1, Math.floor(this.cols))
    let rows = Math.max(1, Math.floor(this.rows))

    if (this.cellSizing === 'squareByShortSide') {
      const divisions = this.shortSideDivisions ?? Math.min(cols, rows)
      if (gridWidth <= gridHeight) {
        const shortSideCell = divisions > 0 ? gridWidth / divisions : 0
        cols = Math.max(1, divisions)
        rows = this.resolveCountForTargetCell(gridHeight, shortSideCell, this.fit)
      } else {
        const shortSideCell = divisions > 0 ? gridHeight / divisions : 0
        rows = Math.max(1, divisions)
        cols = this.resolveCountForTargetCell(gridWidth, shortSideCell, this.fit)
      }
    }

    const useStretch = this.cellSizing === 'stretch' || this.fit === 'stretch'
    if (useStretch) {
      return {
        cols,
        rows,
        cellWidth: cols > 0 ? gridWidth / cols : 0,
        cellHeight: rows > 0 ? gridHeight / rows : 0,
        originX: baseX,
        originY: baseY
      }
    }

    const sizeByWidth = cols > 0 ? gridWidth / cols : 0
    const sizeByHeight = rows > 0 ? gridHeight / rows : 0
    const side = this.fit === 'cover'
      ? Math.max(sizeByWidth, sizeByHeight)
      : Math.min(sizeByWidth, sizeByHeight)

    const usedWidth = side * cols
    const usedHeight = side * rows
    const remainingX = gridWidth - usedWidth
    const remainingY = gridHeight - usedHeight

    return {
      cols,
      rows,
      cellWidth: side,
      cellHeight: side,
      originX: baseX + this.resolveAlignOffset(remainingX, this.alignX),
      originY: baseY + this.resolveAlignOffset(remainingY, this.alignY)
    }
  }

  private resolveCountForTargetCell(total: number, targetCell: number, fit: GridFit): number {
    if (!Number.isFinite(targetCell) || targetCell <= 0) {
      return 1
    }

    const raw = total / targetCell
    if (!Number.isFinite(raw) || raw <= 1) return 1

    if (fit === 'cover') {
      return Math.max(1, Math.ceil(raw))
    }
    if (fit === 'stretch') {
      return Math.max(1, Math.round(raw))
    }
    return Math.max(1, Math.floor(raw))
  }

  private resolveAlignOffset(remaining: number, align: GridAlign): number {
    if (align === 'start') return 0
    if (align === 'end') return remaining
    return remaining / 2
  }

  /**
   * Get a cell by row and column (2D access)
   */
  at(row: number, col: number): GridCell | null {
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) {
      return null
    }
    return this.grid2D[row]![col]!
  }

  /**
   * Get a cell by 1D index
   */
  cellAt(index: number): GridCell | null {
    if (index < 0 || index >= this.cells.length) {
      return null
    }
    return this.cells[index]!
  }

  /**
   * Convert 1D index to row/col coordinates
   */
  indexToRowCol(index: number): { row: number; col: number } {
    const row = Math.floor(index / this.cols)
    const col = index % this.cols
    return { row, col }
  }

  /**
   * Convert row/col coordinates to 1D index
   */
  rowColToIndex(row: number, col: number): number {
    return row * this.cols + col
  }

  /**
   * Iterate over all cells
   */
  forEach(callback: (cell: GridCell, row: number, col: number) => void): void {
    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const cell = this.grid2D[row]![col]!
        callback(cell, row, col)
      }
    }
  }

  /**
   * Map over all cells and return a new array
   */
  map<T>(callback: (cell: GridCell, row: number, col: number) => T): T[] {
    const results: T[] = []
    this.forEach((cell, row, col) => {
      results.push(callback(cell, row, col))
    })
    return results
  }

  /**
   * Filter cells based on a condition
   */
  filter(callback: (cell: GridCell) => boolean): GridCell[] {
    return this.cells.filter(callback)
  }

  /**
   * Recursively subdivide the grid
   * 
   * Returns a flat array of plain `Cell` instances with varying sizes based on
   * subdivision. Each cell has a `level` property indicating its subdivision
   * depth. Subdivision cells are positional only (row/col/index = -1); for
   * grid-indexed neighbor access use the primary `Grid.cells` array instead.
   * 
   * @param config - Subdivision configuration
   * @param config.maxLevel - Maximum recursion depth
   * @param config.chance - Percentage chance (0-100) to stop subdividing and create leaf cell
   * @param config.subdivisionCols - Number of columns for subdivision (defaults to grid cols)
   * @param config.subdivisionRows - Number of rows for subdivision (defaults to grid rows)
   * @param config.condition - Alternative to chance: custom function to determine if subdivision should stop
   */
  subdivide(config: SubdivideConfig): Cell[] {
    const {
      maxLevel,
      chance = 50,
      subdivisionCols = this.cols,
      subdivisionRows = this.rows,
      condition
    } = config

    const resultCells: Cell[] = []

    this.forEach((cell) => {
      this.subdivideRecursive(
        cell,
        0,
        maxLevel,
        chance,
        subdivisionCols,
        subdivisionRows,
        resultCells,
        condition
      )
    })

    return resultCells
  }

  /**
   * Recursive helper for subdivision — uses `createLeafCell` factory for all
   * leaf and intermediate cell instances.
   */
  private subdivideRecursive(
    parentCell: Cell,
    currentLevel: number,
    maxLevel: number,
    chance: number,
    subdivisionCols: number,
    subdivisionRows: number,
    resultCells: Cell[],
    condition?: (cell: Cell, level: number) => boolean
  ): void {
    const cellW = parentCell.width / subdivisionCols
    const cellH = parentCell.height / subdivisionRows

    for (let col = 0; col < subdivisionCols; col++) {
      for (let row = 0; row < subdivisionRows; row++) {
        const x = parentCell.x + col * cellW
        const y = parentCell.y + row * cellH

        if (currentLevel < maxLevel) {
          const shouldStopSubdividing = condition
            ? condition(parentCell, currentLevel)
            : this.utils.seed.coinToss(chance)

          if (shouldStopSubdividing) {
            resultCells.push(
              this.createLeafCell({
                x,
                y,
                width: cellW,
                height: cellH,
                row: -1,
                col: -1,
                index: -1,
                level: currentLevel + 1,
                parent: parentCell
              })
            )
          } else {
            const childCell = this.createLeafCell({
              x,
              y,
              width: cellW,
              height: cellH,
              row: -1,
              col: -1,
              index: -1,
              level: currentLevel + 1,
              parent: parentCell
            })

            this.subdivideRecursive(
              childCell,
              currentLevel + 1,
              maxLevel,
              chance,
              subdivisionCols,
              subdivisionRows,
              resultCells,
              condition
            )
          }
        } else {
          resultCells.push(
            this.createLeafCell({
              x,
              y,
              width: cellW,
              height: cellH,
              row: -1,
              col: -1,
              index: -1,
              level: currentLevel + 1,
              parent: parentCell
            })
          )
        }
      }
    }
  }

  /**
   * Get all cells on the edge of the grid
   */
  getEdgeCells(): GridCell[] {
    return this.filter(cell => cell.isEdge())
  }

  /**
   * Get all corner cells
   */
  getCornerCells(): GridCell[] {
    return this.filter(cell => cell.isCorner())
  }

  /**
   * Get a random cell from the grid
   */
  randomCell(): GridCell {
    const index = this.utils.seed.randomInt(0, this.cells.length - 1)
    return this.cells[index]!
  }
}
