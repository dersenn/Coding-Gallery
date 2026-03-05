# Utility Gap Backlog

Central list of reusable utility candidates discovered during sketch migrations.

## How to use

- Add candidates here whenever a migration audit includes a utility-gap note.
- Keep sketch-specific custom logic in-project until at least 2 sketches share the same need.
- Track status as one of: `candidate`, `in-design`, `implemented`, `deferred`.

## Candidates

### Cell and grid architecture

- ID: `grid-cell-factory`
  - Status: `implemented`
  - Priority: **essential**
  - Need: `Grid` hardcoded `new GridCell()` in a `private` method with no extension hook, making `GridCell` subclassing a dead end — the subclass was never used by `Grid` even when explicitly defined.
  - Seen in: design discussion — `_svg-example` showcase, general intent to use `class MyCell extends GridCell` per sketch.
  - Notes: fixed by adding `protected createCell(config: GridCellConfig): GridCell` and `protected createLeafCell(config: CellConfig): Cell` factory methods to `Grid`. `initializeCells()` now calls `this.createCell(...)`, `subdivideRecursive()` now calls `this.createLeafCell(...)`. Default implementations return `new GridCell()` / `new Cell()` — fully backward-compatible. Subclass `Grid` and override either factory to inject custom types. See `docs/GRID_CELL_EXTENSION.md`.

- ID: `gridcell-cell-split`
  - Status: `implemented`
  - Priority: **high**
  - Need: Split `Cell` into a pure positioned agent (`Cell`) and a grid-aware subclass (`GridCell extends Cell`). Grid-specific methods (`isEdge`, `isCorner`, `getNeighbor`, `getNeighbors4/8`) move to `GridCell`. `Grid` creates `GridCell` instances internally; standalone sketch use stays with `Cell` or sketch-local subclasses.
  - Seen in: design discussion — vera standalone tile cells carry unused grid methods; Grid cells lack proper typing for neighbor returns.
  - Notes: `GridCell` co-located in `utils/grid.ts`, exported from `types/project.ts`. `Grid.cells`, `at()`, `forEach()`, `map()`, `filter()`, `randomCell()` all return `GridCell`. `pearlymats` updated: `PearlyCell extends GridCell`. `subdivide()` still returns plain `Cell[]` (subdivision cells are positional only). See `docs/GRIDCELL_REFACTOR_PLAN.md`.

### Path building and bezier

- ID: `svg-path-command-builder`
  - Status: `implemented`
  - Need: typed helper/DSL to compose mixed `M/L/Q/C/S/A/Z` commands without manual string assembly.
  - Seen in: `docs/audits/BALLOONEY_MIGRATION_AUDIT.md`, `docs/audits/BEZIER_LAB_MIGRATION_AUDIT.md`
  - Notes: implemented as `PathBuilder` class in `utils/svg.ts`, re-exported from `types/project.ts`. Chainable API with `Vec` overloads for all SVG path commands.

- ID: `bezier-math-toolkit`
  - Status: `implemented`
  - Need: bezier utilities for point/tangent at `t`, arc-length estimation, segment split/subdivide.
  - Seen in: `docs/audits/BEZIER_LAB_MIGRATION_AUDIT.md`
  - Notes: implemented as `quadBezControlPoint` and `splineControlPoints` pure functions in `utils/generative.ts`, re-exported from `types/project.ts`. Also added `Vec.perp()` as the generic geometric primitive they expose. `Path` private methods now delegate to these. See `docs/audits/BEZIER_MATH_REFACTOR_AUDIT.md`.

- ID: `path-debug-geometry`
  - Status: `implemented`
  - Need: reusable extraction of path debug geometry (quadratic/cubic handle points + guide segments) from the same internals used by path builders.
  - Seen in: `docs/audits/BEZIER_LAB_MIGRATION_AUDIT.md`
  - Notes: implemented as `quadBezHandles` and `splineHandles` array helpers in `utils/generative.ts`, re-exported from `types/project.ts`. `bezier-lab` overlay drawing now uses these; local duplicates removed.

