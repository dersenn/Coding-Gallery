# Initial Control Randomization

Reference for randomizing control defaults on project load/reload.

## Where initialization currently happens

Control defaults are initialized in `useControls` from control schema defaults, then overridden by URL query values.

- Default assignment: `composables/useControls.ts` (`buildControlValuesFromQuery`, `buildScopedControlValuesFromQuery`)
- Initialization call site: `components/ProjectViewer.vue` (`loadProject` -> `initializeScopedControls(...)`)

In practice, the order is:

1. `project.config.ts` controls are normalized to shared/layer scopes.
2. `initializeScopedControls(...)` builds values from defaults.
3. Query params override those defaults.

## Best place to inject random defaults

Inject randomized defaults **in `ProjectViewer.loadProject()` before `initializeScopedControls(...)`**.

Why:

- It affects first-run values cleanly.
- It keeps randomization in one place for all techniques/layers.
- It does not require per-layer draw/init hacks.

## Important query behavior

Query params currently win over defaults. If a key exists in the URL, that value overrides any randomized default.

So randomization on reload only applies when:

- there is no query value for that key, or
- query values are intentionally ignored/cleared, or
- randomization is explicitly gated (for example `?randomize=1`).

## Two implementation patterns

### 1) Project-specific quick path

Inside `loadProject()`:

- detect target project (`definition.id`),
- clone the scoped controls schema,
- rewrite selected `control.default` values using seeded or non-seeded random,
- pass the modified schema into `initializeScopedControls(...)`.

Use this when you only need behavior for one project (for example `growing-things`).

### 2) Reusable framework hook

Add an optional project-level hook in `ProjectDefinition` (for example `resolveInitialControls(...)`) and call it in `ProjectViewer` before control initialization.

Use this for long-term support across many projects with per-project policies.

## Recommendation

Start with project-specific injection for fast iteration. Promote to a reusable hook only when at least 2-3 projects need randomized initial controls.
