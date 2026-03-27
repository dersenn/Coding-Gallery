# Single-Active Sketch Runtime

Reusable pattern for layered multi-technique sketches where each sketch can have its own container mode (including ratio and padding), while only one sketch is mounted at a time.

Use the generalized runtime utilities:

- `singleActiveSketchSetup(...)`
- `singleActiveSketchManager(...)`

Technique runtime adapters are split by render surface:

- `runtime/sketchRuntime.svg.ts`
- `runtime/sketchRuntime.canvas2d.ts`
- `runtime/sketchRuntime.p5.ts`

## Utilities

- `singleActiveSketchSetup(...)`
  - Input: technique-aware registry (`label`, `technique`, `canvas`) with:
    - `draw + createContext` for `svg`/`canvas2d`
    - `init` for `p5` (returns cleanup)
  - Output: derived select options, default sketch ID, and manager-ready sketch definitions.
- `singleActiveSketchManager(...)`
  - Runtime lifecycle helper for technique-specific sketch mount/switch/draw/export/destroy.
The runtime helper is implemented in `runtime/sketchRuntime.ts` and re-exported from `types/project.ts`.

## p5 minimal contract

For layered p5 integration, keep the same sketch form used by existing p5 projects:

- Module exports `init(container, context)` and returns cleanup (`sketch.remove()`).
- Manager `draw()` is mount-ensure/no-op for p5 sketches (p5 owns animation loop).
- Sketch switch/unmount calls cleanup.
- Seed/control wiring is handled by framework context; p5 internal logic remains unchanged.

## Why this exists

- Keeps per-sketch aspect and padding logic in `resolveContainer(...)`.
- Removes sketch-local lifecycle boilerplate.
- Makes adding sketches mostly one-entry work in a registry.

## Thin-config reference project

- Use `projects/svg/growing-things/project.config.ts` as the reference for A-mode:
  - declarative controls/actions/sketches in config
  - independent draw logic in `sketches/*.js`
  - minimal `index.ts` runtime pointer only

## Recommended shape

1. Define a registry with one entry per sketch:
   - `label`
   - `canvas`
   - `draw`
2. Build setup once:
   - `const setup = singleActiveSketchSetup({ registry })`
3. Wire controls from setup:
   - `default: setup.defaultSketchId`
   - `options: setup.options`
4. In `init()`:
   - resolve base container once
   - call `setup.createLayerDefinitions(runtimeExtras)`
   - pass those definitions into `singleActiveSketchManager(...)`

## Minimal example

```ts
type LayerId = 'sketch-1' | 'sketch-2'

const LAYER_REGISTRY = {
  'sketch-1': {
    label: 'Sketch 1',
    technique: 'svg',
    canvas: { mode: 'square' },
    draw: drawLayer1,
    resolveRuntimeName: (id) => `sketch-${id}`,
    createContext: ({ technique, svg, frame, args }) => ({
      technique,
      svg,
      frame,
      theme: args.theme,
      utils: args.utils,
      controls: args.getControls(),
      v: args.v,
      rnd: args.rnd
    })
  },
  'sketch-2': {
    label: 'Sketch 2',
    technique: 'svg',
    canvas: { mode: '2:3', padding: '6vmin' },
    draw: drawLayer2,
    resolveRuntimeName: (id) => `sketch-${id}`,
    createContext: ({ technique, svg, frame, args }) => ({
      technique,
      svg,
      frame,
      theme: args.theme,
      utils: args.utils,
      controls: args.getControls(),
      v: args.v,
      rnd: args.rnd
    })
  }
} as const

const LAYER_SETUP = singleActiveSketchSetup({
  registry: LAYER_REGISTRY
})
```

## Typed Index + JS Sketches Pattern

Recommended for fast sketch iteration:

- Keep orchestration in typed `index.ts`:
  - sketch registry/setup constants
  - controls/actions wiring
  - manager lifecycle (`setActiveLayer`, `draw`, `export`, `destroy`)
- Keep sketch render logic in type-free modules:
  - `sketches/anni1.js`, `sketches/anni2.js`, etc.
  - local sketch settings and draw logic only

Typical runtime boundary:

1. `index.ts` resolves runtime extras once (`theme`, `utils`, shortcuts, controls getter).
2. Manager creates the active sketch runtime (`createRuntime(...)`).
3. Sketch module `draw(...)` receives runtime context and stays framework-light.
This split keeps TypeScript where it helps most (wiring/contracts) while minimizing typing overhead inside creative draw code.

## First-class shared + sketch controls

Layered config now supports independent state per sketch with optional shared controls:

- Put shared controls in project-level `controls`.
- Put sketch-owned controls in `sketches[].controls`.
- Put shared actions in project-level `actions` and sketch actions in `sketches[].actions`.
- If a project has multiple sketches and no explicit `activeSketch` control, the viewer auto-generates one.

At runtime, effective controls are resolved as `shared + activeSketch`, while query persistence keeps sketch values isolated by sketch-specific keys.

## Naming convention

- Runtime term split:
  - `canvas`: sizing intent/config (`ContainerMode | ContainerConfig`)
  - `container`: DOM host element that `resolveContainer(...)` and managers mount into
  - `svg`: active render surface
  - `frame`: drawable geometry passed to sketch draw logic

- `PascalCase` for types/classes/interfaces.
- `camelCase` for functions and local variables.
- `UPPER_SNAKE_CASE` for source-of-truth registries/derived setup constants.

## Naming polish follow-up (optional)

Current API names intentionally favor explicitness and discoverability.

Keep runtime object terms stable (`canvas`, `container`, `svg`, `frame`) even if type names are shortened.

## Shortcuts convention in layered sketches

- Bind a common core from `shortcuts(utils)` once per sketch runtime setup/factory:
  - `v`, `rnd`, `map`, `lerp`
- Keep draw helpers focused on render logic and pass/use pre-bound aliases.
- Add extra shortcut aliases only when the sketch actually uses them.
