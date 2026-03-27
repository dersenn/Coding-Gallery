# Project Config Migration Playbook

Practical checklist for migrating projects to the canonical `project.config.ts`
model with a thin `data/projects.json` index.

Use this for one-project migrations and batch migrations.

## Migration target

- `project.config.ts` is the canonical runtime definition.
- `index.ts` is optional runtime escape hatch; prefer minimal stub when unused.
- `data/projects.json` remains thin index metadata + pointers:
  - `configFile`
  - canonical `entryFile` (for structure/taxonomy validation)

## Scope assumptions

- Keep draw/algorithm logic in `sketches/*.js|ts` (or sketch-local modules).
- Keep runtime orchestration in `runtime/`.
- Do not move Nuxt convention files out of `plugins/` or `server/api/`.

## Per-project migration checklist

1. Create or update `projects/.../project.config.ts`:
   - include project metadata (`id`, `title`, `description`, `date`, `tags`, optional visibility/theme flags)
   - include declarative runtime fields (`container`, `techniques`, `defaultTechnique`, `controls`, `actions`, `sketches`)
2. Ensure each `sketches[]` entry has:
   - `id`
   - `technique` (`svg`, `canvas2d`, or supported set)
   - `container` where needed
   - `module` path under the same project folder
3. Keep `index.ts` policy:
   - if custom orchestration not required, keep minimal stub (`export {}`) for canonical `entryFile`
   - if required, keep only focused escape-hatch logic
4. Update `data/projects.json` entry:
   - set `configFile` to `/projects/.../project.config.ts`
   - keep canonical `entryFile` to `/projects/.../index.ts|js`
   - keep thin metadata fields only
5. Validate action/control behavior:
   - sketch-scoped action visibility via `visibleWhenSelect*`
   - defaults behavior preserves active sketch when intended

## Validation gates (required)

Run after each migration:

```bash
npm run validate:projects
npx vue-tsc --noEmit
```

## Smoke test checklist (required)

For the migrated route:

- route loads without runtime errors
- controls panel opens and reflects config definitions
- sketch selection works
- download actions shown only for relevant sketch/technique
- defaults/reset behavior matches expectation (especially active sketch preservation)

## Suggested batching strategy

- Migrate 1 representative project per technique family first.
- Then migrate in small batches by folder:
  - `projects/svg/*`
  - `projects/c4ta/svg/*`
  - `projects/c4ta/p5/*` (when/if p5 runtime path is expanded)
  - templates last
- Run gates after each batch, not only at the end.

## Failure modes and fixes

- **Config not found at runtime**
  - verify `configFile` path in `data/projects.json`
  - verify file matches glob-resolvable path under `projects/`
- **Sketch module not found**
  - ensure `sketches[].module` resolves under project folder
  - check extension fallback (`.js` vs `.ts`) in sketch module paths
- **Validation drift errors**
  - sync index metadata fields with config metadata
  - keep `entryFile` and `configFile` paths canonical and existing

## Conventions to keep migrations clean

- Prefer one-file declarative config unless declarations are reused across projects.
- Avoid putting draw code into `project.config.ts`.
- Keep comments in config short and intent-focused.
- Keep project-specific runtime exceptions explicit and minimal.
