# Agent Prompt Preambles

Use these snippets at the top of sketch/migration requests to keep agent behavior consistent.

## Full version (default)

```text
Framework-first sketch task.

Follow project rules in `.cursor/rules/*`, especially:
- `framework-contract-sketches.mdc`
- `utility-first-sketches.mdc`
- `sketch-migration-playbook.mdc`

Policy:
1) Utility-first, not utility-only: use existing framework utilities/contracts for primitives before writing helpers (`types/project.ts`, `utils/generative.ts`, `utils/grid.ts`, `utils/cell.ts`, `utils/shortcuts.ts`, container/canvas/color/theme/download/svg helpers).
2) Custom sketch algorithms are allowed (e.g. Voronoi/composition/visual rules) when not semantically covered by existing utilities.
3) Use `Grid`/`GridCell` for grid-attached objects (topology/neighbors/indexing), and `Cell` for standalone positioned objects.
4) Do not add new helper wrappers for existing primitives unless they add sketch-specific semantics.
5) If overlap is possible, include:
   - utilities checked,
   - chosen path (`reuse` or `custom`),
   - classification (`keep` / `replace now` / `replace later`),
   - one-line rationale if custom logic is kept.
6) For migrations, always add/update:
   - an audit in `docs/audits/`,
   - a legacy source manifest in `docs/legacy-manifests/` (source path, destination path, status, notes),
   - and `docs/UTILITY_GAP_BACKLOG.md` with any new utility-gap candidates found during migration.
7) For custom assets (fonts/textures/media), use repo-served runtime paths (for example `public/assets/...`), and record source path + destination path + runtime path in the audit/manifest.
8) If a required custom asset is missing or licensing is unclear, stop and ask for the exact file/path before using a fallback.
9) Preserve original behavior intent first (especially for migrations).
10) If uncertain about utility fit or behavior intent, stop and ask 1-2 clarifying questions before coding.
```

## Short version (session starter)

```text
Framework-first sketch task: utility-first, not utility-only.
Use existing primitives first (`types/project.ts`, `utils/generative.ts`, `utils/grid.ts`, `utils/cell.ts`, `utils/shortcuts.ts`, container/canvas/color/theme/download/svg helpers), then keep custom visual algorithms when utilities are not a semantic fit.
Use `Grid`/`GridCell` for grid-attached objects and `Cell` for standalone positioned objects.
Do not add wrappers for existing primitives unless they add sketch-specific semantics.
For migrations, always include `docs/audits/*` + `docs/legacy-manifests/*`, and log any new utility-gap candidates in `docs/UTILITY_GAP_BACKLOG.md`.
For custom assets, use repo-served paths and document source + destination + runtime asset paths.
If unsure, ask 1-2 clarifying questions before coding; if overlap exists, report utilities checked + `reuse`/`custom` + `keep/replace now/replace later` + one-line rationale.
```

## Suggested usage

- Paste the short version at the start of a normal sketch session.
- Paste the full version for migration or larger refactors.
- Re-paste if agent behavior drifts mid-session.

## Naming and capitalization note

Use this naming convention for sketch files unless project rules require otherwise:

- `PascalCase` for classes/types/interfaces (for example `Anni1Grid`, `LayerRuntimeExtras`).
- `camelCase` for functions, variables, and local state (for example `layerManager`, `controlState`, `drawAnni2`).
- `UPPER_SNAKE_CASE` for module-level source-of-truth constants/registries (for example `LAYER_REGISTRY`, `LAYER_SETUP`).
- kebab-case string IDs for stable sketch/project identifiers (for example `'anni-1'`, `'vera-2'`).

## Shortcuts convention

Use a project-level core destructure from `shortcuts(utils)` by default:

- Core aliases to keep always available: `v`, `rnd`, `map`, `lerp`.
- Expand with extra aliases only when a sketch uses them.
- In layered sketches, bind shortcuts once in sketch runtime setup/factory scope (not inside per-draw helpers) when possible.
