# Feature: `setControls` on `ProjectContext`

## Overview

Add a `setControls` function to `ProjectContext` that sketches can call to update control values
without touching the URL or browser history. Covers init-time randomisation, viewport-responsive
defaults, and any other programmatic overrides.

**Affects 3 files:**
- `composables/useControls.ts`
- `types/project.ts` (verify exact path before editing)
- `components/ProjectViewer.vue`

---

## 1. `useControls.ts` — add `silentUpdateControls`

Add a new function alongside `batchUpdateControls`. It shares the same state-writing logic but
skips `syncQueryWithControl` entirely.

```ts
const silentUpdateControls = (updates: Array<{ key: string; value: ControlValue }>) => {
  const activeSketchId = resolveScopedActiveLayer()
  for (const { key, value } of updates) {
    const constrained = applyControlConstraints(key, value)
    if (key === 'activeSketch' || isSharedControlKey(key)) {
      scopedControlValues.value.shared[key] = constrained
    } else {
      const scopedLayerId = resolveControlLayerScope(key, activeSketchId)
      if (scopedLayerId) {
        if (!scopedControlValues.value.sketches[scopedLayerId]) {
          scopedControlValues.value.sketches[scopedLayerId] = {}
        }
        scopedControlValues.value.sketches[scopedLayerId]![key] = constrained
      } else {
        scopedControlValues.value.shared[key] = constrained
      }
    }
  }
  applyEffectiveControlValues(activeSketchId)
}
```

Add to the return object at the bottom of `useControls`:

```ts
return {
  // ...existing exports unchanged...
  silentUpdateControls,
}
```

> **Do not modify `batchUpdateControls`** — it is intentionally URL-syncing and is used by the
> control panel.

---

## 2. `types/project.ts` — extend `ProjectContext`

Locate the `ProjectContext` interface and add one property:

```ts
setControls: (updates: Array<{ key: string; value: ControlValue }>) => void
```

---

## 3. `ProjectViewer.vue` — wire into context

**Step 1.** Destructure `silentUpdateControls` from `useControls()` at the top of the component,
alongside the existing destructure:

```ts
const { controlValues, initializeScopedControls, silentUpdateControls } = useControls()
```

**Step 2.** In `loadProject`, inside the context object passed to `initFromProjectDefinition`,
add alongside `onControlChange` and `registerAction`:

```ts
setControls: (updates) => {
  silentUpdateControls(updates)
},
```

---

## Usage in a sketch

```ts
// Init-time randomisation
context.setControls([
  { key: 'density', value: Math.random() * 0.8 + 0.1 },
  { key: 'rotation', value: Math.floor(Math.random() * 4) * 90 },
])

// Viewport-responsive defaults
const isLandscape = frame.width > frame.height
context.setControls([
  { key: 'columns', value: isLandscape ? 12 : 6 },
])
```

Values reflect immediately in the control panel UI and trigger the normal `onControlChange`
callback, so a redraw fires if called from `init`. No URL changes.

---

## Notes

- `silentUpdateControls` is intentionally a separate function, not `batchUpdateControls` with a
  flag — keeping them separate avoids a conditional and makes intent explicit.
- No changes needed in `projectBootstrap.ts` — context is passed through as-is from
  `ProjectViewer`, and sketch modules already receive it in full.
- `setControls` called from `draw()` on every frame would be wasteful — it's intended for
  one-time setup (init, orientation change, etc.), not per-frame logic.
