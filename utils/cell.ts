import type { Vec } from './generative'
import type { Grid } from './grid'

export type NeighborDirection = 
  | 'top' 
  | 'topRight' 
  | 'right' 
  | 'bottomRight' 
  | 'bottom' 
  | 'bottomLeft' 
  | 'left' 
  | 'topLeft'

export interface CellConfig {
  x: number
  y: number
  width: number
  height: number
  row?: number
  col?: number
  index?: number
  level?: number
  grid?: Grid
  parent?: Cell
}

/**
 * Cell - Base class for grid cells
 * 
 * Provides position, dimensions, grid coordinates, and neighbor access.
 * Can be extended by projects for custom cell behavior.
 * 
 * Usage:
 * ```typescript
 * const cell = new Cell({ x: 0, y: 0, width: 100, height: 100 })
 * const center = cell.center()
 * const neighbors = cell.getNeighbors4()
 * ```
 */
export class Cell {
  x: number
  y: number
  width: number
  height: number
  row: number
  col: number
  index: number
  level: number
  grid?: Grid
  parent?: Cell

  constructor(config: CellConfig) {
    this.x = config.x
    this.y = config.y
    this.width = config.width
    this.height = config.height
    this.row = config.row ?? -1
    this.col = config.col ?? -1
    this.index = config.index ?? -1
    this.level = config.level ?? 0
    this.grid = config.grid
    this.parent = config.parent
  }

  /**
   * Get the center point of the cell as a Vec
   */
  center(): Vec {
    if (!this.grid) {
      throw new Error('Cell must be attached to a grid to use center() method')
    }
    return this.grid.utils.vec.create(
      this.x + this.width / 2,
      this.y + this.height / 2
    )
  }

  /**
   * Check if a point is inside the cell
   */
  contains(x: number, y: number): boolean {
    return (
      x >= this.x &&
      x <= this.x + this.width &&
      y >= this.y &&
      y <= this.y + this.height
    )
  }

  /**
   * Get the distance between this cell's center and another cell's center
   */
  distance(other: Cell): number {
    if (!this.grid) {
      throw new Error('Cell must be attached to a grid to use distance() method')
    }
    const center1 = this.center()
    const center2 = other.center()
    return this.grid.utils.vec.dist(center1, center2)
  }

  /**
   * Check if this cell is on the edge of the grid
   */
  isEdge(): boolean {
    if (!this.grid) return false
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
    if (!this.grid) return false
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
  getNeighbor(direction: NeighborDirection): Cell | null {
    if (!this.grid) return null

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

    // Check bounds
    if (targetRow < 0 || targetRow >= rows || targetCol < 0 || targetCol >= cols) {
      return null
    }

    return this.grid.at(targetRow, targetCol)
  }

  /**
   * Get all 4 cardinal neighbors (top, right, bottom, left)
   */
  getNeighbors4(): Cell[] {
    const neighbors: Cell[] = []
    const directions: NeighborDirection[] = ['top', 'right', 'bottom', 'left']

    for (const direction of directions) {
      const neighbor = this.getNeighbor(direction)
      if (neighbor) {
        neighbors.push(neighbor)
      }
    }

    return neighbors
  }

  /**
   * Get all 8 neighbors (including diagonals)
   */
  getNeighbors(): Cell[] {
    const neighbors: Cell[] = []
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
      if (neighbor) {
        neighbors.push(neighbor)
      }
    }

    return neighbors
  }
}
