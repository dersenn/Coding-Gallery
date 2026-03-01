# Project Structure Sketch + Plan

## Goal

Scale the `projects/` directory without breaking runtime loading or adding maintenance overhead.

## Structure Sketch

### Proposed folder layout

```text
projects/
  _Templates/
    _template/index.ts
    _svg-template/index.ts
    _svg-animated-template/index.ts
  p5/
    <project-name>/index.ts
  svg/
    <project-name>/index.ts
  c4ta/
    p5/
      <project-name>/index.ts
    svg/
      <project-name>/index.ts
```

### Metadata sketch (`data/projects.json`)

- Keep a flat array of projects.
- Keep route identity in `id` (do not derive from folder path).
- Use `entryFile` as source of truth for module loading.
- Use tags for grouping/filtering (medium + provenance):
  - `p5js`, `svg`, `c4ta`, `template`
- Keep `hidden: true` for templates.

Example entry:

```json
{
  "id": "pearlymats",
  "title": "Pearly Mats",
  "entryFile": "/projects/svg/pearlymats/index.ts",
  "tags": ["svg", "generative"],
  "hidden": false
}
```

## Runtime Compatibility Notes

- Current loader supports nested folders via recursive glob:
  - `~/projects/**/index.ts`
- `entryFile` must exactly match the generated module key path.
- Any `index.ts` under `projects/` is considered loadable; avoid placing non-project helper folders there.

## Implementation Plan

### Phase 1: Convention adoption

1. Create medium folders under `projects/`: `p5/`, `svg/`, and `c4ta/` with `c4ta/p5` + `c4ta/svg` subdivisions.
2. Move existing real projects into the medium folders.
3. Keep templates under `projects/_Templates/`.
4. Update corresponding `entryFile` paths in `data/projects.json`.

### Phase 2: Gallery filtering UX (optional but recommended)

1. Add/normalize medium tags (`p5js`, `svg`, `c4ta`, `template`) for all entries.
2. Keep gallery default to visible projects (`!hidden`).
3. Add optional filter controls (e.g. chips/tabs) driven by tags and/or libraries.

### Phase 3: Validation guardrail (recommended)

Add a script to validate metadata against files before runtime:

1. Collect all filesystem project modules via glob (`projects/**/index.ts`).
2. Parse `data/projects.json`.
3. Validate:
   - `entryFile` exists on disk.
   - `id` values are unique.
   - `title` is non-empty.
   - Template-tagged entries are `hidden: true` (warning or error).
4. Exit non-zero on error so CI/pre-commit can catch drift.

## Validator Checklist

- [ ] Every `entryFile` in JSON resolves to a real file.
- [ ] Every real project module appears in JSON (or is intentionally ignored).
- [ ] No duplicate `id`.
- [ ] No duplicate `entryFile`.
- [ ] `hidden` policy is consistent with `template` tag.
- [ ] Optional: enforce allowed top-level buckets (`p5`, `svg`, `c4ta`, `_Templates`).

## Risks and Mitigations

- **Risk:** Path drift after moving folders.
  - **Mitigation:** Run validator script in CI or pre-commit.
- **Risk:** Accidental inclusion of non-project `index.ts`.
  - **Mitigation:** Keep non-project code outside `projects/`; reserve `index.ts` for project entry modules only.
- **Risk:** Broken direct routes if `id` changes.
  - **Mitigation:** Treat `id` as stable permalink once published.

## Suggested Next Step

Implement Phase 3 first (validator), then refactor folders in Phase 1 with immediate feedback from the checker.

## Validator Script Spec

### Purpose

Provide a single command that verifies `data/projects.json` and filesystem entries stay aligned as the `projects/` tree grows.

### File location

- Suggested path: `scripts/validate-projects.ts`

### Command contract

- CLI command:
  - `npm run validate:projects`
- Exit codes:
  - `0`: all checks pass
  - `1`: one or more errors found

### Inputs

- Metadata source: `data/projects.json`
- Filesystem source: all files matching `projects/**/index.ts`

### Normalization rules

Before comparison, normalize both sides to the same style:

1. Convert to leading-slash web path style (e.g. `/projects/svg/pearlymats/index.ts`).
2. Use forward slashes on all platforms.
3. Preserve case sensitivity when comparing.

### Validation rules

#### Errors (fail the command)

1. **Missing entry module**
   - Any JSON `entryFile` that does not exist in filesystem glob results.
2. **Orphan module**
   - Any filesystem `projects/**/index.ts` not referenced by any JSON `entryFile`.
3. **Duplicate `id`**
   - More than one project uses the same `id`.
4. **Duplicate `entryFile`**
   - More than one project points to the same `entryFile`.
5. **Invalid shape**
   - Missing required fields (`id`, `title`, `entryFile`) or empty strings.
6. **Invalid top-level bucket** (optional strict mode)
   - `entryFile` not under one of: `p5`, `svg`, `c4ta`, `_Templates`.

#### Warnings (do not fail by default)

1. `tags` includes `template` but `hidden` is not `true`.
2. Project is under `_Templates` but `hidden` is not `true`.
3. Project is under medium folder but has no matching medium tag (e.g. path under `svg/` without `svg` tag).

### Output format

- Print summary first:
  - `Found N projects.json entries`
  - `Found M filesystem modules`
- Then grouped sections:
  - `ERRORS (count)`
  - `WARNINGS (count)`
- Use stable, grep-friendly lines:
  - `ERROR missing-entryFile id=<id> entryFile=<path>`
  - `ERROR orphan-module path=<path>`
  - `ERROR duplicate-id id=<id> indexes=<i,j>`
  - `WARN template-not-hidden id=<id> entryFile=<path>`

### Recommended npm scripts

```json
{
  "scripts": {
    "validate:projects": "tsx scripts/validate-projects.ts",
    "prebuild": "npm run validate:projects"
  }
}
```

If you do not want `prebuild` to fail for warnings, fail only on `ERROR` lines.

### Pseudocode sketch

```ts
load projectsJson
glob projectIndexFiles
normalize both sets to '/projects/.../index.ts'

build maps:
  byId
  byEntryFile

for each json project:
  validate required fields
  validate entryFile exists
  validate duplicates
  apply warning policies

for each filesystem module:
  ensure it is referenced by json

print errors/warnings
process.exit(errors.length ? 1 : 0)
```

### CI integration sketch

- Run `npm run validate:projects` in CI on pull requests.
- Optional pre-commit hook:
  - run validator only when files under `projects/` or `data/projects.json` changed.
- Keep the script fast and deterministic so it is safe to run frequently.
