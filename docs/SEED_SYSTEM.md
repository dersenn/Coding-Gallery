# Seed System Documentation

Reference for deterministic randomness across all projects.

## Overview

The gallery uses a mulberry32-based seeded RNG with short 8-char hex seeds (e.g. `a3f9b2c1`) so sketches are reproducible and shareable by URL. Legacy `oo...` base58 seeds are still accepted for backwards compatibility.

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

## Seed format

New seeds are 8-char lowercase hex strings, e.g. `a3f9b2c1`. The PRNG is mulberry32, seeded from `parseInt(seed, 16)`.

Old `oo` + 49 base58 char seeds from fxhash still work — `Hash` detects the `oo` prefix and routes them through the original sfc32 path unchanged. No existing URLs need to be updated.

All seed generation is handled by the single exported `createSeed()` from `utils/generative.ts`.
