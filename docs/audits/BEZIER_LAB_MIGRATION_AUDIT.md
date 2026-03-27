# Bezier Lab Migration Audit

Date: 2026-03-02  
Scope: `projects/svg/bezier-lab/index.ts`

## Findings

### keep
- Kept the bezier test intent from legacy V2/V3: compare polygon/spline/quadratic path outputs from vertically stepped point sets.
- Kept variant-specific parameter differences (`buildSpline` and `buildQuadBez` tension/width settings).
- Kept V3 visual diagnostics (center marker + point markers).

### replace now
- Replaced legacy global engine/path/vector classes with framework `SVG`, `Path`, and `Vec`.
- Replaced per-folder page selection with in-sketch variant selection control (matching the multi-sketch style used by `a-vera-2`).
- Replaced keyboard-driven download with framework `download-svg` action.

### replace later
- If this evolves beyond test-lab use, add fine-grained controls for spline tension and quadratic parameters rather than hardcoded presets.

## Utility-gap backlog
- Candidate utility gaps for bezier-heavy work:
  - reusable bezier sampling utility (point/tangent at `t`, arc-length approximation),
  - segment/path resampling helper for even spacing,
  - typed path-command builder DSL to avoid repeated string assembly.

## Utility-first evidence
- Utilities/classes checked: `Path.buildPolygon`, `Path.buildSpline`, `Path.buildQuadBez`, `SVG` primitives, `shortcuts(utils)` (`v`, `simplex2`), control lifecycle via `syncControlState`.
- Chosen path: use existing framework path/rendering/control primitives + custom deterministic point generation to keep sketch toggles stable.
- Classification: keep / replace now / replace later as listed above.
- Rationale: framework already covers drawing/path primitives and lifecycle; the V2/V3 comparison setup is sketch-specific composition behavior.
