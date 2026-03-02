# C4TA 220131 3D Dandelion Migration Audit

Date: 2026-03-02  
Scope: `projects/c4ta/p5/220131-3d-dandelion/index.ts`

## Findings

### keep
- Kept the core 3D behavior: sphere-distributed endpoints, center-to-tip radial lines, and spheres riding the animated lerp position.
- Kept camera interaction (`orbitControl`) and frame-based rotation around x/y axes.
- Kept black background with green lighting/material styling to preserve original visual intent.

### replace now
- Replaced legacy global p5 script setup with framework module contract `init(container, context)` and cleanup.
- Replaced all randomness with framework seed utilities (`utils.seed.randomRange` via `shortcuts`) so global `new-seed` changes generated point layout.
- Replaced `p5.Vector` usage with framework vector primitives (`Vec` via `utils.vec.create/lerp`) for center/point interpolation.
- Replaced direct p5 `map` helper with framework math primitive (`utils.math.map`).

### replace later
- If more C4TA WEBGL point-cloud sketches arrive, consider extracting a small shared helper for 4D sphere point picking + animated radial interpolation.

## Utility-gap backlog
- No immediate framework gap for this migration; existing seed/vector/math/lifecycle primitives covered the overlap.

## Utility-first evidence
- Utilities/classes checked: `ProjectContext` lifecycle contract, `utils.seed.randomRange`, `utils.vec.create`, `utils.vec.lerp`, `utils.math.map`, `shortcuts(utils)`.
- Chosen path: use existing framework primitives for randomness/vector/math and keep custom sphere-point algorithm/render choreography.
- Classification: keep / replace now / replace later as listed above.
- Rationale: the 4D point-picking and dandelion composition are sketch-specific algorithms, while seed/vector/math/lifecycle are shared primitive concerns.
