# canvas.ts — open implementation tasks

## Ready to implement

### `halftone` method
- [x] Basic implementation done and working
- [ ] Export `rad` from `generative.ts` as a standalone pure function
- [ ] Add `curves` to `utils.math` in `generative.ts` (lift from existing `curveTransform` internals)
  - `linear`, `easeIn`, `easeOut`, `log`, `exp`
- [ ] Add `curve` shortcut to `shortcuts.ts`

### `grainLinearGradient` method
- [ ] Replace existing `grainFill` callback API at the call site (case 1 in `MyCell.draw`)
- [ ] Import `rad` from `generative.ts` internally for angle conversion
- [ ] Signature: `(at, width, height, stops, angle = 0, options?)`
- [ ] `angle` in degrees, defaults to `0` (horizontal, left→right)
- [ ] `options.rng` defaults to `Math.random`, accepts seeded rng

---

## Deferred — needs ImageData foundation first

### Pixel-buffer halftone
A second halftone variant operating at physical pixel resolution rather than logical spacing.
- Allocates offscreen canvas at `width * pixelRatio` × `height * pixelRatio`
- Iterates every physical pixel, thresholds against density function
- `drawImage` back with transform temporarily reset
- Gives maximum fineness — useful when `spacing: 1` is still too coarse
- Depends on a proper `ImageData` utility layer (read/write/composite)

---

## Longer horizon

### `grainFill` refactor
The existing `grainFill` callback API still works but is awkward — exposes `octx` to the caller.
- `grainLinearGradient` covers the linear gradient case
- A general `grainFill(fill: CanvasFill, ...)` accepting a plain color string would cover the solid case
- Radial grain, arbitrary gradient grain could follow the same pattern
- Low priority until repetition patterns emerge from sketch work

### Parametric curve factories
Named curves (`easeIn`, `log` etc.) are fixed at sensible defaults.
- `curve.pow(strength)` → `(t) => t ** strength`
- `curve.exp(strength)` → configurable steepness
- Defer until fixed curves feel limiting in practice
