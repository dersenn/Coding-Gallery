# Single-Active Layer Runtime

Reusable pattern for layered multi-technique sketches where each layer can have its own container mode (including ratio and padding), while only one layer is mounted at a time.

Use the generalized runtime utilities:

- `singleActiveLayerSetup(...)`
- `singleActiveLayerManager(...)`

Technique runtime adapters are split by render surface:

- `runtime/layerRuntime.svg.ts`
- `runtime/layerRuntime.canvas2d.ts`
- `runtime/layerRuntime.p5.ts`

## Utilities

- `singleActiveLayerSetup(...)`
  - Input: technique-aware registry (`label`, `technique`, `canvas`) with:
    - `draw + createContext` for `svg`/`canvas2d`
    - `init` for `p5` (returns cleanup)
  - Output: derived select options, default layer ID, and manager-ready layer definitions.
- `singleActiveLayerManager(...)`
  - Runtime lifecycle helper for technique-specific layer mount/switch/draw/export/destroy.
The runtime helper is implemented in `runtime/layerRuntime.ts` and re-exported from `types/project.ts`.

## p5 minimal contract

For layered p5 integration, keep the same sketch form used by existing p5 projects:

- Module exports `init(container, context)` and returns cleanup (`sketch.remove()`).
- Manager `draw()` is mount-ensure/no-op for p5 layers (p5 owns animation loop).
- Layer switch/unmount calls cleanup.
- Seed/control wiring is handled by framework context; p5 internal logic remains unchanged.

## Why this exists

- Keeps per-layer aspect and padding logic in `resolveContainer(...)`.
- Removes sketch-local lifecycle boilerplate.
- Makes adding layers mostly one-entry work in a registry.

## Thin-config reference project

- Use `projects/svg/growing-things/project.config.ts` as the reference for A-mode:
  - declarative controls/actions/layers in config
  - independent draw logic in `layers/*.js`
  - minimal `index.ts` runtime pointer only

## Recommended shape

1. Define a registry with one entry per layer:
   - `label`
   - `canvas`
   - `draw`
2. Build setup once:
   - `const setup = singleActiveLayerSetup({ registry })`
3. Wire controls from setup:
   - `default: setup.defaultLayerId`
   - `options: setup.options`
4. In `init()`:
   - resolve base container once
   - call `setup.createLayerDefinitions(runtimeExtras)`
   - pass those definitions into `singleActiveLayerManager(...)`

## Minimal example

```ts
type LayerId = 'layer-1' | 'layer-2'

const LAYER_REGISTRY = {
  'layer-1': {
    label: 'Layer 1',
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
  'layer-2': {
    label: 'Layer 2',
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

const LAYER_SETUP = singleActiveLayerSetup({
  registry: LAYER_REGISTRY
})
```

## Typed Index + JS Layers Pattern

Recommended for fast sketch iteration:

- Keep orchestration in typed `index.ts`:
  - layer registry/setup constants
  - controls/actions wiring
  - manager lifecycle (`setActiveLayer`, `draw`, `export`, `destroy`)
- Keep layer render logic in type-free modules:
  - `layers/anni1.js`, `layers/anni2.js`, etc.
  - local sketch settings and draw logic only

Typical runtime boundary:

1. `index.ts` resolves runtime extras once (`theme`, `utils`, shortcuts, controls getter).
2. Manager creates the active layer runtime (`createRuntime(...)`).
3. Layer module `draw(...)` receives runtime context and stays framework-light.
This split keeps TypeScript where it helps most (wiring/contracts) while minimizing typing overhead inside creative draw code.

## First-class shared + layer controls

Layered config now supports independent state per layer with optional shared controls:

- Put shared controls in project-level `controls`.
- Put layer-owned controls in `layers[].controls`.
- Put shared actions in project-level `actions` and layer actions in `layers[].actions`.
- If a project has multiple layers and no explicit `activeLayer` control, the viewer auto-generates one.

At runtime, effective controls are resolved as `shared + activeLayer`, while query persistence keeps layer values isolated by layer-specific keys.

## Naming convention

- Runtime term split:
  - `canvas`: sizing intent/config (`ContainerMode | ContainerConfig`)
  - `container`: DOM host element that `resolveContainer(...)` and managers mount into
  - `svg`: active render surface
  - `frame`: drawable geometry passed to layer draw logic

- `PascalCase` for types/classes/interfaces.
- `camelCase` for functions and local variables.
- `UPPER_SNAKE_CASE` for source-of-truth registries/derived setup constants.

## Naming polish follow-up (optional)

Current API names intentionally favor explicitness and discoverability.

Keep runtime object terms stable (`canvas`, `container`, `svg`, `frame`) even if type names are shortened.

## Shortcuts convention in layered sketches

- Bind a common core from `shortcuts(utils)` once per layer runtime setup/factory:
  - `v`, `rnd`, `map`, `lerp`
- Keep draw helpers focused on render logic and pass/use pre-bound aliases.
- Add extra shortcut aliases only when the layer actually uses them.
