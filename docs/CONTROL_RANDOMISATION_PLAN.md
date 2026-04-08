# Control Randomisation

Adds opt-in per-control randomisation to the controls panel, with a per-row lock toggle to exclude specific controls from randomisation.

---

## Goals

- Allow rapid iteration over control values without manually adjusting each one
- Keep randomisation opt-in per control — wild results from accidental randomisation of structural controls (e.g. `activeSketch`, grid counts) are undesirable
- Lock state is session-only UI state, not persisted anywhere
- No changes to seed logic, runtime, or sketch modules

---

## Schema Changes

Two optional fields are added to control definitions. Both are opt-in and have no effect if absent.

### `randomize?: boolean`

Marks a control as eligible for randomisation. Defaults to `false` (not randomisable).

Applies to: `number`, `select`, `boolean` control types.

```ts
{
  type: 'number',
  key: 'speed',
  label: 'Speed',
  min: 0,
  max: 100,
  step: 1,
  default: 50,
  randomize: true
}
```

### `randomRange?: { min: number; max: number }`

Optional override for the random value range on `number` controls. When present, randomisation draws from this range instead of the control's own `min`/`max`. Useful when the full control range is valid for manual use but too extreme for randomisation.

Silently ignored on `select` and `boolean` controls.

```ts
{
  type: 'number',
  key: 'density',
  label: 'Density',
  min: 0,
  max: 1000,
  step: 1,
  default: 200,
  randomize: true,
  randomRange: { min: 50, max: 400 }
}
```

---

## Value Generation Rules

| Control type | Behaviour |
|---|---|
| `number` | Random value within `randomRange ?? { min, max }`, snapped to `step` |
| `select` | Random pick from `options` array |
| `boolean` | Coin toss — 50/50 |
| Any locked control | Skipped entirely |
| `randomize` absent or `false` | Skipped entirely |

Step snapping for numbers: `Math.round(value / step) * step`, then clamped to the effective range.

---

## UI Changes

### Randomise button

A single **Randomise** button added to the controls panel. On click, iterates all controls with `randomize: true` that are not currently locked, generates a new value, and calls `onControlChange` with the full updated control state.

Placement: top or bottom of the controls panel, consistent with existing action button placement.

### Lock toggle

A lock icon button on each control row where `randomize: true`. Toggles that control's key in a `Set<string>` held in the controls panel component state.

- Locked controls render the lock icon in its "closed" state
- Unlocked (but randomisable) controls render it in its "open" state
- Controls with `randomize` absent or `false` do not render a lock toggle at all

Lock state is local component state only — not persisted to `controls`, not included in exports, resets on page reload.

---

## What Does Not Change

- Seed logic and the draw-time PRNG are untouched
- `onControlChange` is called exactly as it would be for a manual control interaction — the runtime sees no difference
- Control definitions that omit `randomize` behave identically to today
- Export/download metadata is unaffected (the resulting control values are exported as usual)
