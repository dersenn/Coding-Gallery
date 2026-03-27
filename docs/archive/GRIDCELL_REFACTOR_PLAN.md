# GridCell Refactor Plan

> **Status: ARCHIVE — implemented.**
> `GridCell` lives in `utils/grid.ts`, exported from `types/project.ts`. Kept for design-decision reference.

Split `Cell` into a pure base class and a grid-aware subclass.

## Motivation

`Cell` is designed as a general-purpose positioned agent — the base for standalone
sketch cells, particle systems, automata, and per-sketch extensions (`VeraCell extends Cell`).
Currently it carries grid-specific methods (`isEdge`, `isCorner`, `getNeighbor`, etc.)
that silently no-op when no grid is attached. This pollutes the standalone API and
obscures the design intent.

## Target architecture

```
Cell
  x, y, width, height, row, col, index, level, parent?
  center(), tl(), tr(), bl(), br()
  contains(x, y), distance(Cell | Vec)
  → standalone use, extension base

GridCell extends Cell
  declare grid: Grid   (required, not optional)
  isEdge(), isCorner()
  getNeighbor(direction), getNeighbors4(), getNeighbors()
  → created internally by Grid; not used directly in sketches
```

## Files affected

| File | Change |
|---|---|
| `utils/cell.ts` | Keep `Cell` as pure base; remove grid methods |
| `utils/grid.ts` | Add `GridCell` class; `Grid.cells: GridCell[]`; `at()` / `forEach()` return `GridCell` |
| `types/project.ts` | Export `GridCell` alongside `Cell` |
| Existing sketches | No logic changes; TypeScript infers `GridCell` from grid iteration automatically |

## Key decisions

- `GridCell` lives in `utils/grid.ts` (co-located with `Grid`, which owns its lifecycle)
- `utils.cell.create()` continues to return plain `Cell` (standalone factory)
- No `utils.gridCell.create()` factory — Grid handles its own cell construction
- `CellConfig.grid` becomes required in `GridCellConfig`

## Migration notes

- `grid.forEach((cell) => cell.getNeighbors4())` → cell is now typed `GridCell`, no cast needed
- Any sketch calling `cell.isEdge()` on a grid cell gets the correct type automatically
- Standalone cells (`new Cell(...)`, `new VeraCell(...)`) are unaffected

## Status

`implemented` — `GridCell` lives in `utils/grid.ts`, exported from `types/project.ts`. `pearlymats` updated to `PearlyCell extends GridCell`.
