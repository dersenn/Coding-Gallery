# Pixelate Migration Audit

Date: 2026-10-20  
Scope: `lib/pixelate/*` (portable module), `projects/pixelate/project.config.ts` (gallery project)  
Spec: `docs/agent-tasks/PIXELATE_MIGRATION.md`

## Context

The source is the standalone repo `../Pixelate`. Its effect engine lives in `lib/`, and a Nuxt playground (`app/`) provides the UI. The effect is meant for a website with hundreds of images per page. In the original, decoding, effects and grain caching all ran on the main thread at full image resolution, once per step.

This is a **rewrite**, not a port. The module lives in `lib/pixelate/`, outside `utils/`, so Nuxt does not auto-import it and the folder can be copied to the website unchanged. The gallery project uses the `init` escape hatch and has no sketches.

## Findings

### keep

- `generateGrainSteps`, `findGrainIndex` and `easingPresets` are unchanged in behaviour (`steps.js`). One semantic change: `shortSide` is now the short side of the display-size source, not of the native image.
- The per-pixel effect maths is byte-identical (`effects.js`): contrast, saturation, brightness, duotone, posterize, threshold, invert, `extractDominantColors`, `chainEffects`.
- The effect strength curve still falls linearly per step from the start grain toward clear. How strength is applied changed after migration; see the post-migration notes.
- The point-sampled look (`imageSmoothingEnabled = false`) and the downscale maths (`scale = shortSide / grain`, `ceil(w/scale) × ceil(h/scale)`) are unchanged.
- The CSS fit logic is kept: landscape relative to the container uses width 100%, portrait uses height 100%.
- The `artwork-pixelate` and `pixelate-ready` class names are kept, so existing website CSS keeps working.
- Walk semantics are kept:
  - a walk starts from the current index;
  - on reversal the current step is re-painted first;
  - steps are paced with rAF plus `setTimeout(interval)`.
- The module does not use framework utilities (`context.utils`, `Canvas`, `theme`). It must stay self-contained so it can be dropped into the website, and it has no randomness, so seed state doesn't matter.

### replace now

**Worker architecture**
- Full-resolution `drawImage` plus `getImageData` plus `chainEffects` on the main thread, once per step, is replaced. Effects now run **after** the downscale, on the tiny buffer, in a worker. Per-pixel operations commute with point sampling, so the output is the same.
- Native-size decode through `<img>` is replaced by decoding in the worker with `createImageBitmap(blob, { resizeWidth })` at container width × DPR. If `resizeWidth` is ignored, the worker falls back to an `OffscreenCanvas` resize.
- The blob-string worker built from `Function.toString()` is replaced by a module worker created with `new Worker(new URL('./worker.js', import.meta.url))`. A `workerUrl` option overrides this for hosts where that doesn't resolve.
- The single worker that only downscaled is replaced by a pool of `clamp(cores - 1, 1, 4)` workers. Each source key sticks to the worker that decoded it.
- The `document` `grainReady` CustomEvent bus is replaced by `rid` request/response. Every request now replies, including failures. The old worker threw outside its `try` on bad dimensions and never replied, which left the caller's promise hanging.

**Structure**
- The global `PixelationConfig` and singleton `LoadingManager` are replaced by per-instance options. `createPixelate.defaults` is frozen.
- The two copies of `scaleEffects` (`Pixelate.js`, unused, and `LoadingManager.js`) were first merged into one copy in `effects.js`. After migration they were replaced by a crossfade (`applyEffects`); see the post-migration notes.
- `animateToFull` and `animateToOriginal` were duplicates. They are replaced by a generic `createStepper()`, which is renderer-agnostic and intended for reuse.

**Bugs and lifecycle**
- `destroy()` used to call `clearTimeout()` on an `AbortController`, so an animation never actually stopped. It now aborts and is idempotent.
- The mouse and touch listener pairs are replaced by `pointerenter` / `pointerleave`.
- `imageCache` and `grainCache` used to grow without bound. Full-resolution `ImageData` was kept per grain and strength and never freed. Memory is now bounded:
  - a release observer (`lazy.releaseMargin`, default `300%`) closes all step bitmaps;
  - it shrinks the canvas backing store to 1×1, with a CSS `aspect-ratio` keeping the layout;
  - it releases the worker source;
  - the image reloads when it comes back within `lazy.rootMargin`.

