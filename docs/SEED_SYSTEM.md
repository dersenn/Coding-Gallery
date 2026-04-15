# Seed System Documentation

Reference for deterministic randomness across all projects.

## Overview

The gallery uses an sfc32-based seeded RNG with base58 hash strings (fxhash-style) so sketches are reproducible and shareable by URL.

## Runtime behavior

- On project pages, seed is read from `?seed=...` when present.
- If absent, a new seed is generated.
- Press `n` to generate a new seed in-place (no full page reload).
- Current seed is logged to console on project load.

## Main APIs

From `context.utils.seed`:

- `current` - current seed string
- `set(seed)` - set active seed
- `reset()` - re-initialize PRNG and noise from current seed (use at top of draw/render)
- `random()` - float in `[0, 1)`
- `randomRange(min, max)` - float in range
- `randomInt(min, max)` - integer in range
- `coinToss(chance)` - probabilistic boolean

Noise is seed-synchronized via `context.utils.noise.*`.

## Best practices

- Prefer URL seed flow; avoid overriding seeds unless needed.
- Do not use `Math.random()` in deterministic sketches.
- Log/share seed URLs for reproducible renders.

## Control redraw stability

The PRNG is a stateful stream. Each call to `random()` permanently advances its position. If `draw()` is called multiple times without resetting, successive redraws start from different stream positions and produce different output — causing jumpy controls even though the seed has not changed.

### Canonical fix: `utils.seed.reset()`

Call `utils.seed.reset()` at the top of any function that consumes seeded random values from scratch. This re-initializes the Hash and all noise functions from the current seed string, restoring the stream to position 0.

```ts
const draw = () => {
  utils.seed.reset() // restore stream to seed origin before each draw
  const structure = buildStructure()
  render(structure)
}
```

With this in place, the same seed always produces the same output regardless of how many times controls have been adjusted.

`reset()` is a zero-argument shorthand for `set(seed.current)`. All seeded noise functions are also re-initialized, so `simplex2(x, y)` returns consistent values as well.

### Optional optimization: separate structure from render

For sketches with expensive structure builds and many style-only controls, splitting draw into two phases avoids re-running the RNG on every slider tick:

```ts
// Rebuild structure only when seed or structural controls change.
let structure = buildStructure()

// Render uses cached structure — no RNG consumed.
const render = () => {
  svg.stage.replaceChildren()
  drawFromStructure(structure)
}

onControlChange((next) => {
  syncControlState(state, next)
  if (structuralControlChanged(next)) {
    utils.seed.reset()
    structure = buildStructure()
  }
  render()
})
```

This is a per-sketch performance concern, not a correctness requirement. The `reset()` call before `buildStructure()` remains necessary either way.

## Multi-sketch sketches: per-sketch PRNG instances

When a sketch has independently toggled sketches, `reset()` alone is insufficient. Even after reset, if sketch B draws before sketch A, toggling B off shifts A's stream to position 0 instead of position N — reshuffling A's output.

The fix is a separate `GenerativeUtils` instance per sketch, each created fresh from the current seed at the top of `draw()`:

```ts
import { createGenerativeUtils } from '~/utils/generative'

const draw = () => {
  const seed = utils.seed.current
  const layerARnd = createGenerativeUtils(seed)
  const layerBRnd = createGenerativeUtils(seed)

  // layerARnd.seed.random() always starts at stream pos 0, independent of layerB
  // layerBRnd.seed.random() always starts at stream pos 0, independent of layerA
}
```

Both instances are seeded from the same string, so "new seed" reshuffles both sketches in tandem. Creating them inside `draw()` ensures they always reflect the current seed, including after pressing `n`.

Use this pattern when sketches can be independently toggled and each must produce stable output regardless of which other sketches are active. See `projects/c4ta/svg/vera/index.ts` for a working example.

## Troubleshooting checklist

- URL has valid `?seed=...`.
- No code overrides seed unexpectedly.
- All random/noise values come from `utils.seed` / `utils.noise`.
- Project-page shortcut handler is active (`components/ProjectRouteView.vue`, used by both `pages/[id].vue` and `pages/project/[id].vue`).

## Related docs

- Main docs: `../README.md`
- Docs index: `INDEX.md`
- Template guide: `../projects/_Templates/_template/README.md`

---

## TODO: Switch seeds to short 8-char hex everywhere

### Findings

- **Long seeds are still being generated in the UI layer**: `components/ProjectRouteView.vue` defines a local `createSeed()` that returns the legacy `oo` + 49 base58 chars, and uses it for the `new-seed` action (also triggered by the `n` keyboard shortcut).
- **Seed generation is currently duplicated**: `utils/generative.ts` (`Hash.generateNew()`), `composables/useSeedFromURL.ts` (`generateNewSeed()`), and `components/ProjectRouteView.vue` each generate seeds independently.
- **`Hash` still assumes the legacy encoding shape**: the constructor parses seed strings by slicing off the first 2 chars and base58-decoding the remainder into four ints for `sfc32`. An 8-char hex seed is not compatible with this parsing as-written.

### Work items

- **Unify seed generation behind one factory**:
  - Add a single exported factory, e.g. `createSeed8Hex()` (or similar) in a shared place (likely `utils/generative.ts`).
  - Replace the local seed generator in `composables/useSeedFromURL.ts` and `components/ProjectRouteView.vue` with calls to that factory.
- **Stop generating legacy seeds from the project route view**:
  - Update `components/ProjectRouteView.vue` `createSeed()` (or remove it) so the `new-seed` action writes an 8-char hex seed to URL and calls `utils.seed.set(seed)`.
- **Make `Hash` accept the new seed format**:
  - Replace legacy base58+`slice(2)` parsing with a string-to-uint32 seeding step that can take arbitrary seed strings (including 8-char hex) and produce 4x uint32 state for `sfc32`.
  - Decide whether to keep **backwards compatibility**:
    - If yes: detect old `oo...` seeds and parse them with the old base58 path; otherwise treat the seed as a general string and hash it into 4 ints.
    - If no: document the breaking change and accept only hex (or “any string”) going forward.
- **Confirm all “new seed” entry points are covered**:
  - UI action: `new-seed` in `components/ProjectRouteView.vue` (keyboard `n`).
  - URL helper: `generateNewSeed()` in `composables/useSeedFromURL.ts`.
  - Runtime default: when the app creates `createGenerativeUtils()` with no seed (calls `new Hash()`), it should also use the unified factory behavior.
