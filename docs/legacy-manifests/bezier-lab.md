# bezier-lab

- Source type: external-folder
- Technique: svg
- Canonical source path: `/Users/dersenn/Library/CloudStorage/Dropbox-Personal/ Code/Sandbox/svg-engine/{v2,v3}`
- Source snapshot: migrated on 2026-03-02
- Migration destination: `projects/svg/bezier-lab/index.ts`
- Status: migrated
- Notes: Legacy V2/V3 bezier test sketches consolidated into a single framework sketch with control-based variant selection. Renamed from gallery id/path `svg-engine-bezier-lab` -> `bezier-lab`.
- Post-migration update (2026-03-03): local `getQuadControlPoint` and `getSplineControlPoints` duplicates removed; sketch now uses `quadBezHandles` and `splineHandles` from `utils/generative.ts`. See `docs/audits/BEZIER_MATH_REFACTOR_AUDIT.md`.
