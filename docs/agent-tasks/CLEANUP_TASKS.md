# Cleanup Tasks

Four independent tasks, each self-contained. Run `npx vue-tsc --noEmit` after
completing all of them.

---

## Task 1 — `utils/canvas.ts`: clean up halftone implementation

The `halftone` method has a commented-out alternative implementation (the
"Without Snapping" block) immediately below the live implementation. Remove it.

Then add a short comment above the row-loop explaining the design decision:

```ts
// Path2D is batched per row rather than as a single path for the whole region.
// A single large Path2D caused rendering hangs in Safari and Chrome at high
// dot counts — per-row batching avoids this while still reducing fill calls
// from one-per-dot to one-per-row.
this.withContext(ctx => {
  ctx.fillStyle = color
  for (let py = 0; py < h; py += step) {
    const rowPath = new Path2D()
    ...
```

No logic changes. Comment placement should be inside `withContext`, directly
above the `for` loop.

---

## Task 2 — `types/project.ts` + all `project.config.ts` files: remove duplicate technique fields

`ProjectDefinition` currently has two fields that overlap in intent:

```ts
techniques?: string[]        // written by all modern configs, never read at runtime
supportedTechniques?: string[]  // read by ProjectViewer as legacy fallback, also written by legacy wrapper configs
```

`techniques` is set in every modern `project.config.ts` but is not consumed
anywhere in the runtime. `supportedTechniques` has two consumers in
`ProjectViewer.vue` — both as fallback paths for projects without `sketches[]`.
Since all remaining active projects use `sketches[]`, both fallback paths are
now dead.

### Step 1 — verify before removing

Before touching anything, confirm that every entry in `data/projects.json` has
a corresponding `project.config.ts` that defines a non-empty `sketches` array.
Run `npm run validate:projects` and check there are no errors. If any project
lacks `sketches[]`, stop and flag it rather than proceeding.

### Step 2 — remove from `types/project.ts`

In `ProjectDefinition`, remove both fields:

```ts
// Remove:
techniques?: string[]
// Remove:
supportedTechniques?: string[]
```

Leave `defaultTechnique?: Technique` — it is still used by the bootstrap to
resolve which sketch is active on first load.

Also remove `supportedTechniques` from `ProjectModule` (the deprecated
interface):

```ts
// Remove from ProjectModule:
supportedTechniques?: Technique[]
```

### Step 3 — remove fallback code from `components/ProjectViewer.vue`

Locate the two places where `definition?.supportedTechniques` is read and
remove the fallback branches. Concretely:

In `hasSvgTechnique`:
```ts
// Before:
const hasSvgTechnique = computed(() => {
  const definition = activeDefinition.value
  const sketches = definition?.sketches ?? []
  if (sketches.some((sketch) => sketch.technique === 'svg')) return true
  const supported = definition?.supportedTechniques ?? []
  return supported.includes('svg')
})

// After:
const hasSvgTechnique = computed(() => {
  const sketches = activeDefinition.value?.sketches ?? []
  return sketches.some((sketch) => sketch.technique === 'svg')
})
```

Apply the same pattern to `hasCanvas2dTechnique` and the `runtimeCapabilities`
computed that also falls back to `supportedTechniques`.

### Step 4 — remove from all `project.config.ts` files

Search the repo for `techniques:` and `supportedTechniques:` in
`project.config.ts` files. Remove both fields from every definition object.
Also remove the associated const declarations where they exist, for example:

```ts
// Remove these:
const TECHNIQUES = ['canvas2d'] as const
const DEFAULT_TECHNIQUE = 'canvas2d' as const
```

```ts
// Remove from definition object:
techniques: [...TECHNIQUES],
// Remove:
supportedTechniques: legacyModule.supportedTechniques,  // in legacy wrapper configs
```

`defaultTechnique` field and its const can stay if used.

### Step 5 — fix the `satisfies` constraints in `project.config.ts` files

Several configs use:
```ts
} satisfies Omit<ProjectDefinition, 'init' | 'controls' | ... | 'techniques'>
```

Remove `'techniques'` and `'supportedTechniques'` from the `Omit` list in each
file where they appear, since those fields no longer exist on `ProjectDefinition`.

---

## Task 3 — `docs/CANVAS_DRAWING_UTILITY.md`: remove stale p5 recommendation

In the Notes section, find and remove this line:

> p5 remains fully supported and is still a recommended option for rapid prototyping.

Do not replace it with anything. The surrounding notes still make sense without it.

---

## Task 4 — `docs/FEATURE_SET_CONTROLS.md`: rewrite as reference doc

The file is currently written as an implementation spec ("Add a `setControls`
function...", "Step 1 — update...", etc.). The feature is fully implemented.
Replace the entire file content with a reference doc. Use the following as the
target:

```md
# `context.setControls`

Programmatically update control values from inside a sketch without touching
the URL or browser history. Intended for init-time setup: seed-deterministic
randomisation, viewport-responsive defaults, or any one-time override.

## Signature

```ts
context.setControls(updates: Array<{ key: string; value: ControlValue }>): void
```

## Usage

```js
export function draw(context) {
  const { canvas, controls, utils, setControls } = context

  // One-time init — call at the top of draw(), not inside runtime.loop()
  utils.seed.reset()
  setControls([
    { key: 'density', value: utils.seed.randomRange(0.1, 0.9) },
    { key: 'columns', value: canvas.w > canvas.h ? 12 : 6 },
  ])

  // ... rest of sketch
}
```

## Behaviour

- Values are applied immediately and reflected in the control panel UI.
- The normal `onControlChange` callback fires, so a redraw triggers if called
  from `draw()`.
- No URL change occurs. Seeds and control state remain independent.
- Calling `setControls` on every frame or inside `runtime.loop()` is wasteful —
  use it for one-time setup only.

## Implementation

- `silentUpdateControls` in `composables/useControls.ts` — writes values without
  calling `syncQueryWithControl`.
- Wired into `ProjectContext` in `components/ProjectViewer.vue`.
- `setControls` on `ProjectContext` in `types/project.ts`.
```

No changes needed to `docs/INDEX.md` — the entry for this file is already
correct.

---

## Validation

```bash
npx vue-tsc --noEmit
npm run validate:projects
```

Both should pass cleanly. Also do a repo-wide search for `supportedTechniques`
and `techniques:` to confirm no stray references remain in runtime or config
files.
