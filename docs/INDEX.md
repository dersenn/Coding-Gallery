# Documentation Index

Use this folder for supporting docs while keeping the repository root focused on core app files.

## Start here

- First run and first project: `QUICK_START.md`
- Main project reference: `../README.md`

## Topic references

- Seed system details: `SEED_SYSTEM.md`
- SVG engine details: `SVG_IMPLEMENTATION.md`
- Grid and Cell utilities: See main `../README.md` (Grid and Cell Utilities section)
- Migration audits: `audits/` (use `SKETCHNAME_MIGRATION_AUDIT.md`, e.g. `PEARLYMATS_MIGRATION_AUDIT.md`)
- Migration history: `IMPLEMENTATION_SUMMARY.md`
- Future project-structure plan: `PROJECT_STRUCTURE_PLAN.md`

## Framework-first quick reference

- Framework contract and module surface: `../types/project.ts`
- Main project/runtime and controls/actions docs: `../README.md`
- Seed determinism rules: `SEED_SYSTEM.md`
- Utility families to check before reimplementing primitives:
  - `../utils/generative.ts` (seed/noise/math/vec/array)
  - `../utils/grid.ts` and `../utils/cell.ts` (grid topology and neighbors)
  - `../utils/shortcuts.ts` (sketch ergonomics)
  - `../utils/color.ts`, `../utils/theme.ts`, `../utils/download.ts`, `../utils/svg.ts`
