# Creative Coding Gallery

A modern gallery for showcasing creative coding projects built with Nuxt 3, Vue 3, and Nuxt UI.

## Architecture

This gallery uses a **JavaScript module architecture** where projects are portable TypeScript/JavaScript modules that can be easily extracted and run standalone. Vue is used only for presentation, navigation, and controls.

### Key Features

- **Full-screen sketches** with overlay UI
- **Portable projects** that can be easily exported
- **Multiple rendering modes** - p5.js, SVG, or raw canvas
- **Global utilities** (noise, seed, math, vectors, shortcuts) shared across all projects
- **Reactive controls** defined in sketch code with URL persistence
- **SVG engine** with shapes, paths, and bezier curves
- **p5.js instance mode** to prevent namespace conflicts
- **TypeScript support** throughout

## Project Structure

```
├── components/
│   ├── ControlPanel.vue      # Overlay control panel
│   ├── ProjectList.vue        # Gallery grid view
│   └── ProjectViewer.vue      # Project loader component
├── composables/
│   ├── useControls.ts         # Control state management
│   ├── useGenerativeUtils.ts  # Generative art utilities accessor
│   ├── useSeedFromURL.ts      # URL seed parameter management
│   └── useProjectLoader.ts    # Project metadata loader
├── data/
│   └── projects.json          # Project metadata
├── pages/
│   ├── index.vue              # Gallery home page
│   └── project/[id].vue       # Full-screen project view
├── projects/
│   ├── _template/             # p5.js starter template
│   ├── _svg-template/         # SVG static template
│   ├── _svg-animated-template/ # SVG animated template
│   ├── noise-field/           # p5.js example
│   └── svg-example/           # SVG example
├── types/
│   └── project.ts             # TypeScript interfaces
├── plugins/
│   └── keyboard-shortcuts.client.ts  # Global keyboard shortcuts (n=new seed)
└── utils/
    ├── generative.ts          # Generative art utilities (noise, seed, math, Vec)
    ├── shortcuts.ts           # Shorthand functions for hand-coding
    └── svg.ts                 # SVG engine (shapes, paths, bezier curves)
```

## Creating a New Project

Choose a template based on your sketch type:
- **p5.js**: `projects/_template/`
- **SVG (static)**: `projects/_svg-template/`
- **SVG (animated)**: `projects/_svg-animated-template/`

### 1. Copy the Template

```bash
# For p5.js
cp -r projects/_template projects/my-new-project

# For SVG
cp -r projects/_svg-template projects/my-svg-project
```

### 2. Implement Your Sketch

Edit `projects/my-new-project/index.ts`:

```typescript
import type { ProjectContext, CleanupFunction } from '~/types/project'
import p5 from 'p5'

export async function init(
  container: HTMLElement,
  context: ProjectContext
): Promise<CleanupFunction> {
  const { controls, utils, onControlChange } = context

  const sketch = new p5((p) => {
    p.setup = () => {
      p.createCanvas(container.clientWidth, container.clientHeight)
    }

    p.draw = () => {
      // Your sketch code here
    }

    p.windowResized = () => {
      p.resizeCanvas(container.clientWidth, container.clientHeight)
    }

    onControlChange((newControls) => {
      // React to control changes
    })
  }, container)

  return () => sketch.remove()
}
```

### 3. Add Controls (in your sketch file)

Define controls directly in your sketch `index.ts`:

```typescript
export const controls: ControlDefinition[] = [
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
```

### 4. Add Metadata

Add your project to `data/projects.json`:

```json
{
  "id": "my-new-project",
  "title": "My New Project",
  "description": "A cool sketch",
  "date": "2024-12",
  "tags": ["p5js", "generative"],
  "libraries": ["p5"],
  "entryFile": "/projects/my-new-project/index.ts"
}
```

**Optional fields:**
- `"hidden": true` - Hide from gallery (still accessible via direct URL)
- `"github": "https://github.com/..."` - Shows "View on GitHub" link in info panel

