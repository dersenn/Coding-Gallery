# Standalone Export Sketch (Project and Layer)

> **Status: PROPOSAL — not yet implemented.**
> Design is fleshed out (phases A–D), but no framework code has been written. Open decisions remain unresolved.

Design sketch for exporting a gallery project (or a single layer) into a runnable standalone package outside this Nuxt sandbox.

## Goal

Provide a framework action that can export:

- one full project, or
- one selected layer

as a detached bundle that runs without gallery UI/controls unless explicitly requested.

Primary target: "raw sketch" export (minimal runtime + drawing code), with optional control scaffolding.

## Why this belongs in scope

- The gallery architecture already treats sketches as portable modules.
- Runtime contracts already normalize draw entry points and layer techniques.
- Existing export actions save output assets (SVG/PNG), but not runnable source bundles.

This proposal fills that gap by adding source-level portability as a first-class workflow.

## Existing building blocks

- `runtime/projectBootstrap.ts`
  - layer-oriented runtime orchestration and per-technique runtime creation
- `runtime/layerRuntime.ts`
  - active-layer draw and capability model (`exportSvg`, `exportPng`)
- `components/ProjectViewer.vue`
  - action registration/dispatch and fallback action injection
- `types/project.ts`
  - portable `ProjectDefinition` / `ProjectLayerDefinition` contracts
- `utils/download.ts`
  - metadata/filename conventions for existing artifact export

## Proposed user-facing actions

Add new action keys (framework-reserved):

- `export-standalone-layer`
- `export-standalone-project`

Optional future alias:

- `export-standalone` (context-dependent: active layer when layered, project otherwise)

## Export modes

### 1) Raw mode (default)

Generates the minimal runnable sketch:

- no gallery controls panel
- no URL control persistence
- static controls object with resolved defaults
- deterministic seed wiring retained

### 2) With controls mode (optional)

Adds lightweight control scaffolding:

- generated controls schema file
- tiny runtime state object
- no dependency on gallery UI components

## Output package shape (initial draft)

For layer export:

```text
standalone/
  <project-id>__<layer-id>/
    index.html
    main.ts
    sketch.ts            # copied/adapted layer module
    context.ts           # minimal context adapter
    utils/               # copied or imported utility subset
    README.md
```

For project export:

```text
standalone/
  <project-id>/
    index.html
    main.ts
    project.config.ts    # normalized standalone form
    layers/
      ...
    context.ts
    utils/
    README.md
```

## Runtime adapter contract (raw mode)

`main.ts` should:

1. create root container
2. instantiate technique runtime (`SVG` or `Canvas`)
3. construct context object compatible with layer `draw(context)`
4. invoke draw once (or per frame for animated variants)

Minimal context fields to pass:

- `technique`
- `svg` or `canvas` + `ctx` (as appropriate)
- `frame`
- `theme`
- `utils`
- `controls` (resolved defaults only)
- shorthand helpers (`v`, `rnd`) where expected by migrated layers

## Non-goals (phase 1)

- preserving full gallery chrome (panel, shortcuts, route shell)
- preserving every framework convenience API
- bundling all project metadata/index behavior
- one-click publish/deploy

## Compatibility notes by technique

- `svg` layers: easiest path; already map to `draw(context)` + `SVG` helper
- `canvas2d` layers: similarly straightforward via `Canvas` helper
- `p5` projects: possible, but should follow in a dedicated phase due to p5 lifecycle/instance requirements

## Implementation approach (phased)

### Phase A: Manual prototype path

- Add internal utility to produce an in-memory standalone package descriptor from active layer/project.
- Start with `svg` and `canvas2d` layered projects.
- Validate with `projects/svg/growing-things` as reference.

### Phase B: Downloadable bundle

- Generate files and package as zip.
- Trigger browser download from action handler.
- Include generated README with run instructions.

### Phase C: Optional controls scaffolding

- Generate lightweight controls state shim.
- Keep this opt-in and separate from raw mode.

### Phase D: p5 support

- Add p5-specific adapter/runtime template.
- Reuse same action keys and package contract.

## Open decisions

- Should standalone bundles vendor utility code or import from npm package(s)?
- Should layer exports include only active-layer controls, or merged shared defaults too?
- Should animation loops be generated automatically or require explicit per-layer opt-in metadata?
- Should exported bundles target plain browser scripts, Vite, or both templates?

## Suggested acceptance criteria

- Export action appears only when runtime can produce standalone output for active technique.
- Exported raw layer package runs via `npm install && npm run dev` (or static `index.html` if chosen template).
- Result renders visually close to in-gallery output for same seed and defaults.
- No dependency on gallery-only Vue/Nuxt components.
- Generated README explains seed, controls defaults, and known differences.

## Suggested first pilot

- Project: `growing-things`
- Layer: `grid-growth-canvas` (`projects/svg/growing-things/layers/grid-canvas.js`)
- Mode: raw
- Verification: same seed and same defaults produce comparable output inside and outside gallery runtime.
