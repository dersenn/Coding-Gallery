# Documentation Index

Use this folder for supporting docs while keeping the repository root focused on core app files.

## Start here

- Main project reference: `../README.md`

## Topic references

- Seed system details: `SEED_SYSTEM.md`
- SVG engine details: `SVG_IMPLEMENTATION.md`
- Grid and Cell utilities: See main `../README.md` (Grid and Cell Utilities section)
- Extending GridCell per sketch (factory pattern): `GRID_CELL_EXTENSION.md`
- Migration audits: `audits/` (use `SKETCHNAME_MIGRATION_AUDIT.md`, e.g. `PEARLYMATS_MIGRATION_AUDIT.md`)
- Legacy source manifests: `legacy-manifests/`
- Utility gap backlog: `UTILITY_GAP_BACKLOG.md` (centralized reusable utility candidates from migrations)
- Layer runtime helper pattern (single-active SVG layers): `LAYER_RUNTIME_MANAGER.md`
- Framework backlog: `FRAMEWORK_BACKLOG.md` (viewer shell, controls UI, and runtime improvements)
- Open backlog: add `validate:projects` metadata/file drift checker (see checklist in main `../README.md` and project rules)
- Agent prompt preambles and naming guidance: `AGENT_PROMPT_PREAMBLES.md`

## Framework-first quick reference

- Framework contract and module surface: `../types/project.ts`
- Main project/runtime and controls/actions docs: `../README.md`
- Seed determinism rules: `SEED_SYSTEM.md`
- Canvas sizing and layout: `CANVAS_UTILITY.md`
- Utility families to check before reimplementing primitives:
  - `../utils/generative.ts` (seed/noise/math/vec/array)
  - `../utils/grid.ts` and `../utils/cell.ts` (grid topology and neighbors)
  - `../utils/shortcuts.ts` (sketch ergonomics)
  - `../utils/canvas.ts` (canvas sizing: full / square / ratio / padding)
  - `../utils/color.ts`, `../utils/theme.ts`, `../utils/download.ts`, `../utils/svg.ts`
