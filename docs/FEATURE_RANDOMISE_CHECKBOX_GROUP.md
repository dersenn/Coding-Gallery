# Feature: Checkbox-Group Support for Randomise Button

## Overview

Extends the existing randomise button to support `checkbox-group` controls, then uses that
to implement the pearlymats color shuffle. No new framework surface needed — the randomise
button already uses `batchUpdateControls` (URL-writing, `Math.random()`, user-triggered).

**Affects 3 files:**
- `components/ControlPanel.vue`
- `types/project.ts`
- `projects/pearlymats/project.config.ts`

---

## 1. `types/project.ts` — extend `CheckboxGroupControlDefinition`

Add two optional fields:

```ts
randomize?: boolean
randomCount?: { min: number; max: number }
```

`randomize` opts the control into the randomise button (consistent with slider/select/toggle).
`randomCount` sets the range of how many items to pick. If absent, the current selection
count is preserved.

---

## 2. `ControlPanel.vue` — add checkbox-group handling to `runRandomise`

### Step 1 — update `randomizableControls` computed

Add `CheckboxGroupControlDefinition` to the type guard so it's included:

```ts
const randomizableControls = computed(() =>
  flattenControls(props.controls).filter(
    (c): c is SliderControlDefinition | SelectControlDefinition | ToggleControlDefinition | CheckboxGroupControlDefinition =>
      (c.type === 'slider' || c.type === 'select' || c.type === 'toggle' || c.type === 'checkbox-group') && !!c.randomize
  )
)
```

### Step 2 — add two helper functions (module-level, outside the component)

```ts
const pickRandomIndices = (visibleCount: number, count: number): number[] => {
  const indices = Array.from({ length: visibleCount }, (_, i) => i)
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[indices[i], indices[j]] = [indices[j]!, indices[i]!]
  }
  return indices.slice(0, count).sort((a, b) => a - b)
}

const resolveCheckboxVisibleCount = (
  control: CheckboxGroupControlDefinition,
  values: ControlValues
): number | null => {
  if (control.visibleCountFromSelectKey) {
    const selectValue = String(values[control.visibleCountFromSelectKey] ?? '')
    const count = control.visibleCountBySelectValue?.[selectValue]
    if (typeof count === 'number') return count
  }
  if (typeof control.visibleCountFromKey === 'string') {
    const list = values[control.visibleCountFromKey]
    if (Array.isArray(list)) return list.length
  }
  return control.options.length
}
```

### Step 3 — add the checkbox-group branch inside `runRandomise`

Add after the existing `toggle` branch:

```ts
else if (control.type === 'checkbox-group') {
  const visibleCount = resolveCheckboxVisibleCount(control, controlValues.value)
  if (!visibleCount) continue
  const currentCount = (controlValues.value[control.key] as number[])?.length ?? 3
  const countRange = control.randomCount ?? { min: currentCount, max: currentCount }
  const count = Math.round(
    countRange.min + Math.random() * (countRange.max - countRange.min)
  )
  const clamped = Math.max(1, Math.min(count, visibleCount))
  updates.push({ key: control.key, value: pickRandomIndices(visibleCount, clamped) })
}
```

### Step 4 — add lock icon to checkbox-group in the template

The lock toggle is already rendered for `slider` and `select` in the label. Add it for
`checkbox-group` in the same label area:

```html
<UButton
  v-if="control.type === 'checkbox-group' && control.randomize"
  :icon="isLocked(control.key) ? 'i-heroicons-lock-closed' : 'i-heroicons-lock-open'"
  ...same props as the other lock buttons...
  @click="toggleLock(control.key)"
/>
```

---

## 3. `projects/pearlymats/project.config.ts` — opt in `selectedPaletteIndices`

Add `randomize` and `randomCount` to the existing control definition:

```ts
{
  type: 'checkbox-group',
  label: 'Palette Colors',
  key: 'selectedPaletteIndices',
  randomize: true,
  randomCount: { min: 2, max: 5 },
  // ...all other fields unchanged
}
```

---

## Result

The randomise button now shuffles the active color selection within the current palette,
respects the lock toggle if the user wants to pin specific colors, and writes to the URL
like any other user-triggered control change. No sketch-level code changes needed.

## Notes

- `pickRandomIndices` is the same shuffle-and-slice logic that previously lived in
  `ProjectRouteView` as `getRandomIndices`. It now lives in the right place.
- `resolveCheckboxVisibleCount` mirrors the logic already used in `ControlPanel` for
  rendering visible options — it should stay consistent with that.
- The `randomCount` range is intentionally separate from the palette size so the sketch
  can express aesthetic intent (e.g. "2–5 colors feels right for this piece") independent
  of how large the palette is.
