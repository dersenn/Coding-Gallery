# Utility Gap Backlog

Central list of reusable utility candidates discovered during sketch migrations.

## How to use

- Add candidates here whenever a migration audit includes a utility-gap note.
- Keep sketch-specific custom logic in-project until at least 2 sketches share the same need.
- Track status as one of: `candidate`, `in-design`, `implemented`, `deferred`.

## Candidates

### Cell and grid architecture

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
