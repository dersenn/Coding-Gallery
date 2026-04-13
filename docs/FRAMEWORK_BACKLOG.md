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
The dark theme uses primary RGB colors (`#f00`, `#0f0`, `#00f`, `#ff0`, `#0ff`, `#f0f`) in its palette. The light theme uses a curated Tailwind-style palette instead. Projects with `prefersTheme: 'light'` never see the primary RGB palette. There is no way to explicitly choose "primary RGB" vs "curated" independent of light/dark preference.

**Questions to resolve**
- Should primary RGB remain the dark default, or should both themes offer a "primary" vs "curated" option?
- Is the current split (dark = primary, light = curated) intentional or accidental?
- Should palette choice be decoupled from theme preference (e.g. `palettePreset: 'primary-rgb' | 'curated'`)?

**Files affected**
- `utils/theme.ts` — `defaultTheme`, `lightTheme`, `ThemeTokens`
- `data/projects.json` — `prefersTheme` per project
- Project-level `theme` overrides in `index.ts`

---

## Routing and navigation

### Sketch-first URL structure

- ID: `sketch-first-urls`
- Status: `in-design`
- Priority: **high**
- Area: `pages/`, `components/ProjectRouteView.vue`, `composables/useControls.ts`

**Direction**  
The URL structure should reflect the sketch as the primary unit of navigation:

```
/[project]/[sketch]?seed=…&controlKey=…
/[project]?seed=…&controlKey=…         ← single-sketch projects (no sketch segment)
```

Single-sketch projects (apps, playgrounds, or projects that are a single self-contained sketch) use the simpler `/[project]` URL. Multi-sketch projects use `/[project]/[sketch]`. The distinction is determined by whether the project config defines more than one sketch.

**Motivation**  
- `activeSketch` as a query param is a workaround; sketch identity belongs in the path.
- The sketch select dropdown becomes real router navigation, not a control mutation.
- Per-sketch seed is naturally scoped to the route.
- Sketch-level page transitions (enter/leave) become standard `NuxtPage` transitions,
  removing the need for the manual `<Transition>` wrapper and `viewerInstanceKey`.
- Per-sketch theme/background can be resolved from route metadata before mount,
  unblocking the deferred-enter transition work.

**Approach**
- Add `pages/[project]/[sketch].vue` route alongside existing `pages/[project].vue`.
- `pages/[project].vue` handles single-sketch projects and redirects to the default
  sketch URL for multi-sketch projects.
- `handleSketchSelect` in `ProjectRouteView` becomes `router.push` to the sketch route.
- `activeSketch` query param and its special-case handling in `useControls` are retired.
- Existing `/[project]?activeSketch=…` URLs redirect gracefully to the new shape.

**Notes**
- `useControls` query param logic is not significantly affected — control keys remain
  flat query params, only `activeSketch` is removed from that space.
- Single-sketch projects include apps and playgrounds that are self-contained — these
  keep the simple `/[project]` URL regardless of how many sketch files they have
  internally, as long as the config exposes only one sketch.

---

## Runtime architecture

### Project as routing container — sketch as primary authoring unit

- ID: `project-as-container`
- Status: `in-design`
- Priority: **medium**
- Area: `types/project.ts`, `runtime/projectBootstrap.ts`, `components/ProjectViewer.vue`

**Direction**  
The project layer is trending toward a thin routing/metadata container. Most
meaningful properties — theme, controls, actions, technique, container sizing —
are already per-sketch. The remaining project-level fields that carry visual or
behavioral meaning should move to sketch scope.

**What stays at project level**
- `id`, `title`, `date`, `tags` — gallery/index metadata
- `configFile` — module loading path
- `sketches[]` — the sketch list itself

**What moves to sketch level**
- `theme` override object — currently project-only; sketches should own their
  visual identity fully, including color overrides
- `prefersTheme` — already per-sketch in types and partially honored in the
  viewer; needs to be fully authoritative at sketch scope
- `noControls` — can be expressed implicitly (no controls defined = no panel)
  or explicitly per sketch

**What is already per-sketch (no change needed)**
- `technique`, `container` (canvas sizing), `controls`, `actions`,
  `defaultActive`, `label`, `module`

