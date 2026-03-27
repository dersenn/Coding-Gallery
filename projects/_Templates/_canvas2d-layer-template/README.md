# Canvas2D Sketch Template

Canonical template for canvas2d sketches with an animation loop. Uses the modern sketch-based `draw(context)` pattern — the same approach used in **all-that-noise** and **grid-almighty**.

Use this template for: animated sketches, noise fields, grid animations, anything with a RAF loop.
For quick static sketches without animation, `_canvas2d-template/` (init pattern) is lighter.

## Quick Start

1. **Copy this folder** and rename it:
   ```bash
   cp -r projects/_Templates/_canvas2d-sketch-template projects/sandbox/my-sketch
   ```

2. **Rename the sketch ID and module** in `project.config.ts`:
   ```ts
   {
     id: 'my-sketch',           // used in URL params + sketch switcher
     label: 'My Sketch',
     module: './sketches/my-sketch.js',  // rename sketches/sketch-1.js to match
     ...
   }
   ```

3. **Add your sketch code** in `sketches/sketch-1.js` (or your renamed file)
   inside the `draw(context)` function, between the marked comment lines.

4. **Add metadata** to `data/projects.json`:
   ```json
   {
     "id": "my-sketch",
     "title": "My Sketch",
     "description": "What this sketch does",
     "date": "2026-03",
     "tags": ["canvas2d", "generative"],
     "entryFile": "/projects/sandbox/my-sketch/index.ts",
     "configFile": "/projects/sandbox/my-sketch/project.config.ts"
   }
   ```

5. **Run and test**:
   ```bash
   npm run dev
   ```
   Navigate to `http://localhost:3000/my-sketch`

## Project Structure

```
my-sketch/
├── project.config.ts   # ProjectDefinition with sketches[], controls, metadata
├── index.ts            # Empty stub (runtime uses project.config.ts)
└── sketches/
    └── sketch-1.js      # export function draw(context) { ... }
```

## How the Sketch Runtime Works

`draw(context)` is called **once on mount**. You start your own RAF loop inside it:

```js
const LOOP_BY_CANVAS = new WeakMap()

export function draw(context) {
  const { canvas } = context
  if (LOOP_BY_CANVAS.has(canvas.el)) return  // prevent double-start

  const tick = () => {
    if (!canvas.el.isConnected) {
      LOOP_BY_CANVAS.delete(canvas.el)
      return
    }
    // draw frame
    requestAnimationFrame(tick)
  }

  LOOP_BY_CANVAS.set(canvas.el, true)
  requestAnimationFrame(tick)
}
```

The runtime handles:
- **Resize** — calls `draw()` again when the container changes size
- **Cleanup** — canvas removed from DOM; `isConnected` check stops the loop
- **Sketch switching** — old canvas removed, new one mounted and `draw()` called fresh

`draw()` is also called again on control changes, so the loop re-initialises with the new settings. The `LOOP_BY_CANVAS` guard prevents duplicate loops.

## Controls

Define controls in `project.config.ts` and access them via `context.controls`:

```js
// In sketches/sketch-1.js:
export function draw(context) {
  const { controls } = context
  const count = controls?.count ?? 40   // always provide a fallback default
  const speed = controls?.speed ?? 1
}
```

Define in `project.config.ts`:
```ts
const CONTROLS: ProjectControlDefinition[] = [
  {
    type: 'group',
    id: 'composition',
    label: 'Composition',
    collapsible: true,
    defaultOpen: true,
    controls: [
      { type: 'slider', label: 'Count', key: 'count', default: 40, min: 5, max: 200, step: 1 },
      { type: 'slider', label: 'Speed', key: 'speed', default: 1, min: 0.1, max: 5, step: 0.1 }
    ]
  }
]
```

Control groups:
- `Grid` — layout, dimensions, spacing
- `Noise` — frequency, amplitude, octaves, lacunarity, persistence
- `Color` — palette choice, color steps, color mode
- `Motion` — speed, phase, animation toggles
- `Display` — debug overlays, labels, helpers

## Theme

Projects receive shared color tokens via `context.theme`:

