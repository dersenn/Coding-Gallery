# ANNI Migration Audit

## Scope

Migrated `projects/svg/anni` from legacy `index.ts` orchestration to canonical declarative `project.config.ts` runtime bootstrap.

## Utilities and contracts checked

- `ProjectDefinition` declarative contract in `types/project.ts`
- Metadata bootstrap flow in `runtime/projectBootstrap.ts`
- Sketch module loader and `.js`/`.ts` resolution in `components/ProjectViewer.vue`
- Single-active-sketch migration target and naming guidance in `docs/SKETCH_RUNTIME_MANAGER.md`

## Chosen path

- `use existing`: replaced custom `init` orchestration with metadata bootstrap primitives already in the framework.
- Kept sketch draw algorithms in `sketches/*.js` with no behavioral rewrites.

## Audit classification

- `keep`: sketch draw algorithms in `sketches/anni1.js` and `sketches/anni2.js`
- `replace now`: legacy export-proxy config pattern and runtime-heavy `index.ts`
- `replace later`: none identified during this migration

## Notes

- Sketch modules were aligned to metadata bootstrap by exporting `draw(context)`.
- No new reusable utility gaps were identified.
