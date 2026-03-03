# Lattice Drift Migration Audit

Date: 2026-03-02  
Scope: `projects/svg/lattice-drift/index.ts`

## Findings

### keep
- Kept the legacy two-stage subdivision composition: randomized left/right boundaries, then randomized row interpolation between boundaries.
- Kept column-wise strand extraction and smooth spline rendering for organic vertical flow.
- Kept optional point overlay behavior as a scaffold/debug layer.

### replace now
- Replaced legacy global engine helpers with framework contracts: `SVG`, `Path`, `Vec`, and control/action lifecycle.
- Replaced legacy `divLength(..., 'RND')` calls with framework `utils.math.divLength(...)` options-object modes.
- Replaced ad-hoc runtime behavior with explicit grouped controls for structure, subdivision, layers, and style.
- Replaced non-repeatable redraw randomness with deterministic redraw sampling tied to project seed.

### replace later
- If more lattice/strand studies are migrated, consider extracting a shared scaffold builder for two-stage boundary+row subdivision.

### post-migration notes
- 2026-03-02: Added `utils.seed.reset()` at the top of `draw()` to restore PRNG to seed origin before each redraw, completing the deterministic redraw goal stated in the `replace now` section above. Framework-level fix; see `docs/SEED_SYSTEM.md`.
- 2026-03-02: Replaced hard-coded `#0f0` `pathStroke` default with `theme.foreground` initialized at runtime. Static control default updated to `'#00ff00'` (same value in dark mode; light mode will require a `setControlValues` API when that is built).
- 2026-03-02: Replaced inline `simplex2` mixing in `rowColor()` with `utils.noise.cell()` — the coordinate-cell-hash pattern was promoted to a framework utility after appearing here and in vera. Visual output of row colors changes for existing seeds; color-per-row behavior preserved.

## Utility-gap backlog
- No new utility gaps identified for this migration.
- Existing `line-division-sampling-modes` utility now covers the required subdivision behavior.

## Utility-first evidence
- Utilities/classes checked: `utils.math.divLength`, `shortcuts(utils)` (`v`, `simplex2`), `SVG`, `Path.buildSpline()`, `onControlChange`, `registerAction`.
- Chosen path: use existing framework utilities for primitives/lifecycle; keep composition algorithm sketch-local.
- Classification: `keep` / `replace now` / `replace later` as listed above.
- Rationale: framework already provides reusable seeded randomness, subdivision modes, vectors, and rendering primitives; the lattice composition remains sketch-specific behavior.
