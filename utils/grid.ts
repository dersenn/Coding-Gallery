import { Cell } from './cell'
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

/** Which sides of a rectangular row/col context this cell touches. */
export interface GridCellEdgeFlags {
  top: boolean
  right: boolean
  bottom: boolean
  left: boolean
}

/** Corner occupancy derived only from `GridCellEdgeFlags` (adjacent side pairs). */
export interface GridCellCornerFlags {
  tl: boolean
  tr: boolean
  br: boolean
  bl: boolean
}

function edgeFlagsFromIndices(
  row: number,
  col: number,
  rows: number,
  cols: number
): GridCellEdgeFlags {
  return {
    top: row === 0,
    right: col === cols - 1,
    bottom: row === rows - 1,
    left: col === 0
  }
}

function cornerFlagsFromEdges(edges: GridCellEdgeFlags): GridCellCornerFlags {
  return {
    tl: edges.top && edges.left,
    tr: edges.top && edges.right,
    br: edges.bottom && edges.right,
    bl: edges.bottom && edges.left
  }
}

function anyEdge(edges: GridCellEdgeFlags): boolean {
  return edges.top || edges.right || edges.bottom || edges.left
}

function anyCorner(corners: GridCellCornerFlags): boolean {
  return corners.tl || corners.tr || corners.br || corners.bl
}

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
  /** Maximum recursive depth below each root cell. */
  maxLevel: number
  /** Chance (0-100) to subdivide a visited node (when no custom condition is provided). */
  chance?: number
  /** Number of columns created for each recursive split. */
  subdivisionCols?: number
  /** Number of rows created for each recursive split. */
  subdivisionRows?: number
  /** Optional custom subdivide condition; receives the current node and level. */
  condition?: (cell: GridCell, level: number) => boolean
  /**
   * Optional per-node subdivision rule.
   *
   * When provided, this takes precedence over `chance`, `condition`, and
   * `subdivisionCols/subdivisionRows`.
   *
   * Return `false` to stop (keep the current node as a terminal).
   * Return `{ cols, rows }` to subdivide this node using those dimensions.
   */
  rule?: (cell: GridCell, level: number) => false | { cols: number; rows: number }
}

interface GridNeighborContext {
  cols: number
  rows: number
  at: (row: number, col: number) => GridCell | null
}

export interface GridCellConfig extends CellConfig {
  grid: Grid
  neighborContext?: GridNeighborContext
}

/**
 * GridCell — hierarchical cell node created by `Grid`.
 *
 * Extends `Cell` with:
 * - a required root-grid reference (`grid`)
 * - context-aware neighbor and edge/corner methods
 * - parent/level hierarchy traversal helpers
 *
 * Construction model:
 * - Root grid initialization (`initializeCells`) creates level-0 nodes.
 * - Recursive subdivision (`subdivide`) creates deeper nodes.
 * - Both paths use `Grid.createCell()`, so custom subclasses apply uniformly.
 *
 * Context model:
 * - Default APIs (`getNeighbor`, `getNeighbors*`, `isEdge`, `isCorner`,
 *   `edgeFlags`, `cornerFlags`) operate in the cell's active context:
 *   - root cells => root grid context
 *   - recursive cells => sibling-local subdivision context
 * - Root-explicit APIs (`getRootNeighbor`, `isRootEdge`, `rootEdgeFlags`, etc.)
 *   always resolve against the root grid coordinates.
 *
 * To use a custom subclass, subclass `Grid` and override `createCell()`:
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
 * For standalone sketch use without a grid, extend `Cell` directly.
 */
export class GridCell extends Cell {
  grid: Grid
  private neighborContext?: GridNeighborContext

  constructor(config: GridCellConfig) {
    super(config)
    this.grid = config.grid
    this.neighborContext = config.neighborContext
  }

  /**
   * Return the size (cols/rows) of this cell's active neighbor context.
   *
   * - Root cells => root grid size
   * - Recursive subdivision cells => local sibling subdivision size
   */
  contextSize(): { cols: number; rows: number } {
    const { cols, rows } = this.resolveNeighborContext()
    return { cols, rows }
  }

