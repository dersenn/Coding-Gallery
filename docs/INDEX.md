# Documentation Index

Use this folder for supporting docs while keeping the repository root focused on core app files.

## Start here

- Main project reference: `../README.md`

## Topic references

Status labels: `[IMPLEMENTED]` — current behaviour; `[PARTIAL]` — phases 1+2 done, later phases pending; `[PROPOSAL]` — not yet built; `[BACKLOG]` — tracked work items; `[ARCHIVE]` — completed one-time plan, kept for design reference.

### Active documentation

- Seed system details: `SEED_SYSTEM.md` `[IMPLEMENTED]`
- SVG engine details: `SVG_IMPLEMENTATION.md` `[IMPLEMENTED]`
- Grid and Cell utilities: See main `../README.md` (Grid and Cell Utilities section) `[IMPLEMENTED]`
- Extending GridCell per sketch (factory pattern): `GRID_CELL_EXTENSION.md` `[IMPLEMENTED]`
- Layer runtime helper pattern (single-active layer, multi-technique): `LAYER_RUNTIME_MANAGER.md` `[IMPLEMENTED]`
- Container sizing and layout: `CONTAINER_UTILITY.md` `[IMPLEMENTED]`
- Lightweight canvas drawing API: `CANVAS_DRAWING_UTILITY.md` `[IMPLEMENTED]`
- Initial control randomization reference: `INITIAL_CONTROL_RANDOMIZATION.md` `[IMPLEMENTED]`
- Pause/resume for animated layers (`runtime?.enablePause?.()`, `runtime?.paused`, `runtime?.onPauseChange`): see `../README.md` Pause/Resume section and `../composables/usePlayback.ts` `[IMPLEMENTED]`
- Project config migration playbook: `PROJECT_CONFIG_MIGRATION_PLAYBOOK.md` `[IMPLEMENTED]`
- Agent prompt preambles and naming guidance: `AGENT_PROMPT_PREAMBLES.md` `[IMPLEMENTED]`
- Multi-technique runtime (phases 1+2 done; phases 3+4 pending): `MULTI_TECHNIQUE_RUNTIME_PLAN.md` `[PARTIAL]`

### Backlogs

- Framework improvements (viewer shell, controls UI, runtime): `FRAMEWORK_BACKLOG.md` `[BACKLOG]`
- Utility candidates from migrations: `UTILITY_GAP_BACKLOG.md` `[BACKLOG]`

### Proposals (not yet built)

- Standalone source export (project/layer detachment): `proposals/STANDALONE_EXPORT_SKETCH.md` `[PROPOSAL]`
- Browser history granularity (milestone vs transient states): `proposals/HISTORY_GRANULARITY_PROPOSAL.md` `[PROPOSAL]`

### Archive (completed, kept for design reference)

- GridCell/Cell split refactor: `archive/GRIDCELL_REFACTOR_PLAN.md` `[ARCHIVE]`

### Reference material

- Migration audits: `audits/` (use `SKETCHNAME_MIGRATION_AUDIT.md`, e.g. `PEARLYMATS_MIGRATION_AUDIT.md`)
- Legacy source manifests: `legacy-manifests/`

## Framework-first quick reference

- Framework contract and module surface: `../types/project.ts`
- Main project/runtime and controls/actions docs: `../README.md`
- Seed determinism rules: `SEED_SYSTEM.md`
- Container sizing and layout: `CONTAINER_UTILITY.md`
- Lightweight canvas drawing API: `CANVAS_DRAWING_UTILITY.md`
- Utility-first rule: check existing utilities before writing helper wrappers.
- Grid/cell choice: use `Grid`/`GridCell` for topology + neighbors; use `Cell` for standalone positioned objects.
- Utility families to check first:
  - `../utils/generative.ts` (seed/noise/math/vec/array)
  - `../utils/grid.ts` and `../utils/cell.ts` (grid topology and neighbors)
  - `../utils/shortcuts.ts` (sketch ergonomics)
  - `../utils/container.ts` (layout sizing: full / square / ratio / padding)
  - `../utils/canvas.ts` (lightweight 2D drawing utility)
  - `../utils/color.ts`, `../utils/theme.ts`, `../utils/download.ts`, `../utils/svg.ts`
