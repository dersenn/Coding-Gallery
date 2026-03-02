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
- `random()` - float in `[0, 1)`
- `randomRange(min, max)` - float in range
- `randomInt(min, max)` - integer in range
- `coinToss(chance)` - probabilistic boolean

Noise is seed-synchronized via `context.utils.noise.*`.

## Best practices

- Prefer URL seed flow; avoid overriding seeds unless needed.
- Do not use `Math.random()` in deterministic sketches.
- Log/share seed URLs for reproducible renders.

## Troubleshooting checklist

- URL has valid `?seed=...`.
- No code overrides seed unexpectedly.
- All random/noise values come from `utils.seed` / `utils.noise`.
- Project-page shortcut handler is active (`components/ProjectRouteView.vue`, used by both `pages/[id].vue` and `pages/project/[id].vue`).

## Related docs

- Main docs: `../README.md`
- Docs index: `INDEX.md`
- Template guide: `../projects/_Templates/_template/README.md`
