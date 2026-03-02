# Utility Gap Backlog

Central list of reusable utility candidates discovered during sketch migrations.

## How to use

- Add candidates here whenever a migration audit includes a utility-gap note.
- Keep sketch-specific custom logic in-project until at least 2 sketches share the same need.
- Track status as one of: `candidate`, `in-design`, `implemented`, `deferred`.

## Candidates

### Path building and bezier

- ID: `svg-path-command-builder`
  - Status: `candidate`
  - Need: typed helper/DSL to compose mixed `M/L/Q/C/S/A/Z` commands without manual string assembly.
  - Seen in: `docs/audits/BALLOONEY_MIGRATION_AUDIT.md`, `docs/audits/BEZIER_LAB_MIGRATION_AUDIT.md`
  - Notes: likely belongs in `utils/svg.ts` as additive helpers near `Path`.

- ID: `bezier-math-toolkit`
  - Status: `candidate`
  - Need: bezier utilities for point/tangent at `t`, arc-length estimation, segment split/subdivide.
  - Seen in: `docs/audits/BEZIER_LAB_MIGRATION_AUDIT.md`
  - Notes: design as pure functions (independent of DOM/SVG class).

- ID: `path-debug-geometry`
  - Status: `candidate`
  - Need: reusable extraction of path debug geometry (quadratic/cubic handle points + guide segments) from the same internals used by path builders.
  - Seen in: `docs/audits/BEZIER_LAB_MIGRATION_AUDIT.md`
  - Notes: currently reimplemented in `projects/svg/bezier-lab/index.ts`; should be moved into shared helpers to avoid drift from `Path` internals.

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
