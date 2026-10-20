# Spec: Migrate Pixelate into coding-gallery (with worker rewrite)

## Context

The pixelation hover effect lives in a separate repo next to this one
(`../Pixelate`). Its engine is already framework-free JS in `../Pixelate/lib/`;
the Nuxt app there is only a playground shell (`app/composables/usePlayground.ts`
+ components) that builds an options object and calls `new Pixelate(...)`.

The effect was built for a website with **hundreds of images per page**. The
current implementation does most of the expensive work on the main thread:

- `LoadingManager.generateGrain()` runs `drawImage` + `getImageData` on the
  **full-resolution** image, once **per step**, on the main thread.
- `chainEffects()` loops over every full-resolution pixel, per step, on the
  main thread.
- The resulting `ImageData` is structured-cloned to the worker and back.
- The worker only does the downscale — the cheapest part.

Goal: a rewritten, portable module that lives in this repo, is used by a
gallery project, and can later be dropped into the website as-is.

Read before starting:
`../Pixelate/lib/Pixelate.js`, `LoadingManager.js`, `PixelationWorker.js`,
`effects.js`, `grainGenerator.js`, `config.js`, and
`../Pixelate/app/composables/usePlayground.ts` (control surface).

---

## Non-goals (do not do these)

- No new framework technique (`dom` etc.). Use the existing `init` escape hatch.
- No changes to `runtime/`, `components/`, `composables/`, `types/` or `utils/`.
- No TypeScript in the module. Plain ES modules + JSDoc, like sketches.
- No new dependencies.
- Do not "improve" the look. Point-sampled pixelation (smoothing off) is the
  look and must be preserved.
- Do not port the playground Vue components.

---

## Key insight the rewrite relies on

Pixelation is a **point-sampled** downscale (`imageSmoothingEnabled = false`).
Every effect except dominant-colour extraction is **per-pixel**
(contrast, brightness, saturation, posterize, threshold, invert, fixed-colour
duotone). Per-pixel ops commute with point sampling, so:

> **Apply effects after the downscale, on the tiny buffer.** Identical output,
> a fraction of the cost.

Plus:

- **Decode once, at display size** (container width × DPR), not native size.
- **Never render `full`.** Step 0 is the display-size source bitmap itself.

---

## Target layout

```
lib/pixelate/
  index.js     — createPixelate(container, options) → instance API (main thread)
  stepper.js   — reversible, interruptible step walker (main thread, generic)
  steps.js     — generateGrainSteps + findGrainIndex (port of grainGenerator.js)
  effects.js   — per-pixel effects + chainEffects + scaleEffects (single copy)
  pool.js      — worker pool, request/response by id, transfer handling
  worker.js    — module worker: decode, render step, release
  README.md    — short usage doc (replaces the four lib/*.md files)

projects/pixelate/
  project.config.ts
  images/      — 2–3 images copied from ../Pixelate/public/images (see decisions)
```

`lib/` is at repo root on purpose: outside `utils/` so Nuxt does not
auto-import it, and so it stays a self-contained, copyable folder.
Import it as `~/lib/pixelate`.

`lib/pixelate/` must not import anything outside itself.

---

## 1. `steps.js`

Port `grainGenerator.js` unchanged in behaviour (`generateGrainSteps`,
`findGrainIndex`, `easingPresets`).

One semantic change: `shortSide` passed in is now the **display-size source**
short side, not the native image short side. (More grains than displayed
pixels is pointless, so this is the correct cap.)

## 2. `effects.js`

Port `effects.js`. Move `scaleEffects(effects, strength)` here as the **single**
copy (it currently exists twice: `Pixelate.js` — unused — and
`LoadingManager.js`). Keep `getEffectStrengthForGrain` logic (linear from start
grain → full) as a pure function here too.

Must be importable from both main thread and worker (no DOM access).

## 3. `stepper.js` — generic, reused later by other effects

The reversible hover walk is the reusable part (a text dither/blur effect will
use the same stepper with a different renderer). Keep it renderer-agnostic.

```js
const stepper = createStepper({
  count,          // number of steps (index 0 = target/clear, count-1 = start)
  start,          // initial index
  interval,       // ms per step
  onStep          // async (index, signal) => void — awaited before next step
})
stepper.to(index) // walk from current index toward index; aborts any running walk
stepper.current   // current index
stepper.destroy() // aborts, no further onStep calls
```

