import { Vec } from './generative'
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
 * Cell — positioned drawing agent with its own local coordinate system.
 *
 * Works standalone (no grid required) or as a member of a Grid. Intended as a
 * base class for sketch-specific extensions: `class VeraCell extends Cell { ... }`.
 *
 * Provides: position/size, corner/center Vec helpers, neighbor access (when
 * grid-attached), and bounds checking.
 *
 * ```typescript
 * // Standalone — no grid needed
 * const tile = new Cell({ x: 50, y: 80, width: 100, height: 60 })
 * drawLine(tile.tl(), tile.br())
 *
 * // Sketch-specific extension
 * class ParticleCell extends Cell {
 *   velocity: Vec
 *   constructor(config: CellConfig & { velocity: Vec }) {
 *     super(config)
 *     this.velocity = config.velocity
 *   }
 * }
 *
 * // Grid-attached (neighbors, row/col, index available)
 * const grid = utils.grid.create({ cols: 10, rows: 10, width: 800, height: 800 })
 * grid.forEach(cell => cell.getNeighbors4())
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
    return new Vec(this.x + this.width / 2, this.y + this.height / 2)
  }

  /**
   * Top-left corner
   */
  tl(): Vec { return new Vec(this.x, this.y) }

  /**
   * Top-right corner
   */
  tr(): Vec { return new Vec(this.x + this.width, this.y) }

  /**
   * Bottom-left corner
   */
  bl(): Vec { return new Vec(this.x, this.y + this.height) }

  /**
   * Bottom-right corner
   */
  br(): Vec { return new Vec(this.x + this.width, this.y + this.height) }

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
   * Distance from this cell's center to another cell's center or a Vec point
   */
  distance(other: Cell | Vec): number {
    const c1 = this.center()
    const c2 = other instanceof Cell ? other.center() : other
    return Math.sqrt((c1.x - c2.x) ** 2 + (c1.y - c2.y) ** 2)
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