**Relationship to URL restructuring**  
Completing `sketch-first-urls` is the natural prerequisite — once sketch is a
route segment, per-sketch theme can be resolved via route metadata before mount,
which unblocks clean transition theming.

**Notes**  
Projects that are a single self-contained sketch (apps, playgrounds) are not
forced into the multi-sketch model — they simply have one entry in `sketches[]`
and use the simple `/[project]` URL.

### Multi-technique project/sketch runtime

- ID: `multi-technique-runtime`
- Status: `implemented`
- Priority: **medium**
- Area: `types/project.ts`, `runtime/sketchRuntime.ts`, `components/ProjectViewer.vue`

**Current status**  
- Generalized runtime helpers are active in `runtime/sketchRuntime.ts`.
- Metadata bootstrap is active in `runtime/projectBootstrap.ts`.
- Canonical per-project config loading is active in `components/ProjectViewer.vue`.
- `growing-things` is the reference mixed-tech pilot for current runtime shape.

**Follow-up**  
Continue incremental project migrations to pure config-first authoring per
`PROJECT_CONFIG_MIGRATION_PLAYBOOK.md`.

### Standalone project/sketch source export

- ID: `standalone-project-sketch-export`
- Status: `candidate`
- Priority: **high**
- Area: `components/ProjectViewer.vue`, `runtime/`, `types/project.ts`, `utils/download.ts`

**Problem**  
Current export workflow focuses on rendered artifacts (`download-svg`, `download-png`). This is useful for final outputs, but it does not support the original portability goal of detaching a sketch from gallery/runtime UI and running it independently as source code.

**Desired behavior**
- Export active sketch as a standalone runnable package (raw mode, no gallery controls by default).
- Export full project as a standalone runnable package.
- Keep deterministic seed behavior and default control values.
- Avoid framework UI dependencies in exported output.

**Proposal doc**  
See `STANDALONE_EXPORT_SKETCH.md` for phased design, output package shape, and technique rollout.

**Suggested phases**
1. `svg` + `canvas2d` raw sketch export prototype.
2. Downloadable zip package generation.
3. Optional lightweight controls scaffolding.
4. `p5`-specific export adapter phase.

**Files likely affected**
- `components/ProjectViewer.vue` — expose export action dispatch + capability checks.
- `runtime/projectBootstrap.ts` and/or `runtime/sketchRuntime.ts` — standalone-capable runtime descriptors.
- `types/project.ts` — optional standalone export capability contract.
- `utils/download.ts` (or new `utils/standaloneExport.ts`) — package/file generation helpers.
- `projects/_Templates/` — reusable standalone template skeleton(s).

### Runtime module specialization follow-up

- ID: `runtime-module-specialization`
- Status: `candidate`
- Priority: **low**
- Area: `runtime/`

**Problem**  
`runtime/projectBootstrap.ts` currently handles shared orchestration plus technique branches inline. As more p5-specific behavior is introduced, this file may become harder to maintain.

**Next step**  
If p5 migration introduces significant branching, split technique handlers into focused modules (for example `runtime/p5Runtime.ts`) while keeping bootstrap orchestration thin.

### Inject shortcuts into runtime context

- ID: `runtime-shortcuts-context`
- Status: `candidate`
- Priority: **medium**
- Area: `types/project.ts`, `components/ProjectViewer.vue`, `runtime/projectBootstrap.ts`

**Problem**  
Most sketches still write `utils.*` chains repeatedly or recreate local aliases with `shortcuts(utils)` in each file. The shortcut API exists but is not a consistent runtime contract, so ergonomics vary by sketch style and module type (project `init` vs sketch `draw`).

**Desired behavior**
- Expose a canonical shortcuts object from runtime context (for example `sc`) for both project and sketch execution paths.
- Keep `utils` as the canonical full API name (do not replace it with `u` at framework contract level).
- Preserve backward compatibility for existing aliases already injected in sketch draws (`v`, `rnd`).

**Proposed direction**
1. Add a typed shortcuts field (for example `sc`) to `ProjectContext`.
2. In viewer/bootstrap context construction, instantiate once from `shortcuts(utils)` and pass through runtime.
3. Include the same field in metadata sketch draw context so sketch modules and init modules have parity.
4. Keep migration incremental: existing sketches continue to work, new sketches prefer `sc.*`.

