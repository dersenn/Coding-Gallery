# Framework Backlog

Improvements and features for the gallery framework itself (runtime, UI chrome,
viewer shell, controls panel). Distinct from `UTILITY_GAP_BACKLOG.md`, which
tracks reusable sketch utilities.

## How to use

- Add items here when a framework-level gap is discovered.
- Keep status as one of: `candidate`, `in-design`, `in-progress`, `implemented`, `deferred`.
- Group by area of the framework (viewer shell, controls, navigation, etc.).

---

## Theme / colors

### Revisit default theme palette (primary RGB vs curated)

- ID: `theme-palette-primary-rgb`
- Status: `candidate`
- Priority: **low**
- Area: `utils/theme.ts`

**Problem**  
The dark theme uses primary RGB colors (`#f00`, `#0f0`, `#00f`, `#ff0`, `#0ff`, `#f0f`) in its palette. The light theme uses a curated Tailwind-style palette instead. Projects with `prefersTheme: 'light'` never see the primary RGB palette. There is no way to explicitly choose “primary RGB” vs “curated” independent of light/dark preference.

**Questions to resolve**
- Should primary RGB remain the dark default, or should both themes offer a “primary” vs “curated” option?
- Is the current split (dark = primary, light = curated) intentional or accidental?
- Should palette choice be decoupled from theme preference (e.g. `palettePreset: 'primary-rgb' | 'curated'`)?

**Files affected**
- `utils/theme.ts` — `defaultTheme`, `lightTheme`, `ThemeTokens`
- `data/projects.json` — `prefersTheme` per project
- Project-level `theme` overrides in `index.ts`

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

---

## Runtime architecture

### Multi-technique project/layer runtime

- ID: `multi-technique-runtime`
- Status: `candidate`
- Priority: **medium**
- Area: `types/project.ts`, `utils/layerRuntime.ts`, `components/ProjectViewer.vue`

**Problem**  
Project metadata can already represent multiple libraries/techniques, but the
current layer manager contract is SVG-specialized (`SingleActiveSvg...`,
`exportActiveSvg`). This makes mixed or switchable technique workflows harder
than necessary when adding canvas2d-first sketches.

**Proposal doc**  
See `MULTI_TECHNIQUE_RUNTIME_PLAN.md` for phased design and migration strategy.

**Next step**  
Implement Phase 1 only:

- Add canonical `Technique` type and optional module declarations
  (`supportedTechniques`, `defaultTechnique`) in `types/project.ts`.
- Finalize the Phase 1 checklist in `MULTI_TECHNIQUE_RUNTIME_PLAN.md`,
  including decision on optional `data/projects.json` `techniques/layers`
  metadata.
- Define the metadata-first target shape where layers can declare
  `technique`, `container.mode`, and module path, with runtime auto-injecting
  layer selection UI when multiple layers are present.
- Keep runtime behavior unchanged until pilot validation in Phase 2.
