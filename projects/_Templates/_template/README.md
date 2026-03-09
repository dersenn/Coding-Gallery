# p5.js Project Template

Minimal template for creating new p5.js projects in the gallery.

## Quick Start

1. **Copy this folder** and rename it:
   ```bash
   cp -r projects/_Templates/_template projects/p5/my-sketch
   ```

2. **Edit `index.ts`** (or rename to `index.js`) - Add your controls and implement your sketch

3. **Add metadata** to `data/projects.json`:
   ```json
   {
     "id": "my-sketch",
     "title": "My Sketch",
     "description": "A cool generative sketch",
     "date": "2026-02",
     "tags": ["p5js", "generative"],
     "libraries": ["p5"],
     "entryFile": "/projects/p5/my-sketch/index.ts"
   }
   ```
   `entryFile` can point to either `index.ts` or `index.js`.

4. **Run and test**:
   ```bash
   npm run dev
   ```
   Navigate to `http://localhost:3000/my-sketch` (legacy `http://localhost:3000/project/my-sketch` also works)

## New Project Checklist

- Keep `controls` export in your project module for UI bindings.
- Use `context.theme` tokens first, then add an optional `theme` export override if needed.
- If you expose custom buttons, export `actions` and wire handlers with `context.registerAction(...)`.
- Prefer convenience re-exports from `~/types/project` (`SVG`, `Path`, `shortcuts`, `Grid`, `Cell`, `Color`) in new templates/projects.

## Controls

Define controls directly in your `index.ts` or `index.js`.
Grouped controls are recommended for larger sketches, while flat controls remain fully supported:

```typescript
export const controls: ProjectControlDefinition[] = [
  {
    type: 'group',
    id: 'motion',
    label: 'Motion',
    controls: [
      {
        type: 'slider',
        label: 'Speed',
        key: 'speed',
        default: 1,
        min: 0.1,
        max: 5,
        step: 0.1
      }
    ]
  },
  {
    type: 'toggle',
    label: 'Show Grid',
    key: 'showGrid',
    default: false,
    group: 'Display'
  },
  {
    type: 'color',
    label: 'Background',
    key: 'bgColor',
    default: '#000000',
    group: 'Display'
  }
]
```

Access in your sketch:
```typescript
const speed = controls.speed as number
const showGrid = controls.showGrid as boolean
```

## Theme Tokens (Minimal)

Projects receive shared color tokens through `context.theme`:

```typescript
const { theme } = context
theme.background  // canvas base
theme.foreground  // default text/stroke
theme.annotation  // helper lines/labels/debug overlays
theme.outline     // high-contrast outline/stroke fallback
theme.palette     // default color sequence
```

Optional project-level override in `index.ts` or `index.js` (override only what you need):

```typescript
export const theme = {
  background: '#111827',
  palette: ['#22d3ee', '#a78bfa', '#f472b6']
}
```

## Available Utilities

All projects have access to `utils` via the context:

### Color Utilities (Dual Access)
Use one style per sketch for readability. Examples below use class-style APIs.
```typescript
import { Color } from '~/types/project'

const base = Color.parse(theme.palette[0]!)
const overlay = base?.withAlpha(0.35).toRgbaString() ?? 'rgba(255, 255, 255, 0.35)'

const accent = Color.fromHex('#f0f')?.toCss('rgba') ?? '#f0f'
const fromHsl = Color.fromHsl(210, 100, 50).toHex()

// Parsing HSL/HSLA strings also works
const parsed = Color.parse('hsla(200, 80%, 50%, 0.4)')
```

Equivalent context access is available as `utils.color.*` when preferred.

Useful outputs:
```typescript
color.toHex()         // #rrggbb
color.toRgbaString()  // rgba(r, g, b, a)
color.toP5Tuple()     // [r, g, b, a255]
```

Named palettes (shared utility pattern):
```typescript
import { buildPaletteMap, getPaletteByKey, resolveActiveColors } from '~/utils/color'

const paletteMap = buildPaletteMap(theme.palette, {
  warm: ['#f97316', '#fb7185', '#facc15'],
  cool: ['#22d3ee', '#6366f1', '#a78bfa']
})

const paletteColors = getPaletteByKey(paletteMap, controls.palettePreset as string)
const activeColors = resolveActiveColors({
  paletteColors,
  selectedValues: controls.selectedPaletteIndices as number[]
})
```

### Seeded Random
```typescript
utils.seed.random()                    // Random 0-1
utils.seed.randomRange(0, 100)         // Random in range
utils.seed.randomInt(0, 10)            // Random integer
utils.seed.coinToss(50)                // Random boolean (50% chance)
utils.seed.current                     // Current seed hash
```

### Noise Functions
```typescript
utils.noise.perlin2D(x, y)             // Perlin noise 0-1
utils.noise.perlin3D(x, y, z)          // Perlin noise 3D
utils.noise.simplex2D(x, y)            // Simplex noise -1 to 1
```