### 5. Run and Test

```bash
npm run dev
```

Navigate to `http://localhost:3000/project/my-new-project`

## Global Utilities

All projects have access to shared generative art utilities via the `context.utils` object:

### Current Seed

```typescript
// Access the current seed hash
console.log(utils.seed.current)  // e.g., "oo2x9k..."

// Set a specific seed
utils.seed.set("oo2x9k...")
```

### Noise Functions

```typescript
// Simplex noise (-1 to 1)
utils.noise.simplex2D(x, y)
utils.noise.simplex3D(x, y, z)
utils.noise.simplex4D(x, y, z, w)

// Perlin noise (0 to 1) - smoothed simplex
utils.noise.perlin2D(x, y)
utils.noise.perlin3D(x, y, z)
```

### Seeded Random

Seeds are automatically loaded from the URL (`?seed=...`). All random and noise functions use this seed for reproducibility.

```typescript
// Random between 0 and 1
const r = utils.seed.random()

// Random in range
const x = utils.seed.randomRange(0, width)

// Random integer
const i = utils.seed.randomInt(0, 10)

// Get current seed (useful for logging/debugging)
console.log('Seed:', utils.seed.current)
```

**Keyboard Shortcuts:**
- Press **'n'** to generate a new random seed and reload the sketch
- Press **'d'** to download SVG (for SVG projects)
- Seeds are automatically saved in the URL for sharing

### Math Helpers

```typescript
// Map value from one range to another
const mapped = utils.math.map(value, 0, 100, 0, 1)

// Linear interpolation
const lerped = utils.math.lerp(start, stop, 0.5)

// Constrain/clamp value
const clamped = utils.math.constrain(value, 0, 100)

// Normalize value to 0-1
const normalized = utils.math.norm(value, min, max)

// Distance between points
const distance = utils.math.dist(x1, y1, x2, y2)
const distance3D = utils.math.dist3D(x1, y1, z1, x2, y2, z2)

// Angle conversion
const radians = utils.math.rad(degrees)
const degrees = utils.math.deg(radians)
```

### Vector Operations

```typescript
// Create vectors
const center = utils.vec.create(width/2, height/2)
const point = utils.vec.create(x, y, z)  // z is optional

// Or use the Vec class directly
import { Vec } from '~/utils/generative'
const v = new Vec(x, y, z)

// Vector methods
v.norm()           // Normalize
v.add(other)       // Add vectors
v.sub(other)       // Subtract vectors
v.cross(other)     // Cross product
v.dot(other)       // Dot product
v.ang(other)       // Angle between vectors
v.lerp(other, t)   // Linear interpolation
v.mid(other)       // Midpoint

// Utility functions
const dist = utils.vec.dist(a, b)
const lerped = utils.vec.lerp(a, b, 0.5)
const midpoint = utils.vec.mid(a, b)
```

### Array Utilities

```typescript
// Seeded shuffle
const shuffled = utils.array.shuffle([1, 2, 3, 4, 5])

// Divide line into segments
const points = utils.array.divLength(startVec, endVec, 10) // 10 segments

// Random boolean with probability
const flip = utils.seed.coinToss(50) // 50% chance
```

### Shorthand Functions

For faster hand-coding, import shortcuts:

```typescript
import { shortcuts } from '~/utils/shortcuts'
const { v, rnd, map, lerp, rad } = shortcuts(utils)

// Now use short names
const center = v(width/2, height/2)
const x = rnd() * width
const mapped = map(noise, 0, 1, -100, 100)
const angle = rad(45)
```

Available shortcuts: `v`, `rnd`, `rndInt`, `rndRange`, `coin`, `map`, `lerp`, `clamp`, `norm`, `dist`, `rad`, `deg`, `vDist`, `vLerp`, `vMid`, `noise2`, `noise3`, `shuffle`

## Control Types

### Slider

