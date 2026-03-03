# Framework Backlog

Improvements and features for the gallery framework itself (runtime, UI chrome,
viewer shell, controls panel). Distinct from `UTILITY_GAP_BACKLOG.md`, which
tracks reusable sketch utilities.

## How to use

- Add items here when a framework-level gap is discovered.
- Keep status as one of: `candidate`, `in-design`, `in-progress`, `implemented`, `deferred`.
- Group by area of the framework (viewer shell, controls, navigation, etc.).

---

## Viewer shell

### Mobile-friendly shortcut actions

- ID: `mobile-shortcut-actions`
- Status: `candidate`
- Priority: **high**
- Area: `components/ProjectRouteView.vue`

**Problem**  
The bottom shortcut pill (`project-shortcut-pill`) shows `[n] new seed`,
`[r] reload`, `[d] default settings`, and conditionally `[s] save SVG`.
These are currently driven entirely by the `handleKeyboardShortcut` listener
(`keydown` on `window`). On mobile there is no keyboard, so none of the core
actions are reachable without opening the control panel — and `r` (reload)
isn't in the control panel at all.

**Proposed approach**  
Convert the shortcut pill into a row of tappable action buttons on touch devices
while keeping the existing text-hint appearance on pointer devices.

Concrete design options (pick one or combine):

1. **Tap-target pill items** — each `<span>` inside the pill becomes a `<button>`
   on touch. On hover-capable devices the current text-hint style is preserved; on
   touch/coarse-pointer devices the buttons are rendered with generous tap targets
   (min 44 × 44 px) and a subtle active state.
   - Detection: CSS `@media (pointer: coarse)` for styling; optionally the same
     check in Vue with `window.matchMedia('(pointer: coarse)')` to swap the
     `pointer-events: none` off the pill container.

2. **Floating action bar** — replace the pill entirely with a compact FAB row
   pinned to the bottom-centre. Each action gets an icon button. On coarse-pointer
   the bar is always visible; on fine-pointer it only appears on hover/focus (or
   stays visible, matching current behaviour).

3. **Swipe-up sheet** — on mobile a single small handle at the bottom expands a
   bottom sheet with labelled action buttons. Shortcut hints remain visible in
   collapsed state.

**Key actions to expose**

| Key | Action | Notes |
|-----|--------|-------|
| `n` | New seed | Always |
| `r` | Reload | Always (not currently in ControlPanel) |
| `d` | Default settings | Only when `canShowControlsUI` |
| `s` | Save SVG | Only when `hasSvgDownloadAction` |

**Files affected**
- `components/ProjectRouteView.vue` — shortcut pill markup (lines 67–83),
  `shortcutHints` computed (lines 128–140), `handleKeyboardShortcut` handler
  (lines 267–314), `handleControlAction` dispatcher (lines 193–213).

**Notes**
- `pointer-events-none` is currently on the pill wrapper; remove or scope it
  when buttons are active.
- Seed display can stay read-only text alongside the action buttons.
- Keep the `keydown` handler intact — keyboard shortcuts should remain
  functional on desktop.
- Existing control panel toggle (top-right) already works on mobile; this
  backlog item is specifically about the core stateless actions that bypass
  the panel.