  /**
   * Which sides of the active neighbor context this cell lies on.
   *
   * Corner cells have two adjacent sides `true`. See `cornerFlags()`.
   */
  edgeFlags(): GridCellEdgeFlags {
    const { rows, cols } = this.resolveNeighborContext()
    return edgeFlagsFromIndices(this.row, this.col, rows, cols)
  }

  /**
   * Which corners of the active context this cell occupies, derived only from
   * `edgeFlags()` (single source of truth for boundary sides).
   */
  cornerFlags(): GridCellCornerFlags {
    return cornerFlagsFromEdges(this.edgeFlags())
  }

  /**
   * Same shape as `edgeFlags()` but using root grid dimensions and this cell's
   * `row`/`col` (mirrors `isRootEdge` inputs).
   */
  rootEdgeFlags(): GridCellEdgeFlags {
    return edgeFlagsFromIndices(this.row, this.col, this.grid.rows, this.grid.cols)
  }

  /**
   * Corner occupancy in root coordinates, derived from `rootEdgeFlags()`.
   */
  rootCornerFlags(): GridCellCornerFlags {
    return cornerFlagsFromEdges(this.rootEdgeFlags())
  }

  /**
   * Check if this cell is on the edge of its active context.
   *
   * For root cells, this matches root-grid edge checks.
   * For recursive subdivision cells, this checks sibling-local bounds.
   */
  isEdge(): boolean {
    return anyEdge(this.edgeFlags())
  }

  /**
   * Check if this cell is a corner in its active context.
   */
  isCorner(): boolean {
    return anyCorner(this.cornerFlags())
  }

  /**
   * Check if this cell is on the edge of the root grid.
   *
   * Useful when working with recursive nodes but wanting root-topology checks.
   */
  isRootEdge(): boolean {
    return anyEdge(this.rootEdgeFlags())
  }

  /**
   * Check if this cell is a corner in the root grid.
   */
  isRootCorner(): boolean {
    return anyCorner(this.rootCornerFlags())
  }

  /**
   * Get a specific neighbor by direction in the active context.
   *
   * - Root cell => resolves through `grid.at(...)`
   * - Recursive cell => resolves within the local sibling subdivision set
   */
  getNeighbor(direction: NeighborDirection): GridCell | null {
    const { row, col } = this
    const context = this.resolveNeighborContext()
    const { rows, cols } = context

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

    return context.at(targetRow, targetCol)
  }

  /**
   * Get a specific neighbor by direction in the root grid context.
   */
  getRootNeighbor(direction: NeighborDirection): GridCell | null {
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
   * Get all 4 cardinal neighbors (top, right, bottom, left) in active context.
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
   * Get all 8 neighbors (including diagonals) in active context.
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
   * Get all 4 cardinal neighbors (top, right, bottom, left) in root-grid context.
   */
  getRootNeighbors4(): GridCell[] {
    const neighbors: GridCell[] = []
    const directions: NeighborDirection[] = ['top', 'right', 'bottom', 'left']

    for (const direction of directions) {
      const neighbor = this.getRootNeighbor(direction)
      if (neighbor) neighbors.push(neighbor)
    }

    return neighbors
  }

  /**
   * Get all 8 neighbors (including diagonals) in root-grid context.
   */
  getRootNeighbors(): GridCell[] {
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
      const neighbor = this.getRootNeighbor(direction)
      if (neighbor) neighbors.push(neighbor)
    }

    return neighbors
  }

  /**
   * Return this cell's ancestry in nearest-to-farthest order.
   *
   * By default excludes `this`; pass `includeSelf = true` to include it.
   */
  ancestors(includeSelf: boolean = false): GridCell[] {
    const result: GridCell[] = []
    let cursor: Cell | undefined = includeSelf ? this : this.parent
    while (cursor) {
      if (cursor instanceof GridCell) {
        result.push(cursor)
      }
      cursor = cursor.parent
    }
    return result
  }

  /**
   * Return the highest ancestor in this hierarchy (or `this` if already root).
   */
  root(): GridCell {
    let cursor: GridCell = this
    while (cursor.parent instanceof GridCell) {
      cursor = cursor.parent
    }
    return cursor
  }