- ID: `path-resampling`
  - Status: `candidate`
  - Need: uniform point spacing along quadratic/cubic path segments.
  - Seen in: `docs/audits/BEZIER_LAB_MIGRATION_AUDIT.md`
  - Notes: useful for animation, stroke effects, and point-scatter overlays.

- ID: `progressive-edge-subdivision`
  - Status: `candidate`
  - Need: helper for progressive random edge subdivision (iterative lerp from previous split to end).
  - Seen in: `docs/audits/BALLOONEY_MIGRATION_AUDIT.md`
  - Notes: keep deterministic by always using framework seeded random source.

### Cell and grid

- ID: `cell-standalone-methods`
  - Status: `implemented`
  - Need: `Cell.center()`, `Cell.distance()`, and corner methods (`tl/tr/bl/br`) should work without a grid reference. Original port erroneously required `this.grid` to construct Vec objects.
  - Seen in: `projects/c4ta/svg/vera/index.ts` (standalone tile cells without a grid)
  - Notes: Fixed by changing `import type { Vec }` to `import { Vec }` in `utils/cell.ts` and using `new Vec(x, y)` directly. Added `tl()`, `tr()`, `bl()`, `br()` corner methods. All existing grid-attached usage unaffected.

- ID: `grid-indexing-ergonomics`
  - Status: `candidate`
  - Need: Optional 1-based row/col helpers for sketch ergonomics (human-friendly `1..n` checks) while keeping core `row`/`col` 0-based for array compatibility.
  - Seen in: `projects/svg/anni/index.ts` (rule checks like `row === 3` can be mentally off-by-one from visual counting)
  - Notes: Consider non-breaking helpers (for example getters like `row1` / `col1`) rather than changing base indexing semantics.

### Seed and noise

- ID: `coordinate-cell-hash`
  - Status: `implemented`
  - Need: deterministic float in `[0, 1)` keyed by an arbitrary tuple of discrete values (layer ID, channel ID, col, row, etc.), independent of draw order and PRNG stream position.
  - Seen in: `projects/c4ta/svg/vera/index.ts` (as `stableUnit`/`stableIndex`), `projects/svg/lattice-drift/index.ts` (inline `simplex2` mixing in `rowColor`)
  - Notes: implemented as `utils.noise.cell(...keys)` in `utils/generative.ts`. Uses seeded `noise2D` with non-axis-aligned irrational scale factors to map key tuples to uncorrelated values. Prefer over manual `simplex2` mixing whenever per-cell stable randomness is needed. Active user: `projects/svg/lattice-drift/index.ts` (row colors). Vera originally used this but was later refactored to per-layer PRNG instances — a clearer pattern for the multi-layer toggle case.

### Geometry and grid composition

- ID: `overlap-grid-tiling`
  - Status: `candidate`
  - Need: helper for overlap-tile dimensions/offset stepping (`tileW`, `tileH`, overlap, stepped origins).
  - Seen in: `docs/audits/VERA_MIGRATION_AUDIT.md`
  - Notes: candidate extraction target if more overlap-tile sketches are migrated.

- ID: `delaunay-circumcircle-helpers`
  - Status: `candidate`
  - Need: shared circumcircle + Delaunay filtering helpers for Voronoi/Delaunay studies.
  - Seen in: `docs/audits/VORONOI_MIGRATION_AUDIT.md`
  - Notes: keep brute-force and optimized versions separate if both appear.

- ID: `line-division-sampling-modes`
  - Status: `implemented`
  - Need: extend line-division helper to support interior-point sampling modes beyond uniform spacing (for example deterministic random sorted samples along the segment).
  - Seen in: `../svg-stuff/assets/js/engine.js` (legacy `divLength(..., t='RND')`), `../svg-stuff/mesh-01/sketch.js`
  - Notes: implemented as options-object extension on `utils.math.divLength` with modes: `uniform`, `randomGaps`, `randomSorted`, `gapAscending`, `gapDescending`, `curve`, `fibonacci`; output remains ordered along the source segment.