**Removed**
- The blur multiplier (dead code: the multiplier was 0).
- The legacy static `grains`.
- `clearOldImageReferences` and `loadQueue`.
- `generateEffectsCacheKey`.
- The `basename` + `-width` + `imagePath` / `imageExtension` URL convention.

**Gallery UI**
- The playground's Vue UI is replaced by the framework controls panel. The duotone toggle and the "extract dominant" button become one `duotone` select (`off` / `colors` / `dominant`), so the colour pickers can be select-gated.

**Additions beyond the spec**
- **Refcount + deferred release** in `pool.js`. Releasing a source waits about 1.5 s, and a new `load` of the same key cancels the release. Without this, the gallery's destroy-then-recreate on every control change would re-decode the image each time. It also makes two instances of the same image safe.
- **`contain: size` on the canvas.** The stress test found a feedback loop:
  1. The canvas backing store (display width × DPR) became its intrinsic size.
  2. That grew `1fr` grid columns.
  3. The ResizeObserver saw more than 25% growth and reloaded the image larger.
  4. The cycle repeated.

  The old code also set the backing size to the native image size, so it would have inflated such grids too.
- **Shared IntersectionObservers**, one per margin, so hundreds of instances don't each create two observers.

### deliberate behaviour changes

- **Dominant duotone colours.** They are now taken once per source from the unprocessed display-size image. Previously they were taken per step from the full-resolution image after contrast, saturation and brightness had been applied. This only differs when those effects are combined with `dominant`.
- **Decoding at display size.** Decoding uses `resizeQuality: 'high'`, which can shift point-sampled block colours slightly compared with sampling the native image.
- **Step 0 (clear).** It is a clone of the display-size source bitmap when `clearEffects` is 0. Otherwise it is rendered at full size with effects; see the post-migration notes.
- **Pre-generation.** All steps are requested at load, even without effects. Previously grains were generated lazily, and pre-generated only when effects were set.
- **Canvas backing size.** It is now the display-size source (container width × DPR) instead of the native image size.
- **Touch.** `pointerleave` fires after lift, or on scroll cancel, which is close to the previous `touchend`.
- **`ready`.** It resolves after the first paint and rejects if loading fails. It never settles if the instance is destroyed before its first paint.

### replace later

- **Website adapter.** It should map the website's `basename` + size list to `sources: [{ width, url }]`. This is a follow-up task, per decision 4 in the spec.
- **Move `stepper.js` out of `lib/pixelate/`** into a shared `lib/` location once its second consumer (the planned text dither/blur effect) exists.
- **Step-bitmap memory.** The steps near clear are almost display-size. One option is to request only the start step at load and the rest on first hover. Another is a smaller default `releaseMargin` on mobile. Measure on the website before changing either.

## Utility-first evidence

- Utilities/classes checked:
  - `ProjectContext` (`onControlChange`, `controls`)
  - the `init` escape hatch in `runtime/projectBootstrap.ts`
  - `ControlPanel.vue` visibility gating
  - `utils/canvas.ts` (`Canvas`)
  - `utils/color.ts`
  - `shortcuts(utils)`
  - `utils.seed`
- Logic type: sketch algorithm (stepped pixelation, effect chain, hover walk), plus portable DOM/worker infrastructure that has to live outside the framework.
- Chosen path: custom, in a self-contained `lib/pixelate/`. The framework is used only by the gallery shell (controls, `init` lifecycle).
- Classification:
  - keep: algorithms, look, class names;
  - replace now: threading, lifecycle, memory, events, UI;
  - replace later: website adapter, stepper location, step-memory tuning.
- Rationale:
  - The module must run unchanged on the website, so framework utilities (`Canvas`, colour helpers) can't be imported.
  - The effects must run inside a worker, which rules out DOM-bound helpers.
  - There is no randomness, so seeded utils are not relevant.

## Utility-gap backlog

These candidates were added to `docs/UTILITY_GAP_BACKLOG.md`:
- `dom-image-technique`: a first-class technique for DOM/image projects that need neither a canvas nor an SVG runtime. Deferred: the spec ruled out a new technique, and `init` covers it for now.
- `control-change-diff`: `onControlChange` passes only the full values, so `init` projects must diff against a snapshot themselves to choose between debouncing and recreating immediately.
- `control-visibility-naming`: `visibleWhenSelect*` also works with toggle keys, but the name suggests it is select-only, and this misled the spec.

## Assets

