# Browser History Granularity Proposal

> **Status: PROPOSAL — not yet implemented.**
> Design is complete but no code has been written. See `Implementation Outline (Future)` section below.

## Context

Browser Back/Forward now navigates within a sketch by tracking control and seed URL changes.  
This improves in-sketch navigation, but history can still become noisy depending on how often controls change.

## Goal

Refine history behavior so Back/Forward feels intentional:

- Keep important milestones in history.
- Avoid excessive intermediate states for high-frequency interactions.
- Preserve current URL-driven state restoration behavior.

## Proposed Strategy

### 1) Classify control updates by interaction type

- **Milestone updates (`push`)**
  - Seed changes (`new-seed`)
  - Reset/default actions
  - Discrete controls (select, toggle, checkbox-group)
  - Explicit randomize/reload shortcuts
- **Transient updates (`replace` then optional `push`)**
  - Continuous controls (sliders while dragging, color pickers while dragging)
  - Commit one final `push` when interaction ends (`change`, pointer up, blur)

### 2) Add optional per-control history policy

Introduce an optional control metadata field (for future use):

- `history: 'milestone' | 'transient' | 'silent'`

Suggested defaults:

- `slider`, `color` -> `transient`
- `toggle`, `select`, `checkbox-group`, `color-list` add/remove -> `milestone`
- `silent` reserved for internal/derived controls that should never create entries

### 3) Centralize history decision logic

Keep a single helper in `useControls` that maps:

- control type + policy + event phase (`input` vs `change`)
- to router operation (`push` or `replace`)

This avoids view-level inconsistency and keeps behavior predictable across sketches.

## Implementation Outline (Future)

1. Extend control type definitions to support optional `history` metadata.
2. Update `ControlPanel` handlers to pass interaction phase (`input`/`commit`) uniformly.
3. Update `useControls` to resolve final history mode from metadata + phase.
4. Keep route query watcher re-sync as source of truth for Back/Forward rendering.
5. Add a brief doc section in controls documentation with recommended defaults.

## Acceptance Criteria

- Back from `/:id` (or legacy `/project/:id`) steps through meaningful sketch states before leaving the sketch.
- Dragging a slider does not create dozens of Back steps.
- Final value after drag is reachable via Back/Forward.
- Seed/reset/randomize remain individually navigable.
- Existing deep-link URLs still restore the same sketch state.

## Risks / Notes

- Over-aggressive `replace` can make users feel their actions are "missing" from history.
- Over-aggressive `push` can make Back tedious.
- Policy should remain simple and consistent project-wide; avoid per-sketch one-off behavior unless needed.