Behaviour to preserve from `animateToFull` / `animateToOriginal`:
- Walk starts from the **current** index (interrupting mid-walk reverses smoothly).
- A new `to()` aborts the previous walk via `AbortController`.
- Each step: `await onStep(i)`, then wait `interval` ms (rAF + setTimeout is fine).

## 4. `worker.js` + `pool.js`

### Worker (module worker)

Holds decoded sources in a `Map<sourceKey, ImageBitmap>`, where
`sourceKey = url + '@' + targetWidth`. Messages (all carry a request `rid`):

| in | does | out |
|---|---|---|
| `load { rid, key, url, targetWidth }` | `fetch` → `blob` → `createImageBitmap(blob, { resizeWidth: targetWidth, resizeQuality: 'high' })`. If `resizeWidth` unsupported, decode then resize via `OffscreenCanvas`. Cache under `key`. Reuse if already cached. | `{ rid, width, height }` |
| `render { rid, key, grain, effects }` | `grain === 'full'`: return `createImageBitmap(source)` (clone). Else: point-sampled downscale on `OffscreenCanvas` (same maths as current `processImage`: `scale = shortSide / grain`, `ceil(w/scale) × ceil(h/scale)`), `getImageData`, `chainEffects`, `putImageData`, `transferToImageBitmap()`. `effects` arrive already strength-scaled. Resolve `['dominant', n]` duotone colours here (once per `key`, cached) via `extractDominantColors` on the source. | `{ rid, bitmap }` — **transfer** the bitmap |
| `release { key }` | `close()` and delete the source. | — |