```js
theme.background  // canvas base
theme.foreground  // default text/stroke
theme.annotation  // helper lines/labels/debug
theme.outline     // high-contrast stroke fallback
theme.palette     // array of colors ['#...', ...]
```

## Utilities

All projects have `context.utils` and can use `shortcuts(utils)` for ergonomic aliases:

```js
import { shortcuts } from '~/types/project'

export function draw(context) {
  const { utils } = context
  const { v, rnd, rndInt, map, lerp, clamp, noise2, simplex2, shuffle } = shortcuts(utils)

  // Seeded random (deterministic per seed)
  const x = rnd() * canvas.w
  const i = rndInt(0, 10)
  const flip = utils.seed.coinToss(50)  // 50% chance

  // Noise
  const n = noise2(x * 0.01, y * 0.01)      // Perlin, 0→1
  const s = simplex2(x * 0.01, y * 0.01)    // Simplex, -1→1

  // Math
  const m = map(n, 0, 1, 10, 80)
  const c = clamp(m, 0, 100)
  const t = lerp(0, 100, 0.5)

  // Vectors
  const center = v(canvas.w / 2, canvas.h / 2)
}
```

For reproducible frames: call `utils.seed.reset()` at the top of each tick to restore
the PRNG to its seed position, so control changes don't alter the random structure.

## Pause / Resume

Opt into the viewer pause button by calling `runtime?.enablePause?.()` once in `draw()`.
Then skip rendering when paused:

```js
export function draw(context) {
  const { canvas, runtime } = context
  runtime?.enablePause?.()

  const tick = () => {
    if (!canvas.el.isConnected) return
    if (!runtime?.paused) {
      // render frame
    }
    requestAnimationFrame(tick)
  }
  requestAnimationFrame(tick)
}
```

For time-based animations that need to stay in sync after unpausing:

```js
let timeOffset = 0
let pausedAt = 0

runtime?.onPauseChange?.((isPaused) => {
  if (isPaused) pausedAt = performance.now()
  else timeOffset += performance.now() - pausedAt
})

// In tick:
const elapsed = (performance.now() - timeOffset) * speed
```

## Canvas API

```js
canvas.background(theme.background)          // fill entire canvas
canvas.circle(v(x, y), r, fill, stroke, sw) // circle
canvas.rect(v(x, y), w, h, fill, stroke, sw) // rect (top-left origin)
canvas.rectC(v(cx, cy), w, h, fill, stroke, sw) // rect (center origin)
canvas.line(v(x1, y1), v(x2, y2), stroke, sw)   // line
canvas.text(str, v(x, y), color, options)        // text

// Grid overlay (no doubled center seams)
canvas.gridLines(v(x, y), w, h, cols, rows, stroke, sw, { strokeAlign: 'inside' })

// Subdivided cell boundaries (deduplicates shared edges)
canvas.cellEdges(cells, stroke, sw, { strokeAlign: 'inside', includeOuter: false })
```

`canvas.c` is the center Vec, `canvas.w` and `canvas.h` are pixel dimensions.

## Multiple Sketches

To add a second sketch, add another entry to `SKETCHES` in `project.config.ts` and create
a corresponding module in `sketches/`. Use a `select` control keyed `activeSketch` to let
users switch:

```ts
const SKETCHES = [
  { id: 'sketch-a', ..., module: './sketches/sketch-a.js', defaultActive: true },
  { id: 'sketch-b', ..., module: './sketches/sketch-b.js' }
]
```

The viewer auto-generates a sketch switcher when multiple sketches are defined.

## Keyboard Shortcuts

- **n** — new seed (keeps current controls)
- **r** — reload sketch
- **d** — reset controls to defaults
- **Space** — pause/play (when `enablePause()` is called)

## See Also

- Main README: `/README.md` — framework overview, utility API reference
- Canvas drawing API: `/docs/CANVAS_DRAWING_UTILITY.md`
- Grid/Cell guide: `/docs/GRID_CELL_EXTENSION.md`
- Container sizing: `/docs/CONTAINER_UTILITY.md`
- Simple static sketch (init pattern): `projects/_Templates/_canvas2d-template/`
