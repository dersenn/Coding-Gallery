# Spec: Remove `entryFile` from project index

## Context

`entryFile` is a legacy concept from when project `index.ts` files carried real
runtime logic. All active projects have since migrated to declarative
`project.config.ts` + `sketches/*.js`. The remaining `index.ts` files are either
empty stubs (`export {}`) or belong to projects being deleted. The field no longer
serves a purpose and creates a false impression that index files are meaningful.

## Scope

Six touch points, in order of execution.

---

## 1. Delete stub `index.ts` files

Delete the following files. Each contains only the stub comment and `export {}` —
no runtime logic.

```
projects/anni/index.ts
projects/c4ta/legacy-3d/index.ts
projects/c4ta/legacy-p5/index.ts
projects/c4ta/svg/vera/index.ts
projects/grid-almighty/index.ts
projects/patchwork/index.ts
projects/pearlymats/index.ts
projects/svg-misc/index.ts
projects/this-is-water/index.ts
projects/voronoi/index.ts
```

Also delete the entire `projects/c4ta/p5/type-in-space/` folder (project is
broken and being removed).

---

## 2. Update `data/projects.json`

Remove the `entryFile` key from every entry. No other fields change.

Example — before:
```json
{
  "id": "patchwork",
  "configFile": "/projects/patchwork/project.config.ts",
  "entryFile": "/projects/patchwork/index.ts"
}
```

After:
```json
{
  "id": "patchwork",
  "configFile": "/projects/patchwork/project.config.ts"
}
```

Apply to all entries. The `type-in-space` entry is removed entirely (project deleted in step 1).

---

## 3. Update `scripts/generate-project-index.mjs`

Remove all `entryFile` logic.

**Remove** the `fileExists` helper function — it exists only to probe for
`index.ts`/`index.js`.

**Remove** the block that resolves `entryFile`:
```js
// Remove this entire block:
const entryTs = path.join(projectDir, 'index.ts')
const entryJs = path.join(projectDir, 'index.js')
let entryFile
if (await fileExists(entryTs)) {
  entryFile = toRootRelative(entryTs)
} else if (await fileExists(entryJs)) {
  entryFile = toRootRelative(entryJs)
} else {
  skipped.push(`${configRel}: no index.ts or index.js found`)
  continue
}
```

**Remove** `entryFile` from the entry object:
```js
// Before:
const entry = {
  ...
  configFile: configRel,
  entryFile
}

// After:
const entry = {
  ...
  configFile: configRel
}
```

The `access` import from `node:fs/promises` may become unused — remove it from
the import if so.

---

## 4. Update `scripts/validate-projects.mjs`

Remove all `entryFile` validation from `validateProjectIndexEntry`.

**Remove** these checks:
```js
if (typeof project.entryFile !== 'string' || !project.entryFile.startsWith('/projects/')) {
  throw new Error(`Project "${project.id}" must keep canonical entryFile under /projects/...`)
}
if (!/\/index\.(ts|js)$/.test(project.entryFile)) {
  throw new Error(`Project "${project.id}" entryFile must target index.ts or index.js`)
}

const entryAbs = path.join(ROOT, project.entryFile)
await ensureFileExists(entryAbs, `entryFile for project "${project.id}"`)
```

The `ensureFileExists` helper may become unused after removing these checks —
verify and remove it if so.

---

## 5. Update `types/project.ts`

`ProjectIndexEntry` already does not declare `entryFile`, so the type is
already correct. No change needed here.

However, `ProjectModule` is still exported with a `@deprecated` notice.
**Leave it for now** — removing it is a separate concern (it requires confirming
no sketch files still import it).

---

## 6. Update affected docs

These files reference `entryFile` in ways that will become stale:

- `docs/legacy-manifests/anni.md` — remove the `entryFile` line from "Canonical index pointers"
- `docs/PROJECT_CONFIG_MIGRATION_PLAYBOOK.md` — remove `entryFile` from the migration checklist and the "Migration target" section
- `docs/MULTI_TECHNIQUE_RUNTIME_PLAN.md` — remove the line "`data/projects.json` is a thin index with canonical `entryFile` + `configFile`"
- `projects/_Templates/_canvas2d-layer-template/README.md` — remove `entryFile` from the example JSON snippet in "Quick Start"
- `projects/_Templates/_canvas2d-template/README.md` — same

---

## Validation

After completing all steps, run:

```bash
npm run generate:projects -- --dry-run
npm run validate:projects
npx vue-tsc --noEmit
```

Expected: all pass with no errors. The dry-run output should show entries with
`configFile` only, no `entryFile`.

Also do a repo-wide search for the string `entryFile` to confirm no stray
references remain.
