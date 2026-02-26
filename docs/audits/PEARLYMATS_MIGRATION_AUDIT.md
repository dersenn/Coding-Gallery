# Pearlymats Migration Audit

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

## Balanced decision rubric (required for non-trivial edits)

### 1) Classify the logic type first
- **Infrastructure primitive** (use framework utility): seed/noise, grid/cell indexing, neighbor lookup, distance/vector math, color parsing/conversion, theme/export wiring.
- **Sketch algorithm** (custom logic allowed): visual composition, artistic rules, custom propagation behavior, Voronoi/pattern generation, sketch-specific state transitions.

### 2) Choose path
- `use existing`: a utility/class already covers the semantics.
- `custom algorithm`: framework primitives are used where relevant, but core behavior is sketch-specific.

### 3) Overlap safeguard
- If custom logic is near a possible utility overlap, add:
  - one-line rationale in code,
  - one audit classification (`keep`, `replace now`, `replace later`).

## Migration checklist (old sketch -> framework)
- Capture original behavior intent (what must remain visually/behaviorally identical).
- Map behavior blocks to framework contracts and existing utilities.
- Implement using framework primitives first, then fill algorithmic gaps with custom logic.
- Record `keep` / `replace now` / `replace later` findings.
- Add recurring unmapped patterns to utility-gap backlog.

## Agent evidence template (paste into notes/PR/summary)
```md
### Utility-first evidence
- Utilities/classes checked: ...
- Logic type: infrastructure primitive | sketch algorithm
- Chosen path: use existing | custom algorithm
- Classification: keep | replace now | replace later
- Rationale (only if custom near overlap): ...
```
