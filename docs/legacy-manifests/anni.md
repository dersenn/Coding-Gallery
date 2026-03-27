# Legacy Manifest: anni

## Source and destination

- Legacy source path: `projects/svg/anni/index.ts` (custom runtime orchestration)
- Migration destination: `projects/svg/anni/project.config.ts` + `projects/svg/anni/sketches/*.js`
- Canonical index pointers:
  - `configFile`: `/projects/svg/anni/project.config.ts`
  - `entryFile`: `/projects/svg/anni/index.ts`

## Status

- Status: migrated to declarative project config bootstrap
- Date: 2026-03-10

## Short note

`anni` now uses metadata bootstrap with declarative controls/actions/sketches and a minimal `index.ts` runtime pointer. Sketch rendering logic remains in sketch-local modules.
