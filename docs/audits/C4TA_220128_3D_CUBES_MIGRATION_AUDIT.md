# C4TA 220128 3D Cubes Migration Audit

Date: 2026-03-02  
Scope: `projects/c4ta/p5/220128-3d-cubes/index.ts`

## Findings

### keep
- Kept core visual behavior: WEBGL scene with an `11x11` white cube field over a black background.
- Kept animated z-elevation behavior: per-cell `noise` drives cube depth over time.
- Kept lighting composition: two moving point lights in green and red.

### replace now
- Replaced legacy global p5 script setup with framework module contract `init(container, context)` and cleanup.
- Replaced legacy canvas size globals with container-driven resize lifecycle and geometry recomputation.
- Replaced direct `p5` noise calls with framework seeded noise (`utils.noise.perlin2D` via `shortcuts`) so global `new-seed` affects this sketch.
- Replaced ad-hoc point objects with framework vector primitives (`Vec` via `utils.vec.create`) for grid-origin geometry.

### replace later
- If additional WEBGL C4TA sketches are migrated, consider a shared helper for WEBGL grid origin/cell-size recomputation.

## Utility-gap backlog
- No immediate gap for this migration; existing framework lifecycle primitives were sufficient.

## Utility-first evidence
- Utilities/classes checked: `ProjectContext` lifecycle contract, `utils.noise.perlin2D`, `utils.vec.create`, `utils.math.map`, p5 framework module integration, existing C4TA p5 migrations.
- Chosen path: custom sketch algorithm for 3D composition + existing framework lifecycle contract.
- Classification: keep / replace now / replace later as listed above.
- Rationale: cube-field displacement and moving-light choreography remain sketch-specific, while seeded noise, vector/mapping primitives, and lifecycle wiring are framework concerns.