### Math Helpers
```typescript
utils.math.map(val, min1, max1, min2, max2)  // Map value to range
utils.math.lerp(start, stop, t)              // Linear interpolation
utils.math.clamp(n, min, max)                // Constrain value
utils.math.norm(val, min, max)               // Normalize to 0-1
utils.math.dist(x1, y1, x2, y2)              // Distance
utils.math.divLength(vecA, vecB, 10)         // Divide line into segments (Vec[])
utils.math.divLength(vecA, vecB, 10, true)   // Include endpoints
utils.math.divLength(vecA, vecB, 10, { mode: 'randomGaps' }) // Seeded random gaps
utils.math.divLength(vecA, vecB, 10, { mode: 'gapAscending' }) // Small->large random gaps
utils.math.divLength(vecA, vecB, 10, { mode: 'gapDescending' }) // Large->small random gaps
utils.math.divLength(vecA, vecB, 10, { mode: 'randomSorted' })  // Sorted random t samples
utils.math.divLength(vecA, vecB, 10, { mode: 'curve', curve: { kind: 'log', strength: 8 } })
utils.math.divLength(vecA, vecB, 10, { mode: 'fibonacci' }) // Fibonacci-weighted spacing
utils.math.divLength(vecA, vecB, 10, { mode: 'randomGaps', minSegmentRatio: 0.04 }) // Min gap floor
utils.math.rad(degrees)                      // Degrees to radians
utils.math.deg(radians)                      // Radians to degrees
```

### Vectors
```typescript
const v = utils.vec.create(x, y, z)          // Create vector
utils.vec.dist(a, b)                         // Distance
utils.vec.lerp(a, b, t)                      // Interpolate
utils.vec.mid(a, b)                          // Midpoint

// Or use Vec class directly
import { Vec } from '~/utils/generative'
const v = new Vec(x, y, z)
v.add(other)    // Vector addition
v.sub(other)    // Subtraction
v.norm()        // Normalize
v.lerp(other, t)  // Interpolate
```

### Array Utilities
```typescript
utils.array.shuffle([1, 2, 3])              // Seeded shuffle
```

## Shorthand Functions

For faster hand-coding, use shortcuts:

```typescript
import { shortcuts } from '~/utils/shortcuts'
const { v, rnd, map, lerp, rad } = shortcuts(utils)

// Now use short names
const center = v(width/2, height/2)
const x = rnd() * width
const angle = rad(45)
```

## Reactive Updates

Listen for control changes:

```typescript
onControlChange((newControls) => {
  speed = newControls.speed as number
  // Update your sketch
})
```

## Keyboard Shortcuts

- **'n'** - Generate new seed (keeps your control settings)
- **'r'** - Reload sketch view in-place
- **'d'** - Reset controls to defaults
- **'s'** - Save SVG when a `download-svg` action is available
- Control values persist in URL for sharing

## Project Structure

```
my-sketch/
├── index.ts|index.js # Your sketch code + controls
└── README.md         # Optional documentation
```

## Tips

1. **Seeded Random** - All random functions use the URL seed for reproducibility
2. **Instance Mode** - p5.js runs in instance mode to prevent conflicts
3. **Cleanup** - Always return a cleanup function to remove the sketch on unmount
4. **TypeScript (optional per sketch)** - Keep TS for autocomplete/safety, or use `index.js` / `// @ts-nocheck` for faster iteration
5. **URL Sharing** - Share URLs with specific seeds and control values

## Example Sketch

```typescript
import type { ProjectContext, CleanupFunction, ProjectControlDefinition } from '~/types/project'
import p5 from 'p5'

export const controls: ProjectControlDefinition[] = [
  {
    type: 'group',
    id: 'motion',
    label: 'Motion',
    controls: [
      { type: 'slider', label: 'Speed', key: 'speed', default: 1, min: 0.1, max: 5, step: 0.1 }
    ]
  }
]

export async function init(
  container: HTMLElement,
  context: ProjectContext
): Promise<CleanupFunction> {
  const { controls, utils, theme } = context
  let speed = controls.speed as number

  const sketch = new p5((p) => {
    p.setup = () => {
      p.createCanvas(container.clientWidth, container.clientHeight)
    }

    p.draw = () => {
      p.background(theme.background)
      p.fill(theme.foreground)
      p.circle(p.width/2, p.height/2, 100 * speed)
    }

    p.windowResized = () => {
      p.resizeCanvas(container.clientWidth, container.clientHeight)
    }
  }, container)

  return () => sketch.remove()
}
```

## More Templates

- **SVG Static**: `projects/_Templates/_svg-template/`
- **SVG Animated**: `projects/_Templates/_svg-animated-template/`
- **Canvas2D**: `projects/_Templates/_canvas2d-template/`

## Vanilla Canvas Option

If you want a lighter alternative to p5 for raster sketches:

```typescript
import { resolveContainer, Canvas } from '~/types/project'

const { el, width, height } = resolveContainer(container, 'full')
const cv = new Canvas({ parent: el, id: 'my-canvas', width, height })
cv.background('#111')
cv.circle(cv.c, 32, '#fff', 'transparent')
```

Use `docs/CANVAS_DRAWING_UTILITY.md` for full helper details.

## See Also

- Main README: `/README.md`
- SVG Implementation: `/docs/SVG_IMPLEMENTATION.md`
