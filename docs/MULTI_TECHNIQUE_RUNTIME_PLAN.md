# Multi-Technique Runtime Plan

> **Status: PARTIALLY IMPLEMENTED**
> - **Phase 1 (contracts)** — done: `Technique` type and `ProjectModule.sketches[]` in `types/project.ts`.
> - **Phase 2 (generalized runtime pilot)** — done: `singleActiveSketchSetup/Manager` in `runtime/sketchRuntime.ts`; `growing-things` is the reference multi-technique project.
> - **Phase 3 (incremental adoption)** — pending: migrate more SVG-sketch projects to generalized runtime.
> - **Phase 4 (consolidation)** — pending: reassess/retire SVG-specific helper.

Plan for supporting multiple rendering techniques (initially SVG, p5js and 2D canvas)
within the same project architecture, while preserving existing sketches and
avoiding a disruptive all-at-once migration.

## Why now

The framework now has a clean split between:

- `utils/container.ts` for sizing/layout concerns
- `utils/canvas.ts` for lightweight 2D drawing
- `utils/svg.ts` for SVG drawing/export

At metadata level, projects already allow multiple libraries via
`Project.libraries: string[]`, but runtime contracts are still centered on
SVG-specific sketch helpers.

## Current implementation status (v1 slice)

- Canonical `Technique` and technique/sketch contracts were added to `types/project.ts`.
- Generalized runtime helpers were added in `runtime/sketchRuntime.ts`:
  - `singleActiveSketchSetup(...)`
  - `singleActiveSketchManager(...)`
- `growing-things` was migrated as the pilot mixed-technique project (canvas2d + p5).
- Strict metadata validation is available through `npm run validate:projects`.
- Canonical runtime loading now uses per-project `project.config.ts`.
- `data/projects.json` is a thin index with canonical `entryFile` + `configFile`.
- `growing-things` is now the thin-config A-mode reference project.

## Current constraints

### Project module contract is technique-agnostic, but minimal

`ProjectModule` currently exposes one `init()` entry point plus optional module
metadata and `container` sizing intent.

Primary reference:

- `types/project.ts`

### Sketch runtime helper is SVG-specific by design

`runtime/sketchRuntime.ts` currently defines:

- `SingleActiveSvgLayerRuntime`
- `singleActiveSvgLayerSetup(...)`
- `singleActiveSvgLayerManager(...)`
- `exportActiveSvg(...)`

This is stable for SVG projects, but it hardcodes render surface and export
assumptions in manager-level APIs.

Primary reference:

- `runtime/sketchRuntime.ts`

## Design goals

- Preserve behavior for all existing SVG and p5 projects by default.
- Introduce multi-technique support incrementally.
- Keep v1 technique list intentionally small: `svg`, `p5js`, `canvas2d`.
- Avoid premature abstraction for WebGL/3D in this phase.
- Keep export/action semantics explicit per technique.

## Non-goals (v1)

- No mandatory migration of all existing projects.
- No immediate replacement of SVG sketch runtime everywhere.
- No universal scene graph abstraction across all techniques.

## Proposed v1 contracts

### Technique vocabulary

Introduce a canonical technique type in `types/project.ts`:

```ts
export type Technique = 'svg' | 'canvas2d' | 'p5'
```

Optionally add module-level declarations:

```ts
interface ProjectModule {
  // existing fields...
  supportedTechniques?: Technique[]
  defaultTechnique?: Technique
}
```

### Intended capability model

Target behavior for thematic/formal exploration projects:

- Project defines core metadata and can optionally list techniques.
- Each sketch can declare which technique/library it uses (`svg`, `canvas2d`, `p5`).
- Runtime resolves active sketch technique and injects matching utilities.
- Different sketches in the same project can achieve similar visual intent via
  different means (for example, grid studies rendered in SVG vs canvas).

This implies a sketch contract that carries technique explicitly, instead of
assuming one renderer for the entire manager.

## Metadata-first "ideal world" target

Long-term target: project `index.ts` becomes thin bootstrap glue, while sketch
setup and basic runtime wiring are declared in `data/projects.json`.

Desired outcomes:

- Core project metadata remains in `data/projects.json`.
- Project can optionally declare `techniques` and `sketches`.
- Each sketch declares its technique and layout mode.
- Runtime auto-wires sketch registry and injects matching utilities.
- When more than one sketch exists, UI auto-injects a sketch select control.

This keeps thematic projects (for example, grid studies) focused on drawing
logic, not setup boilerplate.

### Naming note: "canvas mode" vs "container mode"

Current framework naming uses `container` for layout concerns (`resolveContainer`,
`ContainerMode`, `ProjectModule.container`), while `canvas` now means drawing
surface utility.