**Files likely affected**
- `types/project.ts` — runtime context type expansion for shortcuts.
- `components/ProjectViewer.vue` — context object passed to project init/bootstrap.
- `runtime/projectBootstrap.ts` — sketch draw-context payload standardization.
- `projects/_Templates/` — examples updated to prefer runtime-provided shortcuts.

### Deferred sketch enter transition

- ID: `deferred-sketch-enter`
- Status: `deferred`
- Priority: **medium**
- Area: `components/ProjectRouteView.vue`, `components/ProjectViewer.vue`

**Problem**  
The enter fade-in of a new sketch starts immediately on mount, but `loadProject`
in `ProjectViewer` is async. Heavy sketches render mid-fade, causing a visible
content pop. The correct fix is to hold the enter transition until the sketch
signals it has completed its first draw.

**Proposed approach (option B)**  
Use `:css="false"` on the `<Transition>` and JS enter/leave hooks. The enter
hook stores Vue's `done` callback and holds opacity at 0. `ProjectViewer` emits
a `ready` event after first draw completes. The parent triggers the opacity
transition and calls `done`.

**Why deferred**  
Requires the incoming sketch's background color to be known before mount so the
parent background stays correct throughout. This is only clean once:
1. `sketch-first-urls` is implemented (sketch theme resolvable from route metadata)
2. `project-as-container` / sketch-level theme ownership is in place

---

## Controls and actions UX

### Sketch-scoped actions and defaults for multi-tech projects

- ID: `sketch-scoped-controls-actions`
- Status: `implemented`
- Priority: **high**
- Area: `components/ControlPanel.vue`, `components/ProjectRouteView.vue`, `components/ProjectViewer.vue`, `composables/useControls.ts`

**Progress update**
- Scoped controls/actions are now first-class:
  - shared controls/actions at project level
  - per-sketch controls/actions in `sketches[].controls` / `sketches[].actions`
- Effective panel controls/actions now resolve from active sketch context.
- Defaults are split into `Reset Sketch` (shortcut `d`) and optional `Reset All`.
- Layered projects can omit manual `activeSketch` control; viewer auto-generates it when multiple sketches exist.
- `projects/svg/growing-things` is migrated as the pilot for independent sketch state.

---

## Theme / sketch decoupling

### Sketch-level theme ownership

- ID: `sketch-level-theme-ownership`
- Status: `in-design`
- Priority: **medium**
- Area: `types/project.ts`, `runtime/projectBootstrap.ts`

**Background**  
The framework started with the project as the primary unit of authoring. Sketches
emerged as a finer-grained subdivision. Controls, actions, technique, and container
sizing are already per-sketch. Theme is the main remaining exception.

**Problem**  
The `theme` override object currently lives only on `ProjectDefinition`. All sketches
within a project receive the same resolved theme, even if individual sketches have
a different `prefersTheme`. The workaround — importing theme tokens directly inside
the sketch — bypasses the framework contract.

Additionally, `effectivePrefersTheme` is emitted from `ProjectViewer` reactively
after mount, so the parent chrome (`chromePrefersTheme` CSS vars) updates mid-transition
rather than before it, causing background color flicker when switching between
sketches with different themes.

**Desired direction**
- Add `theme?: ThemeOverride` to `ProjectSketchDefinition` in `types/project.ts`.
- `projectBootstrap` resolves theme per active sketch: `sketch.theme ?? definition.theme`.
- Background color and theme intent become available from route metadata before mount,
  removing the reactive-emit timing problem.
- Long-term: `definition.theme` becomes a fallback default; sketches are the authority.

**Dependency**  
Clean resolution of the transition background problem depends on `sketch-first-urls`
— once sketch is a route segment, theme can be resolved statically before the
viewer mounts.

**Files affected**
- `types/project.ts` — add `theme` to `ProjectSketchDefinition`
- `runtime/projectBootstrap.ts` — per-sketch theme resolution
- `components/ProjectViewer.vue` — thread sketch-level theme into draw context

---

## Metadata/index architecture

### Generated projects index from config (single source of truth)

- ID: `generated-projects-index`
- Status: `implemented`
- Priority: **high**
- Area: `data/projects.json`, `scripts/`, `projects/**/project.config.ts`

**Resolution**  
`project.config.ts` is the single authoring source. Index generation from configs
is implemented and active. `data/projects.json` is generated, not hand-maintained.