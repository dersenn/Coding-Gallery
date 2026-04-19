# Control Randomisation

Reference for the opt-in randomisation system in `ControlPanel`. Covers both the global
Randomise button and group-scoped randomise buttons, with lock mechanics for each.

---

## Overview

Two separate randomise mechanisms:

| Mechanism | How it's triggered | Scope |
|---|---|---|
| Global **Randomise** button | Top of panel, shown when any top-level/non-group-scoped control has `randomize: true` | All `randomize: true` controls not belonging to a randomize-group |
| Group **⟳** button | Header of a `ControlGroupDefinition` with `randomize: true` | All `randomize: true` controls within that group |

Controls that belong to a group with `randomize: true` are excluded from the global Randomise
button, so they don't get double-randomised.

---

## Schema

### On individual control definitions

```ts
randomize?: boolean          // opt this control into randomisation
randomRange?: { min: number; max: number }  // slider only — constrain random range
randomCount?: { min: number; max: number }  // checkbox-group only — vary selection count
```

Applies to: `slider`, `select`, `toggle`, `checkbox-group`.

`randomRange` is silently ignored on non-slider controls.
`randomCount` is silently ignored on non-checkbox-group controls.

### On `ControlGroupDefinition`

```ts
randomize?: boolean  // add a ⟳ button to this group's header
```

When set, controls in this group with `randomize: true` are handled by the group button
and excluded from the global Randomise button.

---

## Value generation rules

| Control type | Behaviour |
|---|---|
| `slider` | Random value within `randomRange ?? { min, max }` |
| `select` | Random pick from `options` |
| `toggle` | Coin toss — 50/50 |
| `checkbox-group` | See below |

### `checkbox-group` randomisation

1. Resolve visible item count from `visibleCountFromSelectKey`, `visibleCountFromKey`, or
   `options.length` — same resolution order used when rendering the list.
2. Carve out locked items (see Per-item locking). Locked items are always included in the
   result regardless of their current checked state.
3. Determine target selection count from `randomCount ?? { min: current, max: current }`.
   If no `randomCount` is set, the current selection count is preserved.
4. Fill remaining slots with a random pick from unlocked visible indices.
5. Result is always sorted ascending.

---

## Lock mechanics

### Key-level locking (slider, select)

A lock icon is shown on each randomisable `slider` and `select` control row. Clicking it
adds the control key to `lockedKeys` (a `Set<string>` in component state). Locked controls
are skipped entirely during randomisation.

Lock state is session-only UI state — not persisted, resets on page reload.

### Per-item locking (checkbox-group)

When a checkbox-group belongs to a randomize-group (`section.randomize === true`), each
item row shows a lock icon. Clicking it toggles that item's index in
`lockedCheckboxItems` (a `Map<controlKey, Set<number>>`).

A locked item is always included in the randomised result — regardless of whether it was
checked before randomising. Unlocked items are eligible for random selection to fill the
remaining slots.

---

## Example config

```ts
// Group-scoped randomise button + per-item lockable checkbox-group
{
  type: 'group',
  id: 'color',
  label: 'Color',
  randomize: true,          // ⟳ button in group header
  collapsible: true,
  defaultOpen: true,
  controls: [
    {
      type: 'select',
      key: 'palette',
      label: 'Palette',
      default: 'standard',
      options: [...]
      // no randomize — not shuffled by the group button
    },
    {
      type: 'checkbox-group',
      key: 'selectedColors',
      label: 'Colors',
      randomize: true,       // picked up by the group button
      // no randomCount — preserves current selection count
      default: [0, 1, 2],
      options: [...],
      visibleCountFromSelectKey: 'palette',
      visibleCountBySelectValue: { standard: 6, neon: 6 }
    }
  ]
}

// Global Randomise button — only appears because of these controls
{
  type: 'slider',
  key: 'density',
  label: 'Density',
  randomize: true,
  randomRange: { min: 5, max: 40 },  // narrower than min/max
  default: 20, min: 1, max: 100, step: 1
}
```

---

## Implementation files

| File | Role |
|---|---|
| `types/project.ts` | `randomize`, `randomRange`, `randomCount` on control definitions; `randomize` on `ControlGroupDefinition` |
| `components/ControlPanel.vue` | `randomizableControls`, `groupRandomizedKeys`, `runRandomise`, `runGroupRandomise`, `randomiseControlUpdate`, `pickRandom`, lock state refs, template |
