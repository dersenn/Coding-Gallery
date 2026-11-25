# CLAUDE.md — Generative Art Framework

Primary context for agent sessions. Read before touching sketch or runtime code.

When in doubt, **match the reference sketches** below rather than inventing
structure. Prefer simple, readable, tinkerable code over clever or generic
solutions. Don't add abstractions, helpers or options that weren't asked for.

**Check the framework utils before writing anything new** (`utils/shortcuts.ts`
first, then `utils/*.ts`). They exist to keep sketches uniform: noise fields,
vectors, lerp/divLength, Path builders, svg/canvas drawing primitives, grid
neighbours. Reuse them, even if a local version would be a few lines shorter.
If something is genuinely missing, write it locally in the sketch and flag it
as a candidate for `docs/UTILITY_GAP_BACKLOG.md` — don't add it to the
framework unasked.

---

## Stack

- **Nuxt 4 / Vue** — framework shell
- **TypeScript** — framework and runtime layer only; sketches are plain JS
- **Techniques**: `canvas2d`, `svg`, `p5` (legacy, being phased out), `three` (planned)

---

## ProjectContext

Every sketch's `draw()` receives this:

```ts
{
  controls,        // current control values (read-only, live)
  utils,           // all utilities — noise, math, random, vectors etc.
  theme,           // palette, colors
  onControlChange, // register a callback for when controls change
  registerAction,  // register named actions (download-svg etc.)
  setControls,     // programmatically set control values without touching the URL
  runtime,         // sketch-scoped runtime (animation loop, frame info)
  canvas | svg     // technique instance (with .print when a print contract is set)
}
```

**Never import noise/random utils directly.** Use `shortcuts(utils)` /
`context.utils` — they are seeded instances; bypassing them breaks determinism.

---

## Sketch structure

Files are ordered top to bottom:

1. imports
2. module-level pure helpers (math, small functions with no renderer dependency)
3. `MyGrid` / `MyCell` classes (grid sketches)
4. `export function draw(context)`

Inside `draw()`, in this order, with short uppercase section comments:

```js
export function draw(context) {
  const { canvas, utils, controls: c } = context
  const { v, rnd, rndInt } = shortcuts(utils)
  if (!canvas) return

  const { mm, pt } = canvas.print

  const border = { top: mm(12), right: mm(12), bottom: mm(18), left: mm(12) }
  // other local settings / constants

  // GRID
  const grid = new MyGrid({ cols, rows, x: border.left, y: border.top, width, height, utils })
  const terminals = grid.subdivide({ maxLevel: 1, rule: (cell, level) => ... })

  // (named build steps, e.g. // NOISE, // WARPING NOISE …)

  // DRAWING
  canvas.background('#fff')
  terminals.forEach(cell => cell.draw(canvas, ...))
}
```

- `controls: c` alias; read controls directly as `c.key`.
- `mm()` / `pt()` only exist via `canvas.print` / `svg.print`, i.e. inside
  `draw()`. Anything in physical units is computed there and passed in.

### Build, then draw

Compute structure first, render last. The DRAWING section only consumes
what was built.

- Grid sketches: build steps are grid/cell methods that set state
  (`cell.noise = cell.noiseSample(...)`, `grid.warpLattice(...)`), then
  `cell.draw()` renders. See `grid-lattice-1.js`.
- Non-grid sketches: a `build…()` function returning plain data, then a
  render step. See `lattice-drift.js`.

---

## Grid / Cell pattern

The standard for grid-based sketches: extend `Grid` and `GridCell` so each
cell holds its own state and draws itself using its own geometry.

```js
class MyGrid extends Grid {
  createCell(config) {
    return new MyCell(config)
  }
}

class MyCell extends GridCell {
  constructor(config) {
    super(config)
    this.noise = 0
  }

  draw(canvas, color, spacing) {
    const { rnd } = shortcuts(this.grid.utils)
    canvas.halftone(this.tl(), this.width, this.height, color, density, { spacing, rng: rnd })
  }
}
```

