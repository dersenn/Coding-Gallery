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
1) Use existing framework utilities/contracts for primitives (seed/noise, grid/cell neighbors/indexing, dist/vector math, color, theme/export, controls/actions lifecycle).
2) Custom sketch algorithms are allowed (e.g. Voronoi/composition/visual rules) when not semantically covered by existing utilities.
3) Do not add new helper wrappers for existing primitives unless they add sketch-specific semantics.
4) If overlap is possible, include:
   - utilities checked,
   - chosen path (`use existing` or `custom algorithm`),
   - classification (`keep` / `replace now` / `replace later`),
   - one-line rationale if custom logic is kept.
5) For migrations, always add/update:
   - an audit in `docs/audits/`,
   - a legacy source manifest in `docs/legacy-manifests/` (source path, destination path, status, notes).
6) For custom assets (fonts/textures/media), use repo-served runtime paths (for example `public/assets/...`), and record source path + destination path + runtime path in the audit/manifest.
7) If a required custom asset is missing or licensing is unclear, stop and ask for the exact file/path before using a fallback.
8) Preserve original behavior intent first (especially for migrations).
9) If uncertain about utility fit or behavior intent, stop and ask 1-2 clarifying questions before coding.
```

## Short version (session starter)

```text
Framework-first sketch task: use existing framework utilities for primitives, but keep custom visual algorithms when utilities are not a semantic fit.
Do not add wrappers for seed/dist/neighbor/grid/color/theme/export primitives unless they add sketch-specific semantics.
For migrations, always include `docs/audits/*` + `docs/legacy-manifests/*`.
For custom assets, use repo-served paths and document source + destination + runtime asset paths.
If unsure, ask 1-2 clarifying questions before coding; if overlap exists, report utilities checked + `use existing`/`custom algorithm` + `keep/replace now/replace later`.
```

## Suggested usage

- Paste the short version at the start of a normal sketch session.
- Paste the full version for migration or larger refactors.
- Re-paste if agent behavior drifts mid-session.
