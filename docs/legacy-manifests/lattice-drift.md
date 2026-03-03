# lattice-drift

- Source type: external-folder
- Technique: svg
- Canonical source path: `/Users/dersenn/Library/CloudStorage/Dropbox-Personal/ Code/Sandbox/svg-stuff/mesh-01`
- Source snapshot: migrated on 2026-03-02
- Migration destination: `projects/svg/lattice-drift/index.ts`
- Status: migrated
- Notes: Port preserves warped lattice subdivision and spline strand composition from `mesh-01`, mapped to framework utilities and control lifecycle.
- Post-migration update (2026-03-03): `Path.buildSpline` public API unchanged; internal control-point math now delegates to `splineControlPoints` in `utils/generative.ts`. No sketch code changes required. See `docs/audits/BEZIER_MATH_REFACTOR_AUDIT.md`.
- Behavior fix (2026-03-03): sub-strand t-positions are now stable per `(column, subStrand)` pair via `utils.noise.cell(x, s)`, replacing per-row `divLengthByMode` calls. Eliminates row-to-row horizontal jitter that caused sub-strands to zigzag and intersect parent strands. `minSegmentRatio` is respected via clamping.
