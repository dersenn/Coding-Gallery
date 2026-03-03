# Extending GridCell — Factory Method Pattern

## The gap (now fixed)

The intent of `GridCell` is to be extended per sketch:

```typescript
class MyCell extends GridCell {
  draw(svg: SVG) { /* ... */ }
}
```

This works syntactically, but before the fix `Grid` always created plain `GridCell` instances internally — via `new GridCell()` hardcoded in a `private` method. The subclass was never used. `grid.cells` always contained `GridCell`, never `MyCell`.

## The fix

Two `protected` factory methods were added to `Grid` in `utils/grid.ts`:

```typescript
// Primary cells — called once per cell during Grid construction
protected createCell(config: GridCellConfig): GridCell {
  return new GridCell(config)
}

// Subdivision leaf cells — called by grid.subdivide()
protected createLeafCell(config: CellConfig): Cell {
  return new Cell(config)
}
```

`initializeCells()` now calls `this.createCell(...)` and `subdivideRecursive()` now calls `this.createLeafCell(...)`. The defaults return the same types as before — fully backward-compatible.

## How to use

### 1. Subclass both Grid and GridCell

```typescript
import { Grid, GridCell } from '~/types/project'
import type { GridCellConfig } from '~/utils/grid'

class MyCell extends GridCell {
  variant: number

  constructor(config: GridCellConfig) {
    super(config)
    this.variant = Math.floor(utils.noise.cell(this.x, this.y) * 8)
  }

  draw(svg: SVG, theme: ThemeTokens, sw: number) {
    switch (this.variant) {
      case 0: svg.makeCircle(this.center(), this.width * 0.3, theme.foreground); break
      // ...
    }
  }
}

class MyGrid extends Grid {
  protected createCell(config: GridCellConfig): GridCell {
    return new MyCell(config)
  }
}
```

### 2. Construct and draw

```typescript
const grid = new MyGrid({ cols: 3, rows: 3, width: svg.w, height: svg.h, x: 0, y: 0, utils })

// grid.cells contains MyCell instances
grid.cells.forEach(cell => (cell as MyCell).draw(svg, theme, sw))
```

The cast `(cell as MyCell)` is needed because `grid.cells` is typed as `GridCell[]`. If avoiding casts matters, a generic `Grid<T extends GridCell>` could be added as a follow-up.

### 3. With subdivision

If you also need custom types from `grid.subdivide()`, override `createLeafCell` alongside `createCell`:

```typescript
class MyGrid extends Grid {
  protected createCell(config: GridCellConfig): GridCell {
    return new MyCell(config)
  }

  protected createLeafCell(config: CellConfig): Cell {
    return new MyLeafCell(config)
  }
}

const leaves = grid.subdivide({ maxLevel: 2, chance: 50 })
leaves.forEach(cell => (cell as MyLeafCell).draw(svg))
```

Note: subdivision leaf cells have `row = col = index = -1` since they are positional only and not part of the primary grid topology.

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

- `utils/grid.ts` — added `createCell()` and `createLeafCell()` protected methods; updated `initializeCells()` and `subdivideRecursive()` call sites; updated `GridCell` JSDoc.
- `docs/UTILITY_GAP_BACKLOG.md` — added `grid-cell-factory` entry (implemented).
- `.cursor/rules/utility-first-sketches.mdc` — updated grid/cell guidance to document the `Grid` subclass requirement.
