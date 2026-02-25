import { Cell } from './cell'
import type { GenerativeUtils } from './generative'

export interface GridConfig {
  cols: number
  rows: number
  width: number
  height: number
  x?: number
  y?: number
  margin?: number
  utils: GenerativeUtils
}

export interface SubdivideConfig {
  maxLevel: number
  chance?: number
  subdivisionCols?: number
  subdivisionRows?: number
  condition?: (cell: Cell, level: number) => boolean
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
  utils: GenerativeUtils
  
  cells: Cell[] = []
  private grid2D: Cell[][] = []

  constructor(config: GridConfig) {
    this.cols = config.cols
    this.rows = config.rows
    this.width = config.width
    this.height = config.height
    this.x = config.x ?? 0
    this.y = config.y ?? 0
    this.margin = config.margin ?? 0
    this.utils = config.utils

    this.initializeCells()
  }

  /**
   * Initialize the grid with uniform cells
   */
  private initializeCells(): void {
    const gridWidth = this.width - this.margin * 2
    const gridHeight = this.height - this.margin * 2
    const cellWidth = gridWidth / this.cols
    const cellHeight = gridHeight / this.rows

    this.cells = []
    this.grid2D = []

    for (let row = 0; row < this.rows; row++) {
      const rowCells: Cell[] = []
      
      for (let col = 0; col < this.cols; col++) {
        const x = this.x + this.margin + col * cellWidth
        const y = this.y + this.margin + row * cellHeight
        const index = row * this.cols + col

        const cell = new Cell({
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

  /**
   * Get a cell by row and column (2D access)
   */
  at(row: number, col: number): Cell | null {
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) {
      return null
    }
    return this.grid2D[row]![col]!
  }

  /**
   * Get a cell by 1D index
   */
  cellAt(index: number): Cell | null {
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
  forEach(callback: (cell: Cell, row: number, col: number) => void): void {
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
  map<T>(callback: (cell: Cell, row: number, col: number) => T): T[] {
    const results: T[] = []
    this.forEach((cell, row, col) => {
      results.push(callback(cell, row, col))
    })
    return results
  }

  /**
   * Filter cells based on a condition
   */
  filter(callback: (cell: Cell) => boolean): Cell[] {
    return this.cells.filter(callback)
  }

  /**
   * Recursively subdivide the grid
   * 
   * Returns a flat array of cells with varying sizes based on subdivision.
   * Each cell has a `level` property indicating its subdivision depth.
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

    // Start subdivision from each root cell
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
   * Recursive helper for subdivision
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
          // Determine whether to stop subdividing or continue
          const shouldStopSubdividing = condition
            ? condition(parentCell, currentLevel)
            : this.utils.seed.coinToss(chance)

          if (shouldStopSubdividing) {
            // Create leaf cell
            resultCells.push(
              new Cell({
                x,
                y,
                width: cellW,
                height: cellH,
                row: -1,
                col: -1,
                index: -1,
                level: currentLevel + 1,
                grid: this,
                parent: parentCell
              })
            )
          } else {
            // Subdivide further
            const childCell = new Cell({
              x,
              y,
              width: cellW,
              height: cellH,
              row: -1,
              col: -1,
              index: -1,
              level: currentLevel + 1,
              grid: this,
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
          // Max level reached, create leaf cell
          resultCells.push(
            new Cell({
              x,
              y,
              width: cellW,
              height: cellH,
              row: -1,
              col: -1,
              index: -1,
              level: currentLevel + 1,
              grid: this,
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
  getEdgeCells(): Cell[] {
    return this.filter(cell => cell.isEdge())
  }

  /**
   * Get all corner cells
   */
  getCornerCells(): Cell[] {
    return this.filter(cell => cell.isCorner())
  }

  /**
   * Get a random cell from the grid
   */
  randomCell(): Cell {
    const index = this.utils.seed.randomInt(0, this.cells.length - 1)
    return this.cells[index]!
  }
}
