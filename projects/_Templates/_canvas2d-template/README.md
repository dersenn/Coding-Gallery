# Canvas2D Template (init pattern)

Lightweight template for canvas2d sketches using the `init()` pattern — a single function that runs once, sets up the canvas, and optionally handles control changes and resize.

Use this template for: static/single-draw sketches, quick experiments, and sketches without a continuous animation loop.
For animated sketches (RAF loop, noise fields, physics), use `_canvas2d-sketch-template/` instead — it gives you automatic resize, cleaner lifecycle, and built-in pause support.

## Quick Start

1. **Copy this folder** and rename it:
   ```bash
   cp -r projects/_Templates/_canvas2d-template projects/sandbox/my-sketch
   ```

2. **Edit `index.ts`** — add controls and implement `init()`

3. **Add metadata** to `data/projects.json`:
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

4. **Run and test**:
   ```bash
   npm run dev
   ```
   Navigate to `http://localhost:3000/my-sketch`

## Project Structure

```
my-sketch/
├── index.ts           # Controls, init function, sketch code
└── project.config.ts  # ProjectDefinition (metadata + re-exports from index.ts)
```

## Controls

Define controls at module scope and access them via `context.controls`:

```typescript
export const controls: ProjectControlDefinition[] = [
  {
    type: 'group',
    id: 'composition',
    label: 'Composition',
    collapsible: true,
    defaultOpen: true,
    controls: [
      { type: 'slider', label: 'Count', key: 'count', default: 40, min: 5, max: 200, step: 1 },
      { type: 'slider', label: 'Size', key: 'size', default: 6, min: 1, max: 40, step: 0.5 },
      { type: 'toggle', label: 'Use Palette', key: 'use_palette', default: true }
    ]
  }
]

export async function init(containerEl: HTMLElement, context: ProjectContext): Promise<CleanupFunction> {
  const { controls, utils, theme, onControlChange } = context
  const controlState = { ...controls }
  const count = controlState.count as number
  // ...
}
```

Control types:
- `slider` — `{ type, label, key, default, min, max, step }`
- `toggle` — `{ type, label, key, default: boolean }`
- `select` — `{ type, label, key, default, options: [{ label, value }] }`
- `color` — `{ type, label, key, default: '#rrggbb' }`

Access in code: `const count = controlState.count as number`

## Theme Tokens

```typescript
const { theme } = context
theme.background  // canvas base color
theme.foreground  // default stroke/text
theme.annotation  // helper lines/debug overlays
theme.outline     // high-contrast stroke fallback
theme.palette     // ['#...', '#...', ...] — array of colors
```

## Canvas API

```typescript
import { Canvas, resolveContainer } from '~/types/project'

const { el, width, height } = resolveContainer(containerEl, 'full')
// Modes: 'full' | 'square' | '4:3' | { mode: 'square', padding: '2vmin' }

const cv = new Canvas({
  parent: el,
  id: 'my-canvas',
  width,
  height,
  defaults: { background: theme.background, fill: theme.foreground }
})

cv.background()                                   // fill with default background
cv.background('#111')                             // fill with explicit color
cv.circle(v(x, y), radius, fill, stroke, sw)     // circle
cv.rect(v(x, y), w, h, fill, stroke, sw)         // rect (top-left)
cv.rectC(v(cx, cy), w, h, fill, stroke, sw)      // rect (center)
cv.line(v(x1, y1), v(x2, y2), stroke, sw)        // line
cv.text(str, v(x, y), color, { size, align })     // text

cv.w   // canvas width in px
cv.h   // canvas height in px
cv.c   // center Vec { x, y }
cv.el  // underlying <canvas> element
```

## Utilities

```typescript
import { shortcuts } from '~/types/project'
const { v, rnd, rndInt, map, lerp, clamp, noise2, simplex2 } = shortcuts(utils)

// Seeded random (reproducible per seed)
const x = rnd() * cv.w
const i = rndInt(0, 10)
const flip = utils.seed.coinToss(50)  // 50% chance

// Noise (0→1 for perlin, -1→1 for simplex)
const n = noise2(x * 0.01, y * 0.01)
const s = simplex2(x * 0.01, y * 0.01)

// Math
const m = map(n, 0, 1, 10, 80)

// Vectors
const center = v(cv.w / 2, cv.h / 2)
```

For reproducible draws: call `utils.seed.reset()` at the start of `draw()` so the PRNG
returns to its seed position and control changes don't alter the random structure.

## Reacting to Control Changes

```typescript
const controlState = { ...controls }

onControlChange((nextControls) => {
  syncControlState(controlState, nextControls)
  draw()  // redraw with updated values
})
```

`syncControlState` merges only changed keys, preserving any derived local state.

## Resize

```typescript
const handleResize = () => {
  cv.resize(el.clientWidth, el.clientHeight)
  draw()
}
window.addEventListener('resize', handleResize)

// In cleanup:
return () => {
  window.removeEventListener('resize', handleResize)
  cv.el.remove()
}
```

Note: the sketch-based template (`_canvas2d-sketch-template/`) handles resize automatically.
Use that template if resize correctness matters or you're adding an animation loop.

## Keyboard Shortcuts

- **n** — new seed (keeps controls)
- **r** — reload sketch
- **d** — reset controls to defaults

## See Also

- Animated sketch (recommended for RAF loops): `projects/_Templates/_canvas2d-sketch-template/`
- Main README: `/README.md`
- Canvas API docs: `/docs/CANVAS_DRAWING_UTILITY.md`
- Container sizing: `/docs/CONTAINER_UTILITY.md`
