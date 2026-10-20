# pixelate

Hover-reversible stepped pixelation for images, built for pages with hundreds
of them. Self-contained: plain ES modules, no dependencies, no imports outside
this folder. Copy the folder as-is.

```js
import { createPixelate } from './pixelate/index.js'

const px = createPixelate(container, {
  src: '/images/photo.webp',
  grain: 2,
  steps: 12,
  effects: [{ type: 'contrast', value: 1.4 }, { type: 'duotone', colors: ['#1a1a2e', '#eee4e1'] }]
})

await px.ready   // first paint (start grain)
px.enter()       // walk to clear
px.leave()       // walk back to start grain
px.destroy()
```

## Options

| option | default | |
|---|---|---|
| `src` | — | Image URL |
| `sources` | — | `[{ width, url }]`. Uses the smallest entry with `width >= display width × DPR`, else the largest |
| `grain` | `2` | Start grain: the number of pixels across the short side at the most pixelated step |
| `steps` | `12` | Steps from the start grain to clear |
| `easing` | `'log'` | `'linear'`, `'quadratic'`, `'log'`, or `t => t` |
| `interval` | `72` | ms per step |
| `effects` | `null` | `contrast`, `brightness`, `saturation`, `duotone` (`colors: [a, b]` or `['dominant', n]`), `posterize`, `threshold`, `invert` |
| `clearEffects` | `0` | Effect strength at clear: `0` = original image, `1` = keep the full effect look, in between = partially faded |
| `trigger` | `'self'` | `'self'` (the canvas) or any `HTMLElement` |
| `includeSelf` | `true` | When `trigger` is an element, also react to hovering the container |
| `lazy` | `{ rootMargin: '100%', releaseMargin: '300%' }` | Load and release distances |
| `workerUrl` | `null` | Worker script URL, for hosts where `new URL('./worker.js', import.meta.url)` doesn't resolve |

`createPixelate.defaults` holds the frozen defaults.

Effects are applied at full strength and then crossfaded with the original
pixels. The strength falls linearly per step, from 1 at the start grain to
`clearEffects` at clear. Every effect type fades gradually, including binary
ones like threshold and duotone. The canvas gets the classes `artwork-pixelate`, plus `pixelate-ready` once
painted. The container also gets `pixelate-ready`.

## How it works

- **Workers.** A pool of `clamp(cores - 1, 1, 4)` module workers does all the
  decoding, downscaling and effects. The main thread only calls `drawImage`.
  Each source sticks to the worker that decoded it.
- **Display-size decode.** Each source is decoded once at container width × DPR
  via `createImageBitmap(blob, { resizeWidth })`. When the browser ignores
  `resizeWidth`, the worker falls back to an `OffscreenCanvas` resize and logs
  this once.
- **Effects after the downscale.** Steps are point-sampled
  (`imageSmoothingEnabled = false`). The per-pixel effects commute with point
  sampling, so they run on the tiny buffer. Dominant duotone colours are taken
  once from the full source. The clear step is a clone of the source, unless
  `clearEffects > 0`; then it is rendered at full size with the effects
  applied.
- **Memory.** An image loads when it comes within `rootMargin`. When it moves
  beyond `releaseMargin`, all its step bitmaps are closed, the canvas backing
  store shrinks to 1×1 (a CSS `aspect-ratio` keeps the layout), and the source
  is released. Coming back reloads it. Sources are refcounted, and the actual
  release waits ~1.5 s, so destroying and recreating with the same image
  doesn't re-decode.
- **Resize.** If the container grows by more than 25 %, the image reloads at the
  new size. Shrinking keeps the current bitmaps.
- `destroyPool()` terminates the workers. It is meant for tests and teardown;
  the next `createPixelate` starts a new pool.

## Stepper

`createStepper` is renderer-agnostic, so it can drive other stepped effects:

```js
import { createStepper } from './pixelate/index.js'

const stepper = createStepper({ count, start: count - 1, interval: 72, onStep: async (i, signal) => { /* render step i */ } })
stepper.to(0)        // walks from the current index; a new to() aborts the running walk
stepper.current
stepper.destroy()
```
