# Single-Active Layer Runtime

Reusable pattern for layered SVG sketches where each layer can have its own canvas mode (including ratio and padding), while only one layer is mounted at a time.

## Utilities

- `createSingleActiveSvgLayerSetup(...)`
  - Input: one layer registry object.
  - Output: derived select options, default layer ID, and manager-ready layer definitions.
- `createSingleActiveSvgLayerManager(...)`
  - Runtime lifecycle helper: mount/switch/draw/export/destroy for the active layer.

Both are implemented in `utils/layerRuntime.ts` and re-exported from `types/project.ts`.

## Why this exists

- Keeps per-layer aspect and padding logic in `resolveCanvas(...)`.
- Removes sketch-local lifecycle boilerplate.
- Makes adding layers mostly one-entry work in a registry.

## Recommended shape

1. Define a registry with one entry per layer:
   - `label`
   - `canvas`
   - `createRuntime`
2. Build setup once:
   - `const setup = createSingleActiveSvgLayerSetup(registry)`
3. Wire controls from setup:
   - `default: setup.defaultLayerId`
   - `options: setup.options`
4. In `init()`:
   - resolve base canvas once
   - call `setup.createLayerDefinitions(runtimeExtras)`
   - pass those definitions into `createSingleActiveSvgLayerManager(...)`

## Minimal example

```ts
type LayerId = 'layer-1' | 'layer-2'

const LAYER_REGISTRY = {
  'layer-1': {
    label: 'Layer 1',
    canvas: { mode: 'square' },
    createRuntime: createLayer1
  },
  'layer-2': {
    label: 'Layer 2',
    canvas: { mode: '2:3', padding: '6vmin' },
    createRuntime: createLayer2
  }
} as const

const LAYER_SETUP = createSingleActiveSvgLayerSetup(LAYER_REGISTRY)
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

## Per-layer controls with shared schema

You can still keep one shared `controls` export while scoping controls to specific layers:

- Namespace layer-specific keys (for example `anni1_*`, `anni2_*`).
- Gate visibility with `visibleWhenSelectKey: 'activeLayer'` plus `visibleWhenSelectValue` (or `visibleWhenSelectValues`).
- Pass current controls into layer draw/runtime context from `index.ts`.

This avoids separate control systems per layer and keeps control state deterministic across layer switches.

## Naming convention

- `PascalCase` for types/classes/interfaces.
- `camelCase` for functions and local variables.
- `UPPER_SNAKE_CASE` for source-of-truth registries/derived setup constants.

## Shortcuts convention in layered sketches

- Bind a common core from `shortcuts(utils)` once per layer runtime setup/factory:
  - `v`, `rnd`, `map`, `lerp`
- Keep draw helpers focused on render logic and pass/use pre-bound aliases.
- Add extra shortcut aliases only when the layer actually uses them.