Every request must reply, including on failure: `{ rid, error }`.
(The current worker throws outside its `try` on bad dimensions and never
replies — the caller's promise hangs.)

Create with `new Worker(new URL('./worker.js', import.meta.url), { type: 'module' })`.

### Pool

- Lazily created singleton; size `clamp(navigator.hardwareConcurrency - 1, 1, 4)`.
- **Sticky assignment**: a `key` always goes to the same worker (its source lives
  there). Assign round-robin on first `load`.
- `request(key, msg, transfer?) → Promise` keyed by `rid`. No `document`
  CustomEvent bus (remove the `grainReady` pattern).
- Export `destroyPool()` (terminates workers) for tests / teardown.
- Optional `workerUrl` override in options, for hosts where `import.meta.url`
  workers don't resolve.

## 5. `index.js` — `createPixelate(container, options)`

### Options (per instance — no global mutable config)

```js
{
  src,             // string URL, or
  sources,         // [{ width, url }] — picks smallest >= display width × DPR
  grain: 2,        // start grain (most pixelated)
  steps: 12,
  easing: 'log',   // 'linear' | 'quadratic' | 'log' | fn
  interval: 72,
  effects: null,   // same shape as today
  trigger: 'self', // 'self' | HTMLElement
  includeSelf: true,
  lazy: { rootMargin: '100%', releaseMargin: '300%' }
}
```

Export the defaults object as `createPixelate.defaults` (read-only usage).
The old `basename` + `-width` + `imagePath`/`imageExtension` convention is
**not** in the module; that becomes a small adapter on the website side.

### Instance

```js
const px = createPixelate(container, options)
px.enter()     // walk to clear (index 0)
px.leave()     // walk back to start grain
px.ready       // Promise, resolves after first paint
px.destroy()
```

### Behaviour

- Canvas backing size = **container size × DPR**, aspect from the source.
  CSS fit logic as today (landscape → width 100%, portrait → height 100%).
  `imageSmoothingEnabled = false` when drawing bitmaps.
- `ResizeObserver` on container: if display width grows > 25 %, re-`load` at the
  new width and regenerate steps (debounced). Shrinking: keep current bitmaps.
- Lazy via `IntersectionObserver` (`lazy.rootMargin`): on enter → `load`, compute
  grains with `steps.js`, request **all** steps (strength-scaled effects per
  step), paint start grain, resolve `ready`.
- Release via a second observer (`lazy.releaseMargin`): when far off-screen,
  `close()` all step bitmaps, send `release`, reset to unloaded. Re-entering
  reloads. This is what keeps hundreds of images memory-flat.
- Step bitmaps cached per instance in an array indexed by step. If the stepper
  reaches a step whose bitmap isn't ready, `onStep` awaits it.
- Use **pointer events** (`pointerenter` / `pointerleave`) instead of the
  mouse + touch pairs. (See decisions.)
- `destroy()`: `stepper.destroy()`, disconnect observers, remove listeners,
  `close()` bitmaps, `release` source, remove canvas. Must actually abort
  (current code calls `clearTimeout` on an `AbortController`).

### Drop

- `blurmultiplier` / CSS blur (dead: multiplier is 0).
- Duplicate `scaleEffects`, `Pixelate.grains` static legacy grains,
  `clearOldImageReferences`, `loadQueue`.

## 6. Gallery project — `projects/pixelate/project.config.ts`

Uses the `init` escape hatch (no sketches). **Write it as
`init: initPixelate`** (a named function), not method shorthand —
`scripts/validate-projects.mjs` detects init via `/init:\s*\w+/`.

```ts
const metadata = {
  "id": "pixelate",
  "title": "Pixelate",
  "description": "Hover-reversible stepped pixelation with pre-pixelation effects",
  "date": "2026-10",
  "tags": ["dom", "image", "interaction"],
  "prefersTheme": "light",
  "hidden": true
} satisfies ...
```

`initPixelate(container, context)`:
- Builds a centred wrapper inside `container`, calls `createPixelate`.
- Images: `import a from './images/<file>?url'` etc.; an `image` select control
  picks among them.
- Maps controls → options. On change: `destroy()` + recreate. Debounce 150 ms for
  sliders/colours (as the playground did); immediate for selects/toggles.
  Recreate is cheap because the worker caches decoded sources by `key`.
- Returns cleanup that destroys the instance.
- Ignores seed (nothing random here).

Controls (port of `usePlayground.ts`, grouped with `type: 'group'`):

| group | key | type | default | range |
|---|---|---|---|---|
| — | `image` | select | first image | — |
| Pixelation | `grain` | slider | 2 | 1–64, step 1 |
| Pixelation | `steps` | slider | 12 | 2–24, step 1 |
| Pixelation | `easing` | select | `log` | linear / quadratic / log |
| Pixelation | `interval` | slider | 72 | 16–300, step 1 (ms) |
| Effects | `contrast` | slider | 1 | 0–3, step 0.05 |
| Effects | `brightness` | slider | 0 | -128–128, step 1 |
| Effects | `saturation` | slider | 1 | 0–3, step 0.05 |
| Effects | `duotone` | select | `off` | off / colors / dominant |
| Effects | `duotoneA` / `duotoneB` | color | `#1a1a2e` / `#eee4e1` | `visibleWhenSelectKey: 'duotone'`, value `colors` |
| Effects | `posterize` / `posterizeLevels` | toggle / slider | false / 4 | 2–16 |
| Effects | `threshold` / `thresholdValue` | toggle / slider | false / 128 | 0–255 |
| Effects | `invert` | toggle | false | — |

Conditional visibility in `ControlPanel.vue` is **select-gated only**
(`isSelectGatedVisible`). That's why duotone is a select. Posterize/threshold
sliders stay always visible — do not extend the panel to support toggle gating.
`duotone: 'dominant'` → `{ type: 'duotone', colors: ['dominant', 2] }`.

Effects array is built in the same order as `usePlayground.ts`
(contrast, saturation, brightness, duotone, posterize, threshold, invert);
`null` when empty.

Then run `npm run generate:projects` and `npm run validate:projects`.

---

## Acceptance

- [ ] `lib/pixelate/` has no imports outside itself; no Vue/Nuxt references.
- [ ] Visual parity with the playground for the same image/settings, allowing for
      sampling differences from decoding at display size.
- [ ] Hover in, leave mid-walk → reverses from the current step without a jump.
- [ ] No `getImageData` / per-pixel loops on the main thread (check in the
      Performance panel: main thread only does `drawImage`).
- [ ] Stress page (temporary, not committed): 200 instances in a scroll grid.
      Smooth scroll; JS heap stays roughly flat after scrolling top → bottom → top.
- [ ] Changing a slider 20× in the gallery doesn't grow memory (old instances fully
      released).
- [ ] Safari, Chrome, Firefox current: works; note any `resizeWidth` fallback hit.
- [ ] `npm run validate:projects` passes; `vue-tsc` clean.

## Open decisions (Christoph)

1. **Pointer vs touch events.** Pointer events change touch behaviour slightly
   (`pointerleave` fires after lift, similar to current `touchend`). OK?
2. **Which images** go into `projects/pixelate/images/`. The playground originals
   are 1.4–2.3 MB JPGs; `e-rutishauser-1-2400.webp` is 200 KB. Suggest the webp
   plus one or two resized JPGs.
3. **`hidden: true`** to start with?
4. **Website adapter** (basename/size convention → `sources`) is a follow-up task,
   not part of this one.
