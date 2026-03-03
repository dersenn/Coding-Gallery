import { Vec } from './generative'

export interface CellConfig {
  x: number
  y: number
  width: number
  height: number
  row?: number
  col?: number
  index?: number
  level?: number
  parent?: Cell
}

/**
 * Cell — positioned drawing agent with its own local coordinate system.
 *
 * Works standalone (no grid required). Intended as a base class for
 * sketch-specific extensions: `class VeraCell extends Cell { ... }`.
 *
 * For grid-attached cells with neighbor access, see `GridCell` in `utils/grid.ts`.
 *
 * Provides: position/size, corner/center Vec helpers, and bounds checking.
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
}