### Canvas and layout

- ID: `multi-layer-svg-stacking`
  - Status: `deferred`
  - Need: Multi-layer sketches (one SVG per layer, toggleable) may need overlay positioning (`el.style.position = 'relative'` + absolute layer stages) when true stacked visibility is required.
  - Seen in: `projects/svg/anni/index.ts`
  - Notes: `anni` now uses a single-active layer runtime helper (`utils/layerRuntime.ts`) instead of stacked DOM overlays. Keep this deferred until a sketch needs simultaneously mounted/toggleable layer stacks.

- ID: `layer-runtime-manager`
  - Status: `implemented`
  - Need: Small framework helper for layer lifecycle wiring (`mount/switch/draw/export`) so per-layer SVG composition is less sketch-specific boilerplate.
  - Seen in: `projects/svg/anni/index.ts` (single-active-layer flow), expectation from layered sketches like Vera-style composition.
  - Notes: Implemented as `createSingleActiveSvgLayerManager(...)` in `utils/layerRuntime.ts`, re-exported from `types/project.ts`. Registry/setup extraction is implemented as `createSingleActiveSvgLayerSetup(...)` so a single registry object now drives controls, defaults, and runtime definitions. The utility keeps `resolveCanvas(...)` as the sizing primitive and only orchestrates single-active lifecycle semantics.

- ID: `frame-padding-css-units`
  - Status: `candidate`
  - Need: Single-SVG inner-frame layout currently supports a lightweight subset of padding units (`number`, `px`, `%`, `vmin`, plain numeric string). Add a shared resolver for broader CSS length support (`rem`, `em`, `vw`, `vh`, and potentially `calc(...)`) when simulating per-layer artboards.
  - Seen in: `projects/svg/anni/index.ts` (`resolveInsetPx(...)` in single-SVG frame mode)
  - Notes: Keep deterministic frame math and avoid layout thrash; prefer centralizing this in a utility rather than sketch-local parsing once reused.

### p5 migration helpers

- ID: `asset-path-preload-helper`
  - Status: `candidate`
  - Need: convention/helper for custom static asset preload paths (fonts/textures/media) with clear errors.
  - Seen in: `docs/audits/TYPE_IN_SPACE_MIGRATION_AUDIT.md`
  - Notes: applies to p5 sketches with `preload()` dependencies.

- ID: `signed-velocity-init`
  - Status: `candidate`
  - Need: helper for signed random velocity vectors with min/max magnitude bounds.
  - Seen in: `docs/audits/CLICKY_POLYGON_MIGRATION_AUDIT.md`
  - Notes: only extract when reused beyond node-network sketches.

### Typing and iteration ergonomics

- ID: `js-layer-minimal-jsdoc`
  - Status: `candidate`
  - Need: tiny shared JSDoc pattern/snippet for layer modules authored as `.js` so sketch iteration stays low-friction while preserving editor autocomplete on draw context.
  - Seen in: `projects/svg/anni/layers/anni1.js`, `projects/svg/anni/layers/anni2.js`
  - Notes: keep this intentionally lightweight (for example one `@param` on exported draw functions) and avoid full TypeScript-style annotations inside JS files.

- ID: `layer-module-export-convention`
  - Status: `candidate`
  - Need: establish a templating convention for layer modules to export generic function names (for example `draw`) and alias them at import sites (`draw as drawLayerX`) so per-file naming carries identity while APIs stay uniform.
  - Seen in: `projects/svg/anni/index.ts`, `projects/svg/anni/layers/anni1.js`, `projects/svg/anni/layers/anni2.js`
  - Notes: keep compatibility with current layer registry pattern and apply first in templates/new sketches before retrofitting older files.