- Use the cell's own geometry: `x`, `y`, `width`, `height`, `tl()`, `tr()`,
  `bl()`, `br()`, `center()`; neighbours via `getNeighbor()` / `getNeighbors()`.
- Utils inside cells: `shortcuts(this.grid.utils)`.
- Per-cell variants: a `switch` inside `cell.draw()` (see `patchwork-1.js`,
  `grid-fade-3.js`) — one readable place to tinker.
- Pass draw-time values (colors, spacing, style) as arguments to `cell.draw()`.

---

## Techniques

### canvas2d
- Immediate-mode. `draw()` receives `canvas` (Canvas utility instance).
- Animation, high-density fields, halftones.

### svg
- Retained-mode DOM. `draw()` receives `svg`. `svg.stage.replaceChildren()`
  runs automatically before each draw.
- Print/plotter sketches use a print contract with `dpi: 25.4, target: 'svg'`
  → 1 viewBox unit = 1 mm.
- Plotter output: strokes only, no fills. Paper colour via
  `svg.stage.style.background`, never a background `<rect>` (it would be
  plotted). One `<g>` per pen (`id="pen-1"`), sub-groups as needed.
- Export via the `download-svg` action.

### p5 (legacy)
- `init(container, context)` instead of `draw()`. No new p5 sketches:
  2D → canvas2d, 3D → three (when available).

---

## Animation

Opt in via `runtime.loop()` inside `draw()`. The runtime owns RAF, pause,
time accumulation and cleanup.

```js
runtime.loop(({ elapsed, delta, frame }) => {
  canvas.background(...)
  // per-frame content; read controls here, no re-registering needed
})
```

---

## Controls

Defined in the project's `project.config.ts`, one array per sketch:

```ts
{ type: 'slider', key: 'speed', label: 'Speed', default: 1, min: 0, max: 3, step: 0.1 }
```

Groups: `{ type: 'group', id, label, defaultOpen, controls: [...] }`.
`randomize: true` opts a control into the randomise button.

`context.setControls([{ key, value }])` sets values programmatically (init-time
randomisation, viewport-responsive defaults). Updates the UI, not the URL.
Never call it per frame.

### Project config order

`*_CONTROLS` arrays → `metadata` → `CONTAINER` / `DEFAULT_TECHNIQUE` /
`CONTROLS` / `ACTIONS` → `SKETCHES` → `definition` → `export default`.

---

## What to avoid

- Importing noise/random functions directly (breaks seed state)
- Defensive coercion / fallbacks duplicating control defaults
  (`c.cols ?? 80`, `resolveSettings()`, a `SET` object mirroring controls)
- Rolling your own RAF loop (use `runtime.loop()`)
- TypeScript in sketch files
- Re-implementing something that already exists in `utils/`
- Generic machinery where a direct version is readable (e.g. arbitrary-angle
  clipping when only 0/90/45° are needed)
- Restructuring a sketch into a style that differs from the references

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
  grid.ts                   — Grid, GridCell (subdivide, neighbours)
  cell.ts                   — Cell base (tl/tr/bl/br/center)
  canvas.ts                 — Canvas utility class
  svg.ts                    — SVG utility class
  download.ts               — export metadata (buildExportMetadata), SVG serialisation
  png.ts                    — PNG chunks: pHYs DPI + iTXt export metadata (write/read)

composables/
  useRestoreFromFile.ts     — drop a PNG/SVG export on the app to restore seed + controls

types/
  project.ts                — ProjectContext and core types (re-exports Grid/GridCell)
```

---

## Reference sketches

- `grid-almighty/grid-fade-3.js` — minimal MyGrid/MyCell, switch in `cell.draw()`
- `patchwork/patchwork-1.js` — fuller: cell state, noise sample → normalise → bucket → switch
- `grid-almighty/grid-lattice-1.js` — build steps as grid methods, then DRAWING
- `bezier-lab/lattice-drift.js` — non-grid build/render separation
- `on-lines/grid-lattice-svg.js` — SVG/plotter: mm units, pen groups, no background rect
