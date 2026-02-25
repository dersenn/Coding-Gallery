# Utility-First Audit

Date: 2026-02-25  
Scope: active sketch `projects/pearlymats/index.ts`

## Findings

### keep
- `cellMap` bridge (`Map<string, PearlyCell>`) in `pearlymats` stays for now.  
  Reason: `Cell.getNeighbors()` returns base `Cell`, but propagation logic needs `PearlyCell` fields (`color`, `alpha`).

### replace now
- Replaced repeated `Math.hypot(...)` distance calculations with `shortcuts(utils).dist(...)` to use project utilities consistently.

### replace later
- Evaluate adding a utility helper to bridge neighbor lookup across derived cell types (e.g., helper that returns typed sketch cells from `Cell` neighbors).

## Utility-gap backlog
- Add a reusable helper for grid-space center distance, e.g. `gridCellDistance(cell, centerRow, centerCol)`.
- Add a helper for inward-neighbor selection in radial masks, e.g. `getMostInwardNeighbor(cell, centerRow, centerCol)`.
- Consider a sketch-level pattern/helper for mapping base `Cell` neighbors to derived sketch-cell instances.
