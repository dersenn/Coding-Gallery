# Ballooney Migration Audit

Date: 2026-03-02  
Scope: `projects/svg/ballooney/index.ts`

## Findings

### keep
- Kept the original 2x2 tile composition and per-edge random segment count behavior.
- Kept the progressive random edge subdivision feel (each next split lerps from the previous split toward the edge end).
- Kept per-tile quadratic path construction with center-pulled control points.

### replace now
- Replaced legacy global classes (`SVG`, `Pt`, `Tile`) with framework `SVG` and `Vec` primitives.
- Replaced keypress save handling with framework `download-svg` action registration and `svg.save(...)`.
- Replaced unseeded randomness with framework seeded randomness (`shortcuts(utils)`), preserving composition intent while making outputs reproducible by seed.

### replace later
- If additional early SVG engine studies are migrated, consider extracting a shared helper for the progressive random edge subdivision pattern used by V1.

### post-migration notes
- 2026-03-02: Added `utils.seed.reset()` at the top of `draw()` to restore PRNG to seed origin before each redraw. This was a framework-level fix applied to all sketches using seeded randomness in their draw loop; see `docs/SEED_SYSTEM.md`.
- 2026-03-02: Renamed `render()` to `draw()` for naming consistency with other sketches. Replaced manual `controlState` update in `onControlChange` with `syncControlState` from `~/composables/useControls`.
- 2026-03-02: Replaced hard-coded `#0f0` fill with `theme.foreground`. Replaced manual `nRows/nCols/cellW/cellH` + nested loops with `utils.grid.create()` + `grid.forEach()`, using `cell.x/y/width/height/col/row` for tile geometry.

## Utility-gap backlog
- Candidate utility gap: path-command utility for mixed `M/Q/C/S/Z` composition to reduce manual string-building in curve-heavy migrations.

## Utility-first evidence
- Utilities/classes checked: `SVG`, `Vec` methods (`mid`, `lerp`), `shortcuts(utils)` seeded random helpers, `utils.grid.create()` / `Grid.forEach()`, project action lifecycle (`registerAction`), `theme.foreground`.
- Chosen path: use existing framework utilities for rendering/lifecycle/randomness + custom sketch algorithm for progressive edge subdivision.
- Classification: keep / replace now / replace later as listed above.
- Rationale: primitive rendering and deterministic random are framework concerns; the subdivision behavior is sketch-specific visual logic.
