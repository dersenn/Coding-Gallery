# Extending GridCell — Unified Recursive Model

## Current model

`Grid` now uses one factory method for both root and recursive subdivision nodes:

```typescript
protected createCell(config: GridCellConfig): GridCell {
  return new GridCell(config)
}
```

`initializeCells()` and `subdivideRecursive()` both call `createCell(...)`, so custom subclasses flow through both normal grid creation and subdivision.

## How to use

### 1. Subclass both `Grid` and `GridCell`

```typescript
import { Grid, GridCell } from '~/types/project'
import type { GridCellConfig } from '~/utils/grid'

class MyCell extends GridCell {
  draw(svg: SVG) { /* ... */ }
}

class MyGrid extends Grid {
  protected createCell(config: GridCellConfig): GridCell {
    return new MyCell(config)
  }
}
```

### 2. Draw root cells

```typescript
const grid = new MyGrid({ cols: 3, rows: 3, width: w, height: h, x: 0, y: 0, utils })
grid.cells.forEach(cell => (cell as MyCell).draw(svg))
```

### 3. Draw recursive terminal subdivision cells

```typescript
const terminals = grid.subdivide({ maxLevel: 2, chance: 50, subdivisionCols: 2, subdivisionRows: 2 })
terminals.forEach(cell => (cell as MyCell).draw(svg))
```

### 4. Per-node subdivision dimensions (rule)

If you want subdivision dimensions to vary per node (for example choosing 2×2 or 4×4 at different points in the recursion), pass a `rule`.

When `rule` is provided it takes precedence over `chance`, `condition`, and `subdivisionCols/subdivisionRows`.

```typescript
const terminals = grid.subdivide({
  maxLevel: 3,
  rule: (cell, level) => {
    // Stop some branches early
    if (level === 0 && utils.seed.coinToss(40) === false) return false

    // Choose per-node split dimensions
    const div = utils.seed.coinToss(50) ? 2 : 4
    return { cols: div, rows: div }
  }
})
```

Subdivision is parent-preserving:
- stop decisions keep the current node as terminal,
- `maxLevel: 0` returns root cells,
- returned terminals may be mixed levels.

Each terminal node keeps:
- `level` (depth),
- `parent` (upward hierarchy),
- local `row/col/index` for sibling context.

## Neighbor semantics

Default/simple methods stay local to the active context:
- `getNeighbor`, `getNeighbors4`, `getNeighbors`
- `isEdge`, `isCorner`

For explicit root-grid behavior, use:
- `getRootNeighbor`, `getRootNeighbors4`, `getRootNeighbors`
- `isRootEdge`, `isRootCorner`

## Tree traversal helpers

`GridCell` now includes:
- `ancestors(includeSelf?)`
- `root()`
- `findAncestor(predicate, includeSelf?)`

## Grid sizing modes (add-on)

`Grid` now supports optional sizing controls while preserving legacy behavior by default.

```typescript
type GridCellSizing = 'stretch' | 'squareByCount' | 'squareByShortSide'
type GridFit = 'contain' | 'cover' | 'stretch'
```

- `cellSizing: 'stretch'` (default): legacy behavior; fills available width/height independently.
- `cellSizing: 'squareByCount'`: keeps configured `rows`/`cols`, then applies `fit`.
- `cellSizing: 'squareByShortSide'`: uses `shortSideDivisions` as the cell count on the shorter axis, derives the longer axis count, then applies `fit`.
- `fit: 'contain'`: square cells remain inside bounds; leftover space may appear.
- `fit: 'cover'`: square cells cover bounds; overflow is aligned by `alignX/alignY`.
- `fit: 'stretch'`: fills full bounds; cells may become non-square.

### Examples

```typescript
// 1) Legacy/default behavior (non-breaking)
const a = new Grid({ cols: 12, rows: 8, width: w, height: h, utils })

// 2) Keep explicit counts, force square cells inside bounds
const b = new Grid({
  cols: 12, rows: 8, width: w, height: h, utils,
  cellSizing: 'squareByCount',
  fit: 'contain',
  alignX: 'center',
  alignY: 'center'
})

// 3) Keep explicit counts, square cover (can overflow frame)
const c = new Grid({
  cols: 12, rows: 8, width: w, height: h, utils,
  cellSizing: 'squareByCount',
  fit: 'cover',
  alignX: 'center',
  alignY: 'center'
})

// 4) Derive counts from short side denominator
const d = new Grid({
  cols: 1, rows: 1, width: w, height: h, utils,
  cellSizing: 'squareByShortSide',
  shortSideDivisions: 16,
  fit: 'contain'
})
```

## When NOT to subclass Grid

If you are using `Cell` standalone (without a `Grid`) — for sketch-local tile agents, positioned objects, etc. — just extend `Cell` directly. No `Grid` subclass is needed:

```typescript
class TileAgent extends Cell {
  active = false
  draw(svg: SVG) { /* ... */ }
}

const tile = new TileAgent({ x: 100, y: 100, width: 50, height: 50, row: 0, col: 0, index: 0, level: 0 })
tile.draw(svg)
```

## Why constructor-time factory is safe

`initializeCells()` is called from `Grid`'s constructor, which means `this.createCell()` is dispatched while the `Grid` constructor is still running. In JavaScript, the prototype chain is fully established before any constructor body executes — so `this.createCell()` correctly calls the subclass override even at this point. The only risk would be if `createCell()` depended on fields initialized in the subclass constructor body (not the prototype). Avoid this: resolve all `MyCell` data from the `GridCellConfig` argument alone.

## Summary of changed files

- `utils/grid.ts` — unified subdivision on `createCell()`, added root-explicit neighbor/edge APIs, and added ancestry helpers.
- `docs/UTILITY_GAP_BACKLOG.md` — updated architecture notes to reflect unified recursive `GridCell` nodes.
