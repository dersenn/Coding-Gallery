# Voronoi Migration Audit

Date: 2026-02-27  
Scope: `projects/voronoi/index.ts`

## Source references (legacy notes)
- https://charlottedann.com/article/soft-blob-physics
- https://codepen.io/ksenia-k/pen/RwXVMMY

## Findings

### keep
- Kept brute-force Delaunay strategy: enumerate all triangles, then validate circumcircle emptiness.
- Kept point, triangulation path, and circumcenter rendering stages.
- Kept seeded point generation and seeded color assignment behavior.

### replace now
- Replaced custom legacy engine globals with framework primitives: `SVG`, `Path`, `Vec`, and `shortcuts(utils)`.
- Replaced ad hoc RGBA mutation helper with framework `Color.parse(...).withAlpha(...).toRgbaString()`.

### replace later
- Neighbor-finding/debug section from legacy source remained intentionally omitted because it was marked unfinished and did not affect rendered output.

## Utility-gap backlog
- If Voronoi studies continue, consider a shared geometry helper for circumcircle computations and Delaunay triangle filtering.

## Utility-first evidence
- Utilities/classes checked: `shortcuts(utils)`, `Vec`, `SVG`, `Path`, `Color`, `context.utils.seed`, `context.theme`.
- Chosen path: use existing framework utilities + custom algorithm for Delaunay selection.
- Classification: keep / replace now / replace later as listed above.
- Rationale: rendering and geometry primitives are framework concerns; triangulation logic is sketch-specific domain behavior.
