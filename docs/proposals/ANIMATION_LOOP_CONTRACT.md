# Animation Loop Contract

## Goal

Move all RAF loop infrastructure out of sketch code and into the runtime.
Sketches opt in to animation by calling `runtime.loop(fn)`.

---

## The problem with the current state

Animated sketches (e.g. `this-is-water.js`) currently manage:
- `requestAnimationFrame` / `cancelAnimationFrame`
- Pause state tracking
- Pause-compensated time accumulation
- Disconnect detection (`canvas.el.isConnected`)
- WeakMap bookkeeping to prevent double-mount
- Integration with `runtime.onPauseChange`

None of this belongs in sketch code. It's boilerplate that will be
copy-pasted or subtly broken across every animated sketch.

---

## Proposed contract

### Sketch side

```js
export function draw({ canvas, controls, runtime }) {
  runtime.loop(({ elapsed, delta, frame }) => {
    const time = elapsed * controls.timeScale
    canvas.background(...)
    // per-frame drawing
  })
}
```

`runtime.loop(fn)` is called **once** inside `draw()`. It registers the tick
function and starts the RAF loop. The sketch never calls RAF directly.

### Tick state passed to fn

```ts
interface SketchLoopState {
  elapsed: number   // pause-compensated time in ms since loop start
  delta:   number   // ms since last frame (useful for physics, speed scaling)
  frame:   number   // integer frame count from 0
}
```

Time scaling (e.g. `controls.speed`) is the sketch's responsibility.
The runtime passes raw values and stays generic.

---

## Runtime responsibilities

| Concern                  | Owner          |
|--------------------------|----------------|
| RAF start / stop         | runtime        |
| Pause compensation       | runtime        |
| Disconnect detection     | runtime        |
| Loop cleanup on destroy  | runtime        |
| Skip redraw on resize    | runtime        |
| Time scaling             | sketch         |
| What to draw             | sketch         |

---

## Integration points

### createLoopManager()

A small internal utility, one instance per sketch mount:

```ts
interface LoopState {
  elapsed: number
  delta: number
  frame: number
}

interface LoopManager {
  register: (fn: (state: LoopState) => void) => void
  pause: () => void
  resume: () => void
  stop: () => void   // called by runtime destroy
}
```

### Where it lives

`createLoopManager()` is created inside each technique runtime
(`createCanvas2dSketchRuntime`, `createSvgSketchRuntime`) and exposed
as `animation` on the returned `SingleActiveSketchRuntime`.

The bootstrap merges `animation` into `context.runtime` before
calling `draw()` on the sketch.

### Cleanup on destroy

`SingleActiveSketchRuntime.destroy()` already exists and is called by
the manager on layer switch or unmount. Loop cleanup hooks in here:

```ts
destroy: () => {
  loopManager.stop()   // cancels RAF, no further ticks
  canvas.el.remove()
}
```

No sketch-side cleanup needed. The loop just stops.

---

## Effect on bootstrap / control changes

Currently bootstrap calls `draw()` on mount **and** on every control change.
For animated sketches this would re-register the loop on every control change,
which is wrong.

Solution: `runtime.loop()` is **idempotent** — calling it a second time on
an already-running loop is a no-op. The sketch re-calls `draw()` on control
change but the loop doesn't restart. Controls are read inside the tick each
frame anyway, so changes take effect immediately.

For static sketches that don't call `runtime.loop()`, the existing
imperative redraw on control change continues to work unchanged.

---

## Pause API

The existing partial API (`enablePause`, `onPauseChange`, `paused`) on
`context.runtime` gets unified into the loop manager:

```ts
runtime.loop(fn)         // register + start
runtime.pause()          // pause (elapsed stops accumulating)
runtime.resume()         // resume
// paused state readable via runtime.paused
```

`enablePause()` call from sketch becomes unnecessary — the UI pause control
connects directly to the runtime's loop manager.

---

## Migration path

1. Implement `createLoopManager()` as standalone utility
2. Wire into `createCanvas2dSketchRuntime` first (most relevant technique)
3. Expose via `context.runtime.loop` in bootstrap
4. Migrate `this-is-water.js` as the first test case — good complexity benchmark
5. Add to SVG runtime (lower priority, SVG animation is rare)
6. Three.js runtime gets it natively when built

---

## What the water sketch becomes

Before (~80 lines of infrastructure):
```js
const LOOP_BY_CANVAS = new WeakMap()
// ... RAF management, pause tracking, disconnect detection,
// WeakMap bookkeeping, onPauseChange integration
```

After:
```js
export function draw({ canvas, controls, utils, theme, runtime }) {
  runtime.loop(({ elapsed }) => {
    const settings = getSettings(controls, theme)
    const time = elapsed * settings.timeScale
    const grid = resolveGrid(canvas, settings, utils)
    canvas.background(...)
    grid.forEach(cell => cell.draw(canvas, settings, time, theme))
  })
}
```

Loop infrastructure: gone. Sketch logic: unchanged.
