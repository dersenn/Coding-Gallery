# Documentation Index

Use this folder for supporting docs while keeping the repository root focused on core app files.

## Start here

- Main project reference: `../README.md`

## Topic references

Status labels: `[IMPLEMENTED]` — current behaviour; `[PROPOSAL]` — not yet built; `[BACKLOG]` — tracked work items.

- Seed system details: `SEED_SYSTEM.md` `[IMPLEMENTED]`
- SVG engine details: `SVG_IMPLEMENTATION.md` `[IMPLEMENTED]`
- Grid and Cell utilities: See main `../README.md` (Grid and Cell Utilities section) `[IMPLEMENTED]`
- Extending GridCell per sketch (factory pattern): `GRID_CELL_EXTENSION.md` `[IMPLEMENTED]`
- Layer runtime helper pattern (single-active layer, multi-technique): `LAYER_RUNTIME_MANAGER.md` `[IMPLEMENTED]`
- Multi-technique runtime design notes: `MULTI_TECHNIQUE_RUNTIME_PLAN.md` `[IMPLEMENTED]`
- Pause/resume for animated layers (`runtime?.enablePause?.()`, `runtime?.paused`, `runtime?.onPauseChange`): see `../README.md` Pause/Resume section and `../composables/usePlayback.ts` `[IMPLEMENTED]`
- Container sizing and layout: `CONTAINER_UTILITY.md` `[IMPLEMENTED]`
- Lightweight canvas drawing API: `CANVAS_DRAWING_UTILITY.md` `[IMPLEMENTED]`
- Initial control randomization reference: `INITIAL_CONTROL_RANDOMIZATION.md` `[IMPLEMENTED]`
- Project config migration playbook: `PROJECT_CONFIG_MIGRATION_PLAYBOOK.md` `[IMPLEMENTED]`
- Migration audits: `audits/` (use `SKETCHNAME_MIGRATION_AUDIT.md`, e.g. `PEARLYMATS_MIGRATION_AUDIT.md`) `[IMPLEMENTED]`
- Legacy source manifests: `legacy-manifests/` `[IMPLEMENTED]`
- Utility gap backlog: `UTILITY_GAP_BACKLOG.md` (centralized reusable utility candidates from migrations) `[BACKLOG]`
- Standalone source export sketch (project/layer detachment): `STANDALONE_EXPORT_SKETCH.md` `[PROPOSAL]`
- History granularity (state/undo design): `HISTORY_GRANULARITY_PROPOSAL.md` `[PROPOSAL]`
- GridCell refactor plan: `GRIDCELL_REFACTOR_PLAN.md` `[PROPOSAL]`
- Framework backlog: `FRAMEWORK_BACKLOG.md` (viewer shell, controls UI, and runtime improvements) `[BACKLOG]`
- Agent prompt preambles and naming guidance: `AGENT_PROMPT_PREAMBLES.md`

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