To avoid reintroducing ambiguity:

- Use `container` terminology in new metadata schema.
- In JSON, prefer `container.mode` over `canvas.mode` (Needs evaluation, to avoid introducing another ambiguity with top-level `container`. Possible: `artboard`, but could be ambiguous with `frame` further down the pipe.)
- If historical docs/sketches say "canvas mode", treat it as legacy wording.

### Technique-aware runtime shape (new helper)

Add a new generalized sketch runtime helper alongside (not replacing) existing
SVG helper:

- `singleActiveSketchSetup(...)`
- `singleActiveSketchManager(...)`
- runtime entries declare `technique`

Example conceptual runtime shape:

```ts
type LayerTechnique = 'svg' | 'canvas2d'

interface SingleActiveSketchRuntime {
  technique: LayerTechnique
  draw: () => void
  destroy: () => void
  exportSvg?: (seed: string | number) => void
  exportPng?: (seed: string | number) => void
}
```

This keeps technique-specific exports optional rather than hardcoding one
manager method name.

### Actions/export model

- Continue using `registerAction(...)` in project modules.
- Keep action keys explicit (`download-svg`, `download-png`) and only register
  the ones supported by active technique/runtime.

### Optional metadata extension (`data/projects.json`)

To improve discoverability and route-level introspection, evaluate adding an
optional `sketches` section in project metadata.

Concept sketch:

```json
{
  "id": "grid-study",
  "entryFile": "/projects/.../index.ts",
  "techniques": ["svg", "canvas2d"],
  "sketches": [
    { "id": "svg-grid", "technique": "svg" },
    { "id": "canvas-grid", "technique": "canvas2d" }
  ]
}
```

If adopted, keep module runtime exports as source of truth, and treat metadata
sketches as declarative hints unless a strict sync validator is introduced.

Recommended v1 schema direction:

```json
{
  "id": "grid-study",
  "entryFile": "/projects/grid-study/index.ts",
  "techniques": ["svg", "canvas2d"],
  "container": { "mode": "full" },
  "sketches": [
    {
      "id": "grid-svg",
      "label": "Grid SVG",
      "technique": "svg",
      "container": { "mode": "full" },
      "module": "./sketches/grid-svg.js"
    },
    {
      "id": "grid-canvas",
      "label": "Grid Canvas",
      "technique": "canvas2d",
      "container": { "mode": "full" },
      "module": "./sketches/grid-canvas.js"
    }
  ]
}
```

Notes:

- Keep JSON as declarative data only.
- Sketch `module` path resolves to drawing file under project folder.
- Module/project code can still override metadata while architecture stabilizes.

## Migration strategy

### Phase 1 - contracts only (no behavior change)

- Add `Technique` types and optional `supportedTechniques/defaultTechnique` to
  `ProjectModule`.
- Keep existing project behavior untouched when these fields are absent.

### Phase 2 - introduce generalized runtime behind one pilot

- Add new generalized sketch helper in `utils/` (parallel to current SVG helper).
- Pilot on one project with clear sketch boundaries.

### Phase 3 - incremental adoption

- Migrate selected SVG sketch projects to generalized runtime where it adds value.
- Add first canvas2d sketch-based project to validate end-to-end behavior.

### Phase 4 - consolidate

- Once mature and broadly adopted, evaluate deprecating SVG-specific helper.
- Keep only if it still provides significant ergonomic value.

## Risks and open questions

- Should technique switching be project-level only in v1, or sketch-level mixed?
- How should control panel UX expose technique switching (if at all)?
- Should `data/projects.json` gain an explicit `techniques` field, or continue to
  derive from `libraries` plus module declarations?
- How strict should action naming conventions be across techniques?

## Validation plan

- Typecheck with `npx vue-tsc --noEmit`.
- Smoke test one SVG project and one canvas2d project after Phase 2.
- Verify action behavior:
  - SVG path still exports SVG where expected.
  - Canvas2d path exports PNG where expected.
- Confirm no regressions in existing single-technique projects.

## Suggested first implementation slice

1. Add `Technique` and optional module fields in `types/project.ts`.
2. Add generalized runtime types only (no project migrations).
3. Convert one pilot project to use new runtime.
4. Evaluate ergonomics before broader migration.

## Implementation checklist

### Phase 1 checklist (contracts + metadata, no behavior change) ✅

- [x] Add canonical `Technique` type in `types/project.ts`.
- [x] Add optional `ProjectModule` fields:
  - [x] `supportedTechniques?: Technique[]`
  - [x] `defaultTechnique?: Technique`
- [x] Define a technique-aware sketch definition type for upcoming runtime work.
- [x] Decide whether to add optional `techniques` and `sketches` to
      `data/projects.json` in this phase or defer to Phase 2.