| Asset | Source | Destination | Runtime path |
|---|---|---|---|
| e-rutishauser-1-2400.webp (200 KB) | `../Pixelate/public/images/e-rutishauser-1-2400.webp` | `projects/pixelate/images/e-rutishauser-1-2400.webp` | Vite-hashed URL from `import … from './images/…?url'` |
| dsf6071-2400.jpg (~830 KB) | `../Pixelate/public/images/_DSF6071.jpg` (1.47 MB) | `projects/pixelate/images/dsf6071-2400.jpg` | as above |
| r001226-2400.jpg (~820 KB) | `../Pixelate/public/images/_R001226.jpg` (2.1 MB) | `projects/pixelate/images/r001226-2400.jpg` | as above |

The JPGs were resized with `sips -Z 2400 -s formatOptions 60`. Quality 80 still produced about 1.2 MB, because these are grainy photos. The images are imported per project with `?url` (as the spec requires) rather than served from `public/assets/`, since only this project uses them. This departs from asset rule 7 in `AGENT_PROMPT_PREAMBLES.md`.

## Verification (2026-10-20, headless Chromium, DPR 2)

| Check | Result |
|---|---|
| `npm run validate:projects` / `vue-tsc --noEmit` | pass / clean |
| `lib/pixelate` imports | only `./` imports; no Vue or Nuxt references |
| Hover walk | 12 distinct steps each way |
| Leave mid-walk | retraces the same steps (a palindrome sequence) and ends on the start frame |
| Main-thread `getImageData` | 0 calls, in the gallery and in the stress test |
| Destroy and recreate 20× | 1 image fetch; live bitmaps return to 0 after destroy |
| 200 instances, scroll top → bottom → top | frames p50 16.7 ms, max 17.8 ms; at most 60 instances loaded (the 300% margin); JS heap 4–5 MB throughout |
| Effects incl. `dominant` duotone | render correctly |
| `resizeWidth` fallback | not hit in Chromium |

The stress test injected the module into a blank page on the dev origin, so no stress page was committed.

## Known limits

- **Browsers.** Safari and Firefox have not been tested. Check for the one-time `[pixelate] createImageBitmap resizeWidth unsupported…` log.
- **`src` without `sources`.** The image is decoded at display width even when it is narrower than that, so it is upscaled. There is no way to cap it without a native-size decode. With `sources`, the target is capped at the chosen width.
- **Portrait image in a landscape container.** It is decoded at container width, which is larger than it is displayed.
- **Layout before first load.** Because of `contain: size`, an **auto-height** container gets no height from the canvas until the image loads. Containers should have a definite size or an `aspect-ratio`. The website adapter knows the image dimensions and should set it.
- **Zero-width containers.** An instance in a zero-width container waits for the ResizeObserver before it loads.
- **Delayed freeing.** Memory for a released source is freed about 1.5 s later, because of the grace period.

### post-migration notes

- 2026-10-20: `posterizeLevels` and `thresholdValue` are now gated on their toggles (`visibleWhenSelectKey: 'posterize' | 'threshold'`, `visibleWhenSelectValue: true`). The spec assumed visibility gating was select-only, but `isSelectGatedVisible` in `ControlPanel.vue` compares `String(value)`, so toggle keys work, as `this-is-water` already shows. This is a config-only change; the panel is unchanged. Duotone stays a select because it has three states (`off` / `colors` / `dominant`).
- 2026-10-20: Effects no longer jump to the original at the end of the hover walk. Measuring each step showed the cause: the inherited per-type `scaleEffects` dropped duotone below strength 0.3 and threshold below 0.5, so both snapped off mid-walk, and interpolating posterize levels toward 256 made it vanish within one or two steps. Contrast, saturation and brightness already faded smoothly.
  - **Fix:** `scaleEffects` is replaced by `applyEffects(imageData, effects, strength)`. It applies the effects at full strength, then crossfades RGB with the original pixels by `strength`. This is the same for every effect type, so all of them now fade gradually.
  - **Unchanged results:** contrast, saturation, brightness and invert are affine, so they give the same result as before, apart from clamping. The start grain (strength 1) is identical to before.
  - **New option `clearEffects`** (0–1, default 0): the effect strength at clear. Strength per step is `clear + (1 - clear) × index / startIndex`. At 0 the clear state is the original image; at 1 the effect look persists at full resolution. When it is above 0, step 0 is rendered at full size with effects in the worker, replacing the plain source clone.
  - **Gallery:** an "Effects at Clear" slider controls `clearEffects`.
  - This reverses the spec's "never render `full`" point: that holds only when nothing has to be applied at clear.
