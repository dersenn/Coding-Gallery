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
- Status: `implemented`
- Priority: **medium**
- Area: `types/project.ts`, `runtime/layerRuntime.ts`, `components/ProjectViewer.vue`

**Problem**  
Project metadata can already represent multiple libraries/techniques, but the
current layer manager contract is SVG-specialized (`SingleActiveSvg...`,
`exportActiveSvg`). This makes mixed or switchable technique workflows harder
than necessary when adding canvas2d-first sketches.

**Proposal doc**  
See `MULTI_TECHNIQUE_RUNTIME_PLAN.md` for phased design and migration strategy.

**Current status**  
- Generalized runtime helpers are active in `runtime/layerRuntime.ts`.
- Metadata bootstrap is active in `runtime/projectBootstrap.ts`.
- Canonical per-project config loading is active in `components/ProjectViewer.vue`.
- `grid-almighty` is the reference mixed-tech pilot for current runtime shape.

**Follow-up**  
Continue incremental project migrations to pure config-first authoring per
`PROJECT_CONFIG_MIGRATION_PLAYBOOK.md`.

### Runtime module specialization follow-up

- ID: `runtime-module-specialization`
- Status: `candidate`
- Priority: **low**
- Area: `runtime/`

**Problem**  
`runtime/projectBootstrap.ts` currently handles shared orchestration plus technique branches inline. As more p5-specific behavior is introduced, this file may become harder to maintain.

**Next step**  
If p5 migration introduces significant branching, split technique handlers into focused modules (for example `runtime/p5Runtime.ts`) while keeping bootstrap orchestration thin.

---

## Controls and actions UX

### Layer-scoped actions and defaults for multi-tech projects

- ID: `layer-scoped-controls-actions`
- Status: `implemented`
- Priority: **high**
- Area: `components/ControlPanel.vue`, `components/ProjectRouteView.vue`, `components/ProjectViewer.vue`, `composables/useControls.ts`

**Problem**  
In multi-layer/multi-technique projects, controls and action buttons are currently treated as project-global. This causes two UX issues:

- The panel can show actions that do not apply to the active layer (for example showing both SVG and PNG save options simultaneously).
- "Defaults" reset is global, so it can reset `activeLayer` and jump to the default layer instead of only resetting the currently active layer settings.

**Desired behavior**
- Action visibility should be layer-aware:
  - show shared/global actions always
  - show layer-specific actions only for the active layer
- Defaults should support scoped reset:
  - `Reset Layer` resets only controls owned by the active layer and preserves `activeLayer`
  - optional `Reset All` resets shared + all layer controls
- Download action behavior should be capability-aware (active layer/runtime decides whether SVG or PNG save is available).

**Proposed direction**
1. Introduce a control/action scoping model in runtime contracts:
   - shared project-level controls/actions
   - per-layer controls/actions
2. Add active-layer capability reporting from runtime to viewer (for action filtering).
3. Update panel action rendering so it resolves effective actions from:
   - shared actions
   - active-layer actions
   - active runtime capabilities
4. Split reset semantics:
   - keep keyboard shortcut `d` mapped to `Reset Layer`
   - add optional panel action for `Reset All`
5. Keep backward compatibility:
   - projects without layer-scoped metadata continue to use current global behavior.

**Files likely affected**
- `types/project.ts` — formalize scoped controls/actions contract (if needed)
- `projects/*/index.ts` (layered projects) — declare layer-scoped controls/actions
- `composables/useControls.ts` — add reset-by-scope helpers
- `components/ControlPanel.vue` — action grouping/visibility by scope
- `components/ProjectRouteView.vue` — keyboard/action dispatch semantics
- `components/ProjectViewer.vue` — runtime capability plumbing for effective actions

**Progress update**
- Scoped controls/actions are now first-class:
  - shared controls/actions at project level
  - per-layer controls/actions in `layers[].controls` / `layers[].actions`
- Effective panel controls/actions now resolve from active layer context.
- Defaults are split into `Reset Layer` (shortcut `d`) and optional `Reset All`.
- Layered projects can omit manual `activeLayer` control; viewer auto-generates it when multiple layers exist.
- `projects/svg/grid-almighty` is migrated as the pilot for independent layer state.

---

## Metadata/index architecture

### Generated projects index from config (single source of truth)

- ID: `generated-projects-index`
- Status: `candidate`
- Priority: **high**
- Area: `data/projects.json`, `scripts/`, `projects/**/project.config.ts`

**Problem**  
`data/projects.json` and per-project `project.config.ts` currently duplicate core
metadata fields (`title`, `description`, `date`, `tags`, etc.), requiring
manual synchronization.

**Desired direction**
- Treat `project.config.ts` as single authoring source.
- Generate or refresh `data/projects.json` automatically from configs.
- Keep validator checks for path/taxonomy integrity while reducing manual drift.

**Possible implementation**
- Add a script (for example `scripts/generate-project-index.mjs`) that scans
  project configs and emits thin index entries.
- Wire generation into a command and/or pre-validate workflow.