```json
{
  "type": "slider",
  "label": "Speed",
  "key": "speed",
  "default": 1,
  "min": 0,
  "max": 10,
  "step": 0.1
}
```

Access in code: `controls.speed as number`

### Toggle

```json
{
  "type": "toggle",
  "label": "Show Grid",
  "key": "showGrid",
  "default": true
}
```

Access in code: `controls.showGrid as boolean`

### Select

```json
{
  "type": "select",
  "label": "Mode",
  "key": "mode",
  "default": "organic",
  "options": [
    { "label": "Organic", "value": "organic" },
    { "label": "Geometric", "value": "geometric" }
  ]
}
```

Access in code: `controls.mode as string`

### Color

```json
{
  "type": "color",
  "label": "Background",
  "key": "bgColor",
  "default": "#000000"
}
```

Access in code: `controls.bgColor as string`

## Reactive Control Updates

Projects can listen for control changes:

```typescript
onControlChange((newControls) => {
  speed = newControls.speed as number
  showGrid = newControls.showGrid as boolean
  // Re-initialize or update as needed
})
```

**Control Persistence:**
- Control values are automatically saved to URL parameters
- Press **'n'** to generate a new seed while keeping all control settings
- Share URLs with specific configurations
- Control panel state (open/closed) persists in localStorage

## SVG Projects

For SVG-based generative art, use the SVG templates:

```typescript
import { SVG, Path } from '~/utils/svg'
import { shortcuts } from '~/utils/shortcuts'

export async function init(container, context) {
  const { v, rnd, map } = shortcuts(context.utils)
  
  // Create SVG canvas
  const svg = new SVG({ parent: container, id: 'my-sketch' })
  
  // Draw shapes
  svg.makeCircle(svg.c, 100, 'none', '#000', 2)
  svg.makeLine(v(0, 0), v(100, 100), '#000', 1)
  
  // Create paths with bezier curves
  const pts = [v(100, 100), v(200, 150), v(300, 100)]
  const path = new Path(pts, true)  // true = closed path
  svg.makePath(path.buildSpline(0.3), 'none', '#000', 2)
  
  return () => svg.stage.remove()
}
```

**SVG Methods:**
- `makeLine(a, b, stroke?, strokeW?)` - Line between two points
- `makeCircle(center, r, fill?, stroke?, strokeW?)` - Circle
- `makeRect(pt, w, h, fill?, stroke?, strokeW?)` - Rectangle
- `makePath(d, fill?, stroke?, strokeW?)` - Custom path

**Path Builders:**
- `buildPolygon()` - Simple polygon
- `buildQuadBez(t, d, close?)` - Quadratic bezier
- `buildSpline(t, close?)` - Smooth cubic spline

**Animation:**
Use `requestAnimationFrame` for animated SVG sketches (see `_svg-animated-template/`)

**Download/Save:**
SVG projects include keyboard shortcut for downloading. Press **'d'** to save:
- Filename format: `{sketchName}_{seed}_{timestamp}.svg`
- Includes seed hash for reproducibility
- Timestamp in format: `YYYY-MM-DD_HH-MM-SS`

The download handler is already implemented in the templates. The `svg.save()` method:
```typescript
svg.save(utils.seed.current, 'my-sketch-name')
```

## Exporting Standalone Projects

Projects are designed to be easily extracted and run independently:

1. Copy your project folder
2. Create an `index.html` with p5.js CDN
3. Mock the gallery context with default values
4. Import and initialize your project module

See `projects/_template/README.md` for detailed export instructions.

## Development

### Install Dependencies

```bash
npm install
```

### Start Dev Server

```bash
npm run dev
```

### Build for Production

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

## Tech Stack

- **Nuxt 3** - Vue framework
- **Vue 3** - Composition API with TypeScript
- **Nuxt UI** - Component library
- **p5.js** - Creative coding library
- **simplex-noise** - Noise generation
- **TypeScript** - Type safety

## License

MIT
