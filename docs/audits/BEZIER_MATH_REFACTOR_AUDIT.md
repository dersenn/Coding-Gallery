# Bezier Math Refactor Audit

Date: 2026-03-03  
Scope: `utils/generative.ts`, `utils/svg.ts`, `projects/svg/bezier-lab/index.ts`

## Summary

Extracted the bezier control-point math from `Path` private methods in `utils/svg.ts`
into exported pure functions in `utils/generative.ts`. Added a `PathBuilder` DSL
and array-level debug geometry helpers. `bezier-lab` updated to use shared functions,
removing its local duplicates.

## Changes

### `utils/generative.ts`

- **`Vec.perp()`** — new `Vec` method: 2D left-perpendicular (90° CCW rotation, `Vec(-y, x)`).
  Generic geometric primitive; extracted from the inline expression in `getControlPointQuad`.
  Reusable for line normals, path offsetting, arrow heads, etc.

- **`quadBezControlPoint(a, b, t, d)`** — exported pure function. Perpendicular-offset
  control point for a quadratic bezier segment. Verbatim math from `Path.getControlPointQuad`,
  now using `Vec.perp()`. Degenerate-input guard not needed here (amplitude becomes 0 naturally).

- **`splineControlPoints(p0, p1, p2, t)`** — exported pure function. Incoming/outgoing
  control-point pair for a cubic spline anchor, using the Scaled Innovation algorithm.
  Verbatim math from `Path.getControlPointsSpline`; degenerate guard (`denom ≤ 1e-9`)
  added from the `bezier-lab` local version for robustness.

- **`quadBezHandles(pts, t, d)`** — array helper: returns `{a, cp, b}` per segment.
  Encapsulates the segment-iteration loop previously inline in `drawQuadraticHandles`.

- **`splineHandles(pts, t)`** — array helper: returns `{pt, cpIn, cpOut}` per anchor.
  Encapsulates the per-point map previously inline in `drawCubicHandles`.

### `utils/svg.ts`

- Imports `quadBezControlPoint`, `splineControlPoints` from `./generative`.
- `Path.getControlPointQuad` and `Path.getControlPointsSpline` now delegate to the
  imported pure functions (thin wrappers, identical external behavior).
- `Path.dist` private method removed (was only used by `getControlPointQuad`;
  replaced by `Vec.m` magnitude on the delta vector inside `quadBezControlPoint`).
- **`PathBuilder`** class added: command-driven chainable SVG path assembler.
  Covers M/L/Q/C/S/A/Z with both coordinate and `Vec` overloads.

### `types/project.ts`

Re-exported: `quadBezControlPoint`, `splineControlPoints`, `quadBezHandles`,
`splineHandles` from `~/utils/generative`; `PathBuilder` from `~/utils/svg`.

### `projects/svg/bezier-lab/index.ts`

- Local `getQuadControlPoint` and `getSplineControlPoints` removed (were duplicates of
  the now-exported pure functions).
- `drawQuadraticHandles` now uses `quadBezHandles`; `drawCubicHandles` uses `splineHandles`.
- Removed `vDist` from `shortcuts` destructure (no longer needed in sketch).
- No visual behavior change; overlay rendering is identical.

## Utility-first evidence

- Utilities checked: `Vec` methods (`sub`, `lerp`, `norm`, `perp`), `utils.vec.dist` (covered by `Vec.m`).
- Chosen path: extract to shared pure functions — math was already used in two places
  (`Path` internals + `bezier-lab` local copies), making the extraction the minimum fix
  for drift prevention.
- Classification: `replace now` for duplicate removal; all additions are additive.
- `lattice-drift` — no code changes; calls `Path.buildSpline` whose public API is unchanged.
  Manifest updated to note the internal delegation change.