  /**
   * Find the first ancestor matching a predicate.
   *
   * Traversal is nearest-to-farthest.
   */
  findAncestor(predicate: (cell: GridCell) => boolean, includeSelf: boolean = false): GridCell | null {
    let cursor: Cell | undefined = includeSelf ? this : this.parent
    while (cursor) {
      if (cursor instanceof GridCell && predicate(cursor)) {
        return cursor
      }
      cursor = cursor.parent
    }
    return null
  }

  /**
   * Resolve the effective neighbor context for active-context APIs.
   *
   * Root cells have no local override, so this falls back to root grid bounds.
   */
  private resolveNeighborContext(): GridNeighborContext {
    if (this.neighborContext) {
      return this.neighborContext
    }
    return {
      cols: this.grid.cols,
      rows: this.grid.rows,
      at: (row, col) => this.grid.at(row, col)
    }
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
 * Grid — root grid container with recursive subdivision support.
 *
 * Provides:
 * - root indexed access (`at`, `cellAt`, `forEach`, `map`, `filter`)
 * - root cell construction via `createCell()`
 * - recursive subdivision that also uses `createCell()`
 *
 * Subdivision notes:
 * - `subdivide()` returns recursive `GridCell[]` nodes (not plain `Cell[]`).
 * - Returned nodes include `parent` and `level`.
 * - Returned nodes are *not* inserted into `grid.cells/grid2D`; those remain
 *   the root level only.
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
   * Factory method for all `GridCell` creation.
   *
   * Override in a `Grid` subclass to produce custom `GridCell` instances.
   *
   * Called by:
   * - root initialization (`initializeCells`)
   * - recursive subdivision (`subdivideRecursive` via `createSubdivisionChildren`)
   *
   * For root initialization, returned nodes populate `grid.cells` and `grid2D`.
   * For recursive subdivision, returned nodes are transient hierarchy results.
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
   * Initialize the grid cells via the `createCell` factory.
   *
   * Called once from the constructor. Override `createCell` rather than this
   * method to customize cell classes.
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
   * Get a root-level cell by row and column (2D access).
   */
  at(row: number, col: number): GridCell | null {
    if (row < 0 || row >= this.rows || col < 0 || col >= this.cols) {
      return null
    }
    return this.grid2D[row]![col]!
  }

  /**
   * Get a root-level cell by 1D index.
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
   * Iterate root-level cells in row-major order.
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
   * Map root-level cells in row-major order.
   */
  map<T>(callback: (cell: GridCell, row: number, col: number) => T): T[] {
    const results: T[] = []
    this.forEach((cell, row, col) => {
      results.push(callback(cell, row, col))
    })
    return results
  }

  /**
   * Filter root-level cells.
   */
  filter(callback: (cell: GridCell) => boolean): GridCell[] {
    return this.cells.filter(callback)
  }

  /**
   * Recursively subdivide the grid
   * 
   * Returns a flat array of recursive terminal `GridCell` instances.
   * A node is terminal when either:
   * - `level >= maxLevel`, or
   * - subdivide condition is not met (`condition(...) === false` or chance miss)
   *
   * This is parent-preserving: stop decisions keep the current node as-is, so
   * returned levels can include `0..maxLevel`.
   *
   * Each returned node includes:
   * - `level` (subdivision depth)
   * - `parent` (immediate ancestor)
   * - local `row/col/index` in its sibling subdivision set
   *
   * Default neighbor/edge APIs on returned nodes are local-context aware.
   * Use root-explicit APIs when global root topology is required.
   * 
   * @param config - Subdivision configuration
   * @param config.maxLevel - Maximum recursion depth. `0` returns root cells.
   * @param config.chance - Chance (0-100) to subdivide current node (used when no condition is provided).
   * @param config.subdivisionCols - Columns per split; clamped to `>= 1`.
   * @param config.subdivisionRows - Rows per split; clamped to `>= 1`.
   * @param config.condition - Optional subdivide predicate. Return `true` to subdivide current node, `false` to keep it.
   */
  subdivide(config: SubdivideConfig): GridCell[] {
    const {
      maxLevel,
      chance = 50,
      subdivisionCols = this.cols,
      subdivisionRows = this.rows,
      condition,
      rule
    } = config
    const clampedMaxLevel = Math.max(0, Math.floor(maxLevel))
    const clampedChance = Math.max(0, Math.min(100, chance))
    const clampedSubdivisionCols = Math.max(1, Math.floor(subdivisionCols))
    const clampedSubdivisionRows = Math.max(1, Math.floor(subdivisionRows))

    const resultCells: GridCell[] = []

    this.forEach((cell) => {
      this.subdivideRecursive(
        cell,
        0,
        clampedMaxLevel,
        clampedChance,
        clampedSubdivisionCols,
        clampedSubdivisionRows,
        resultCells,
        condition,
        rule
      )
    })

    return resultCells
  }

  /**
   * Recursive subdivision walker over one parent node.
   *
   * Stop checks run once per node before child generation. This keeps terminal
   * nodes at their current level (parent-preserving semantics).
   */
  private subdivideRecursive(
    parentCell: GridCell,
    currentLevel: number,
    maxLevel: number,
    chance: number,
    subdivisionCols: number,
    subdivisionRows: number,
    resultCells: GridCell[],
    condition?: (cell: GridCell, level: number) => boolean,
    rule?: (cell: GridCell, level: number) => false | { cols: number; rows: number }
  ): void {
    if (currentLevel >= maxLevel) {
      resultCells.push(parentCell)
      return
    }

    let nextSubdivisionCols = subdivisionCols
    let nextSubdivisionRows = subdivisionRows

    if (rule) {
      const decision = rule(parentCell, currentLevel)
      if (decision === false) {
        resultCells.push(parentCell)
        return
      }
      nextSubdivisionCols = Math.max(1, Math.floor(decision.cols))
      nextSubdivisionRows = Math.max(1, Math.floor(decision.rows))
    } else {
      const shouldSubdivide = condition
        ? condition(parentCell, currentLevel)
        : this.utils.seed.coinToss(chance)

      if (!shouldSubdivide) {
        resultCells.push(parentCell)
        return
      }
    }

    const children = this.createSubdivisionChildren(parentCell, currentLevel + 1, nextSubdivisionCols, nextSubdivisionRows)
    for (const childCell of children) {
      this.subdivideRecursive(
        childCell,
        currentLevel + 1,
        maxLevel,
        chance,
        nextSubdivisionCols,
        nextSubdivisionRows,
        resultCells,
        condition,
        rule
      )
    }
  }

  /**
   * Build one subdivision generation for a parent node.
   *
   * Children share a local neighbor context so active-context neighbor lookups
   * resolve within sibling bounds at this level.
   */
  private createSubdivisionChildren(
    parentCell: GridCell,
    level: number,
    subdivisionCols: number,
    subdivisionRows: number
  ): GridCell[] {
    const cellW = parentCell.width / subdivisionCols
    const cellH = parentCell.height / subdivisionRows
    const childGrid: GridCell[][] = Array.from(
      { length: subdivisionRows },
      () => Array.from({ length: subdivisionCols })
    )
    const context: GridNeighborContext = {
      cols: subdivisionCols,
      rows: subdivisionRows,
      at: (row, col) => {
        if (row < 0 || row >= subdivisionRows || col < 0 || col >= subdivisionCols) {
          return null
        }
        return childGrid[row]![col] ?? null
      }
    }
    const result: GridCell[] = []

    for (let row = 0; row < subdivisionRows; row++) {
      for (let col = 0; col < subdivisionCols; col++) {
        const x = parentCell.x + col * cellW
        const y = parentCell.y + row * cellH
        const child = this.createCell({
          x,
          y,
          width: cellW,
          height: cellH,
          row,
          col,
          index: row * subdivisionCols + col,
          level,
          parent: parentCell,
          grid: this,
          neighborContext: context
        })
        childGrid[row]![col] = child
        result.push(child)
      }
    }

    return result
  }

  /**
   * Get root-level edge cells.
   */
  getEdgeCells(): GridCell[] {
    return this.filter(cell => cell.isEdge())
  }

  /**
   * Get root-level corner cells.
   */
  getCornerCells(): GridCell[] {
    return this.filter(cell => cell.isCorner())
  }

  /**
   * Get a random root-level cell.
   */
  randomCell(): GridCell {
    const index = this.utils.seed.randomInt(0, this.cells.length - 1)
    return this.cells[index]!
  }
}
