# CLAUDE.md — Generative Art Framework

This file is the primary context source for Claude Code sessions.
Read this before touching any sketch or runtime code.

---

## Stack

- **Nuxt 4 / Vue** — framework shell
- **TypeScript** — framework and runtime layer only; sketches are plain JS
- **Techniques**: `svg`, `canvas2d`, `p5` (being phased out), `three` (planned)

---

## Core architecture

### ProjectContext

The stable interface between framework and sketch. Every sketch receives this as its argument.

```ts
{
  controls,        // current control values (read-only, live)
  utils,           // all utilities — noise, math, random, vectors etc.
  theme,           // palette, colors
  onControlChange, // register a callback for when controls change
  registerAction,  // register named actions (download-svg etc.)
  setControls,     // programmatically set control values without touching the URL
  runtime          // sketch-scoped runtime (animation loop, frame info)
}
```

**Never import utils directly in a sketch.** Always use `context.utils`.
This preserves seed state for deterministic noise and randomness.

### Sketch contract

A sketch is a JS module. The primary export is `draw()`:

```js
export function draw(context) {
  const { canvas, svg, utils, controls, theme, runtime } = context
  const { v, rnd, coin, map } = shortcuts(utils)
  // ...
}
```

Static sketches: `draw()` is called on mount and control changes.
Animated sketches: call `runtime.loop(fn)` inside `draw()` — see Animation below.

Optional exports:
```js
export const controls = [...]   // control definitions
export const container = 'full' // or ContainerConfig
```

### shortcuts()

Import `shortcuts` from `~/utils/shortcuts` at the top of `draw()` to get
flat access to the most common utils without verbosity:

```js
const { v, rnd, coin, map, noise2, simplex2 } = shortcuts(utils)
```

---

## Techniques

### SVG

- Retained-mode DOM. Nodes have identity and can be mutated.
- Draw context receives `svg` (SVG utility instance).
- Best for: static/on-demand output, low-element animation, exportable files.
- `svg.stage.replaceChildren()` is called automatically before each draw.

### canvas2d

- Immediate-mode pixel buffer.
- Draw context receives `canvas` (Canvas utility instance) and `ctx`.
- Best for: animation, high-density fields, anything performance-sensitive.

### p5 (legacy)

- Uses `init(container, context)` export instead of `draw()`.
- Being phased out. New sketches should use canvas2d or three.
- 2D work → canvas2d. 3D/WEBGL work → three (when available).

### three (planned)

- Peer technique alongside svg/canvas2d.
- Will use `draw()` contract with `runtime.loop()` for animation.

---

## Animation

Animated sketches opt in via `runtime.loop()`. The runtime owns the RAF loop,
pause handling, time accumulation, and cleanup on destroy.

```js
export function draw({ canvas, controls, runtime }) {
  runtime.loop(({ elapsed, delta, frame }) => {
    // elapsed: pause-compensated ms
    // delta:   ms since last frame
    // frame:   integer frame count
    const time = elapsed * controls.timeScale
    canvas.background(...)
    // draw per-frame content
  })
}
```

- `runtime.loop()` is called once inside `draw()` — it registers the tick fn.
- Controls are read inside the tick each frame — no need to re-register on change.
- The loop stops automatically when the sketch is destroyed (layer switch, unmount).

---

## Grid / Cell pattern

`Grid` and `GridCell` from `~/types/project` are the base classes.
Subclass `GridCell` for per-cell state and draw logic.
For simple rendering without state, use a closure instead of a subclass.

```js
const drawCell = (cell, canvas, settings) => {
  canvas.rect(cell.tl(), cell.width, cell.height, fill)
}
grid.forEach(cell => drawCell(cell, canvas, settings))
```

Access `utils` via `this.grid.utils` inside GridCell subclasses
(grid receives utils at construction time).

---

## Controls

Defined as an exported array from the sketch:

```js
export const controls = [
  { type: 'slider', key: 'speed', label: 'Speed', default: 1, min: 0, max: 3, step: 0.1 }
]
```

Access current values via `context.controls.speed` (or via destructured `controls`).
Use `const c = controls` at top of draw for shorthand.

### setControls

Use `context.setControls(updates)` to programmatically override control values from inside a sketch — for init-time randomisation, viewport-responsive defaults, or any one-time setup:

```js
context.setControls([
  { key: 'density', value: Math.random() * 0.8 + 0.1 },
  { key: 'columns', value: frame.width > frame.height ? 12 : 6 },
])
```

Values update the control panel UI immediately. No URL change occurs.

**Do not call `setControls` on every frame** — it is intended for one-time setup (top of `draw()`, orientation change, etc.), not per-frame logic.

---

## What to avoid

- Importing noise/random functions directly (breaks seed state)
- `resolveSettings()` or defensive coercion blocks duplicating control defaults
- A `SET` object duplicating control defaults outside of `draw()`
- Subclassing Grid/GridCell just for draw logic when a closure suffices
- Rolling your own RAF loop in a sketch (use `runtime.loop()`)
- TypeScript in sketch files

---

## Key files

```
runtime/
  sketchRuntime.ts          — manager, layer switching, resize
  sketchRuntime.canvas2d.ts — canvas2d technique adapter
  sketchRuntime.svg.ts      — SVG technique adapter
  sketchRuntime.p5.ts       — p5 technique adapter (legacy)
  projectBootstrap.ts       — wires ProjectDefinition → runtimes

utils/
  shortcuts.ts              — flat destructuring helper for utils
  canvas.ts                 — Canvas utility class
  svg.ts                    — SVG utility class

types/
  project.ts                — ProjectContext, Grid, GridCell, all core types
```

---

## Reference sketches

- `grid-3.js` — canonical minimal pattern: closures, shortcuts, wave-driven subdivision
- `grid-2.js` — fuller example: three subdivision modes, helper functions
- `this-is-water.js` — animated canvas2d sketch (currently has own RAF loop;
  migration to `runtime.loop()` pending)