- [x] Keep all existing projects functioning unchanged when new fields are
      absent.

### Phase 2 checklist (generalized runtime pilot) ✅

- [x] Introduce a technique-agnostic single-active sketch runtime helper
      alongside the SVG-specific one. (`singleActiveSketchSetup/Manager` in `runtime/sketchRuntime.ts`)
- [x] Add runtime capability flags/handlers for export actions by technique.
- [x] Pilot with one project that has at least two sketches using different
      techniques. (`growing-things`: canvas2d + p5)
- [x] Auto-inject a sketch select control when `sketches.length > 1`.
- [x] Keep sketch select out of UI when only one sketch exists.

### Sketch module contract checklist ✅

- [x] Standardize sketch module export to `draw(...)` for all techniques.
- [x] Replace technique-specific names like `drawGridCore` in metadata-driven
      paths with `draw` as canonical entry.
- [x] Define per-technique draw context injection:
  - [x] SVG sketches receive `svg`, `frame`, shared utilities.
  - [x] Canvas2d sketches receive `canvas`, `ctx`/wrapper helpers, `frame`,
        shared utilities.
  - [x] p5 sketches receive p5 instance/context plus shared utilities.
- [x] Ensure draw signature is deterministic and seed-safe across techniques.

### Minimal project `index.ts` checklist ✅

- [x] Introduce metadata-driven bootstrap utility that reads project/sketch
      definitions and mounts runtime automatically. (`project.config.ts` + `runtime/projectBootstrap.ts`)
- [x] Keep project `index.ts` focused on:
  - [x] optional controls/actions/theme overrides
  - [x] delegating to generic bootstrap (`initFromProjectDefinition(...)`)
- [x] Preserve manual setup escape hatch for advanced/custom sketches.

## Proposed TypeScript contract sketch

The following interfaces are intentionally pragmatic and can evolve once one
pilot project validates the runtime ergonomics.

```ts
export type Technique = 'svg' | 'canvas2d' | 'p5'

export interface ProjectSketchDefinition {
  id: string
  label?: string
  technique: Technique
  container?: ContainerMode | ContainerConfig
  module: string
  controls?: ProjectControlDefinition[]
  actions?: ProjectActionDefinition[]
  defaultActive?: boolean
}

export interface ProjectTechniqueDefinition {
  techniques?: Technique[]
  defaultTechnique?: Technique
  sketches?: ProjectSketchDefinition[]
}

export interface ProjectModule {
  init?: (container: HTMLElement, context: ProjectContext) => Promise<CleanupFunction>
  controls?: ProjectControlDefinition[]
  actions?: ProjectActionDefinition[]
  theme?: ThemeOverride
  container?: ContainerMode | ContainerConfig
  supportedTechniques?: Technique[]
  defaultTechnique?: Technique
  sketches?: ProjectSketchDefinition[]
}
```

### Technique runtime context map (concept)

```ts
type LayerRuntimeContextMap = {
  svg: {
    svg: SVG
    frame: SingleActiveSvgLayerFrame
    theme: ThemeTokens
    utils: GenerativeUtils
  }
  canvas2d: {
    canvas: Canvas
    frame: { x: number; y: number; width: number; height: number }
    theme: ThemeTokens
    utils: GenerativeUtils
  }
  p5: {
    p: P5Instance
    frame: { x: number; y: number; width: number; height: number }
    theme: ThemeTokens
    utils: GenerativeUtils
  }
}
```

Sketch modules then standardize on:

```ts
export function draw(ctx: LayerRuntimeContextMap[Technique], controls: ControlValues): void
```

Exact generics can be tightened after the pilot.

## `index.ts` role in this architecture

Yes, `index.ts` absolutely remains a valid and expected extension point.

- Metadata-first setup removes repetitive wiring, not project author control.
- `index.ts` should still be used when you need:
  - sketch-specific or project-specific controls composition
  - custom actions and side effects
  - technique-specific lifecycle exceptions
  - non-standard orchestration not worth encoding in static metadata

Practical target:

- Common case: near-zero boilerplate `index.ts` delegating to bootstrap.
- Advanced case: `index.ts` augments or overrides metadata-driven defaults.

### Phase 3 checklist (incremental adoption)

- [ ] Migrate selected sketch-based SVG projects where the generalized runtime
      clearly improves maintainability.
- [ ] Add one production canvas2d sketch project using the same runtime shape.
- [ ] Add validator coverage if `data/projects.json.sketches` is introduced.

### Phase 4 checklist (consolidation)

- [ ] Reassess whether `SingleActiveSvg...` helper should remain as ergonomic
      wrapper or be retired.
- [ ] Remove deprecated paths only after all target projects have migrated.
