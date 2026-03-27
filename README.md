# Creative Coding Gallery

A modern gallery for showcasing creative coding projects built with Nuxt 3, Vue 3, and Nuxt UI.

## Architecture

This gallery uses a **JavaScript module architecture** where projects are portable TypeScript/JavaScript modules that can be easily extracted and run standalone. Vue is used only for presentation, navigation, and controls.

### Key Features

- **Full-screen sketches** with overlay UI
- **Portable projects** that can be easily exported
- **Multiple rendering modes** - p5.js, SVG, or raw canvas
- **Global utilities** (noise, seed, math, vectors, grids, shortcuts) shared across all projects
- **Reactive controls** defined in sketch code with URL persistence
- **SVG engine** with shapes, paths, and bezier curves
- **p5.js instance mode** to prevent namespace conflicts
- **TypeScript-first support** with optional JS sketch entries

## Additional Docs

- Docs index: `docs/INDEX.md`
- Seed system reference: `docs/SEED_SYSTEM.md`
- SVG engine reference: `docs/SVG_IMPLEMENTATION.md`

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
│   ├── useProjectLoader.ts    # Project metadata loader
│   └── usePlayback.ts         # Pause/resume state for animation loops
├── data/
│   └── projects.json          # Project metadata
├── pages/
│   ├── index.vue              # Gallery home page
│   ├── [id].vue               # Primary full-screen project route
│   └── project/[id].vue       # Legacy-compatible project route
├── projects/
│   ├── _Templates/            # Hidden project templates and reference examples
│   │   ├── _template/             # p5.js starter template
│   │   ├── _canvas2d-template/    # Canvas2D starter template (init pattern)
│   │   ├── _canvas2d-layer-template/ # Canvas2D layer template (canonical modern pattern)
│   │   ├── _svg-template/         # SVG static template
│   │   ├── _svg-animated-template/ # SVG animated template
│   │   ├── _noise-field/          # Noise field reference example (p5.js)
│   │   └── _svg-example/          # SVG engine live reference
│   ├── sandbox/               # Active projects
│   └── c4ta/                  # Migrated C4TA sketches (subdivided by medium)
├── types/
│   └── project.ts             # TypeScript interfaces
├── runtime/
│   ├── projectBootstrap.ts    # Framework project/layer bootstrap orchestration
│   ├── layerRuntime.ts        # Technique-aware single-active layer runtime
│   ├── layerRuntime.canvas2d.ts # Canvas2D layer technique adapter
│   ├── layerRuntime.svg.ts    # SVG layer technique adapter
│   └── layerRuntime.p5.ts     # p5.js layer technique adapter
├── plugins/
│   └── keyboard-shortcuts.client.ts  # Nuxt convention: global keyboard shortcut hook
├── server/
│   └── api/
│       └── show-hidden.get.ts # Nuxt/Nitro convention: hidden project token API
├── scripts/
│   └── validate-projects.mjs  # Repo validation tooling
└── utils/
    ├── generative.ts          # Sketch-facing primitives (noise, seed, math, Vec)
    ├── shortcuts.ts           # Shorthand functions for hand-coding
    ├── svg.ts                 # SVG engine (shapes, paths, bezier curves)
    ├── grid.ts                # Grid utility (uniform & recursive subdivision)
    ├── cell.ts                # Cell utility (base class with neighbor access)
    ├── color.ts               # Color parsing + conversion helpers
    ├── theme.ts               # Shared theme tokens + override resolver
    └── download.ts            # SVG filename + metadata export helpers
```

## Creating a New Project

Choose a template based on your sketch type:
- **Canvas2D (layer pattern, recommended for animated sketches)**: `projects/_Templates/_canvas2d-layer-template/`
- **Canvas2D (init pattern, for simple/static sketches)**: `projects/_Templates/_canvas2d-template/`
- **SVG (static)**: `projects/_Templates/_svg-template/`
- **SVG (animated)**: `projects/_Templates/_svg-animated-template/`
- **p5.js**: `projects/_Templates/_template/`

### 1. Copy the Template

```bash
# Canvas2D — layer pattern (recommended for new animated sketches)
cp -r projects/_Templates/_canvas2d-layer-template projects/sandbox/my-new-project

# Canvas2D — init pattern (simple/static)
cp -r projects/_Templates/_canvas2d-template projects/sandbox/my-new-project

# SVG (static)
cp -r projects/_Templates/_svg-template projects/sandbox/my-svg-project

# p5.js
cp -r projects/_Templates/_template projects/sandbox/my-p5-project
```

### 2. Implement Your Sketch

Edit your project's entry file (or `index.js` for rapid iteration):

```typescript
import type { ProjectContext, CleanupFunction } from '~/types/project'
import p5 from 'p5'

export async function init(
  container: HTMLElement,
  context: ProjectContext
): Promise<CleanupFunction> {
  const { controls, utils, theme, onControlChange, registerAction } = context

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

  registerAction('download-svg', () => {
    // Optional: call your project-specific export logic here
  })

  return () => sketch.remove()
}
```

### 3. Add Controls (in your sketch file)

Define controls directly in your sketch `index.ts` or `index.js`.
Grouped controls are recommended for larger sketches, but flat controls are still supported:

```typescript
export const controls: ProjectControlDefinition[] = [
  {
    type: 'group',
    id: 'motion',
    label: 'Motion',
    collapsible: true,
    defaultOpen: true,
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
    label: 'Show Trails',
    key: 'showTrails',
    default: false,
    group: 'Display' // Optional metadata-based grouping for flat entries
  }
]
```

### 4. Control Authoring Guide

Use consistent control groups so sketches stay easy to scan as they grow:

- `Grid`: layout, dimensions, spacing, margins, overlays
- `Noise`: frequency, amplitude, octaves, lacunarity, persistence
- `Color`: palette choice, palette size, color steps, color mode
- `Motion`: speed, phase, animation toggles
- `Display`: debug overlays, labels, helpers, visibility toggles

Conventions:

- Keep runtime keys flat and stable (for URL sharing): `context.controls[key]`
- Use `type: 'group'` for primary structure in new sketches/templates
- Use leaf `group: '...'` metadata only when staying flat or mixing styles
- Prefer small groups (about 3-8 controls) over one large mixed section

Named palette pattern (shared utility):

```typescript
import { buildPaletteMap, getPaletteByKey } from '~/utils/color'

const paletteMap = buildPaletteMap(theme.palette, {
  pearl: ['#fdf2f8', '#ddd6fe', '#bfdbfe'],
  neon: ['#ff006e', '#8338ec', '#3a86ff']
})

const paletteColors = getPaletteByKey(paletteMap, controls.palettePreset as string)
```

### 5. Add Optional Contextual Actions

Project modules can expose action buttons in the control panel and keyboard shortcuts via the page shell:

```typescript
import type { ProjectActionDefinition } from '~/types/project'

export const actions: ProjectActionDefinition[] = [
  { key: 'download-svg', label: 'Download SVG' }
]

// Inside init():
context.registerAction('download-svg', () => {
  // Trigger project action
})
```

For SVG projects, if you do not register `download-svg`, the viewer injects a fallback handler automatically.

### 6. Add Project Definition + Index Entry

Create `project.config.ts` beside your entry file. The modern canonical pattern uses a `layers[]` array that points to individual layer modules:

```ts
import type { ProjectDefinition, ProjectControlDefinition, ProjectLayerDefinition } from '~/types/project'

const CONTROLS: ProjectControlDefinition[] = [
  {
    type: 'group',
    id: 'composition',
    label: 'Composition',
    collapsible: true,
    defaultOpen: true,
    controls: [
      { type: 'slider', label: 'Count', key: 'count', default: 40, min: 5, max: 200, step: 1 }
    ]
  }
]

const LAYERS: ProjectLayerDefinition[] = [
  {
    id: 'my-layer',
    label: 'My Layer',
    technique: 'canvas2d',          // 'canvas2d' | 'svg' | 'p5'
    container: { mode: 'full' },    // 'full' | 'square' | '4:3' | { mode, padding }
    module: './layers/my-layer.js',
    controls: CONTROLS,
    defaultActive: true
  }
]

const definition: ProjectDefinition = {
  id: 'my-new-project',
  title: 'My New Project',
  description: 'A cool generative sketch',
  date: '2026-03',
  tags: ['canvas2d', 'generative'],
  layers: LAYERS
}

export default definition
```

Each layer module (`./layers/my-layer.js`) exports a `draw(context)` function. The layer runtime handles resize, lifecycle, and cleanup automatically:

```js
// layers/my-layer.js
import { shortcuts } from '~/types/project'

const LOOP_BY_CANVAS = new WeakMap()

export function draw(context) {
  const { canvas, theme, controls, utils, runtime } = context
  const { v, rnd } = shortcuts(utils)

  // Enable the pause button in the viewer shell (optional)
  runtime?.enablePause?.()

  let running = true
  const tick = () => {
    if (!running || !canvas.el.isConnected) {
      running = false
      LOOP_BY_CANVAS.delete(canvas.el)
      return
    }
    if (!runtime?.paused) {
      canvas.background(theme.background)
      const count = controls?.count ?? 40
      for (let i = 0; i < count; i++) {
        canvas.circle(v(rnd() * canvas.w, rnd() * canvas.h), 4, theme.foreground)
      }
    }
    requestAnimationFrame(tick)
  }

  if (!LOOP_BY_CANVAS.has(canvas.el)) {
    LOOP_BY_CANVAS.set(canvas.el, true)
    requestAnimationFrame(tick)
  }
}
```

**For single-file sketches** (no layers, `init()` pattern — still supported, especially for p5.js and SVG):

```ts
import type { ProjectDefinition, ProjectModule } from '~/types/project'
import * as mod from './index'

const m = mod as unknown as Partial<ProjectModule>

const definition: ProjectDefinition = {
  id: 'my-sketch',
  title: 'My Sketch',
  description: 'Description',
  date: '2026-03',
  tags: ['svg'],
  init: m.init as ProjectDefinition['init'],
  controls: m.controls,
  actions: m.actions
}

export default definition
```

Then add a thin entry to `data/projects.json`:

```json
{
  "id": "my-new-project",
  "title": "My New Project",
  "description": "A cool generative sketch",
  "date": "2026-03",
  "tags": ["canvas2d", "generative"],
  "entryFile": "/projects/sandbox/my-new-project/index.ts",
  "configFile": "/projects/sandbox/my-new-project/project.config.ts"
}
```

`configFile` is the canonical runtime definition.
`entryFile` remains in the index as canonical source path for structure/taxonomy validation.

**Optional fields:**
- `"hidden": true` - Hide from gallery (still accessible via direct URL)
- `"noControls": true` - Suppress the control panel entirely (for sketches with no controls)
- `"prefersTheme": "light"` - Start in light theme by default
- `"github": "https://github.com/..."` - Shows "View on GitHub" link in info panel

To reveal hidden projects on the gallery page, set a token in your environment and use it as a query parameter:

```bash
# Example: .env
NUXT_HIDDEN_PROJECTS_TOKEN=your-random-token
```

Then open:

```text
/?showHidden=your-random-token
```

While browsing with a valid token, hidden-mode visibility is preserved across navigation:

```text
Gallery: /?showHidden=<hidden-token>
Project: /<project-id>?showHidden=<hidden-token>
Back to gallery: /?showHidden=<hidden-token>
```

### 7. Run and Test

```bash
npm run dev
```

Navigate to `http://localhost:3000/my-new-project` (legacy `http://localhost:3000/project/my-new-project` also works)

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
- Press **'n'** to generate a new random seed in-place
- Press **'r'** to reload the sketch view in-place
- Press **'d'** to reset controls to default settings
- Press **'s'** to save SVG output (SVG projects only; uses `download-svg` action when available, with a viewer fallback for SVG projects)
- Seeds are automatically saved in the URL for sharing
- A discreet bottom overlay on project pages shows these shortcuts and the current seed

### Pause / Resume

Animated sketches can opt into the pause button in the viewer shell by calling `runtime?.enablePause?.()` once at draw-time. The `runtime` object is available in the layer draw context:

```js
// layers/my-layer.js
export function draw(context) {
  const { canvas, runtime } = context

  // Enable the pause/play button
  runtime?.enablePause?.()

  // Check paused state before drawing each frame
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

For time-based animations that need to stay in sync after unpausing, listen to pause-state changes to freeze/resume a running timestamp:

```js
let timeOffset = 0
let pausedAt = 0

runtime?.onPauseChange?.((isPaused) => {
  if (isPaused) {
    pausedAt = performance.now()
  } else {
    timeOffset += performance.now() - pausedAt
  }
})

// In tick: const elapsed = (performance.now() - timeOffset) * speed
```

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

// Divide line into segments (returns Vec[])
const points = utils.math.divLength(startVec, endVec, 10)

// Include endpoints
const withEnds = utils.math.divLength(startVec, endVec, 10, true)

// Advanced sampling modes (always returned in line sequence)
const randomGaps = utils.math.divLength(startVec, endVec, 10, {
  mode: 'randomGaps',
  includeEndpoints: true
})
const gapDescending = utils.math.divLength(startVec, endVec, 10, { mode: 'gapDescending' })
const curved = utils.math.divLength(startVec, endVec, 10, {
  mode: 'curve',
  curve: { kind: 'log', strength: 8 }
})

// Optional min segment floor (ratio and/or absolute length)
const bounded = utils.math.divLength(startVec, endVec, 10, {
  mode: 'randomGaps',
  minSegmentRatio: 0.04,   // each segment >= 4% of total line
  minSegmentLength: 12      // each segment >= 12px when possible
})
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

// Divide line into segments (legacy + options-object form)
const points = utils.math.divLength(startVec, endVec, 10) // 10 segments
const fibPoints = utils.math.divLength(startVec, endVec, 12, { mode: 'fibonacci' })

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

Available shortcuts: `v`, `rnd`, `rndInt`, `rndRange`, `coin`, `map`, `lerp`, `clamp`, `norm`, `dist`, `rad`, `deg`, `vDist`, `vLerp`, `vMid`, `vDot`, `vAng`, `noise2`, `noise3`, `simplex2`, `simplex3`, `shuffle`, `divLength`, `Grid`, `Cell`, `clr`, `Vec`

### Grid and Cell Utilities

Create grids with neighbor checking and recursive subdivision:

```typescript
import { Grid, Cell } from '~/types/project'

// Create a uniform grid
const grid = new Grid({
  cols: 10,
  rows: 10,
  width: 500,
  height: 500,
  x: 0,
  y: 0,
  margin: 20,
  utils
})

// Access cells
const cell = grid.at(5, 5)              // 2D access by row, col
const cellByIndex = grid.cellAt(55)     // 1D access by index

// Iterate over cells
grid.forEach((cell, row, col) => {
  // Draw or process each cell
})

const customCells = grid.map((cell) => {
  return new MyCustomCell(cell)
})

// Get neighbors (O(1) lookup)
const neighbors = cell.getNeighbors()    // All 8 neighbors
const cardinal = cell.getNeighbors4()    // Only top, right, bottom, left
const top = cell.getNeighbor('top')      // Specific neighbor

// Cell utilities
const center = cell.center()             // Vec of cell center
const isInside = cell.contains(x, y)     // Point-in-cell test
const dist = cell.distance(otherCell)    // Distance between centers
const isEdge = cell.isEdge()             // Check if on grid boundary
const isCorner = cell.isCorner()         // Check if corner cell

// Canvas grid overlay (single-pass lines, no doubled center seams)
canvas.gridLines(
  utils.vec.create(frame.x, frame.y),
  frame.width,
  frame.height,
  grid.cols,
  grid.rows,
  theme.foreground,
  2,
  { strokeAlign: 'inside' }
)

// Recursive/irregular cell boundaries (e.g. grid.subdivide output)
canvas.cellEdges(subdividedCells, theme.foreground, 2, {
  strokeAlign: 'inside',
  includeOuter: false
})

// Recursive subdivision (parent-preserving terminal nodes)
const subdividedCells = grid.subdivide({
  maxLevel: 3,
  chance: 50,                            // 50% chance to subdivide current node
  subdivisionCols: 2,                    // Split into 2x2 per level
  subdivisionRows: 2
})

// Subdivision returns GridCell[] nodes (same class as root cells)
subdividedCells.forEach((cell) => {
  // local-context APIs (default): getNeighbor / getNeighbors4 / getNeighbors / isEdge / isCorner
  // root-context APIs (explicit): getRootNeighbor / getRootNeighbors4 / getRootNeighbors / isRootEdge / isRootCorner
  const depth = cell.level
  const topAncestor = cell.root()
})

// maxLevel 0 keeps root cells as terminal nodes
const rootOnly = grid.subdivide({ maxLevel: 0, chance: 0 })

// Or use custom condition
const subdividedCells = grid.subdivide({
  maxLevel: 4,
  condition: (cell, level) => {
    // Return true to subdivide deeper, false to keep current node
    return level < 2 && Math.random() > 0.3
  }
})

// Extend Cell for project-specific behavior
class MyCell extends Cell {
  color: string
  
  constructor(baseCell: Cell) {
    super(baseCell)
    this.color = getRandomColor()
  }
  
  draw(svg: SVG) {
    svg.rect(
      utils.vec.create(this.x, this.y),
      this.width,
      this.height,
      this.color
    )
  }
}
```

**Grid Features:**
- Dual indexing (2D array + 1D flat array)
- O(1) neighbor lookups
- Iteration methods (`forEach`, `map`, `filter`)
- Recursive subdivision with chance or custom conditions
- Helper methods (`getEdgeCells()`, `getCornerCells()`, `randomCell()`)

**Cell Features:**
- Position and dimensions (x, y, width, height)
- Grid coordinates (row, col, index)
- Neighbor access (8-directional or 4-cardinal)
- Utility methods (center, contains, distance, edge/corner checks)
- Extendable for project-specific properties and methods
- Subdivision support (level, parent tracking)

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
import { SVG, Path, shortcuts } from '~/types/project'

export async function init(container, context) {
  const { v, rnd, map } = shortcuts(context.utils)
  
  // Create SVG canvas
  const svg = new SVG({ parent: container, id: 'my-sketch' })
  
  // Draw shapes
  svg.circle(svg.c, 100, 'none', '#000', 2)
  svg.line(v(0, 0), v(100, 100), '#000', 1)
  
  // Create paths with bezier curves
  const pts = [v(100, 100), v(200, 150), v(300, 100)]
  const path = new Path(pts, true)  // true = closed path
  svg.path(path.buildSpline(0.3), 'none', '#000', 2)
  
  return () => svg.stage.remove()
}
```

**SVG Methods:**
- `line(a, b, stroke?, strokeW?)` - Line between two points
- `circle(center, r, fill?, stroke?, strokeW?)` - Circle
- `rect(pt, w, h, fill?, stroke?, strokeW?)` - Rectangle
- `path(d, fill?, stroke?, strokeW?)` - Custom path

**Path Builders:**
- `buildPolygon()` - Simple polygon
- `buildQuadBez(t, d, close?)` - Quadratic bezier
- `buildSpline(t, close?)` - Smooth cubic spline

**Animation:**
Use `requestAnimationFrame` for animated SVG sketches (see `projects/_Templates/_svg-animated-template/`)

**Download/Save:**
SVG projects can expose a `download-svg` action. Press **'s'** (or click the action button) to save:
- Filename format: `{projectId}_{timestamp}_{seed}.svg`
- Includes export metadata (`projectId`, `seed`, `controls`, timestamps, source URL)
- Timestamp in format: `YYYY-MM-DD_HH-MM-SS`

If you do not register `download-svg`, the viewer can inject a fallback handler for SVG projects. You can also register your own action in `init()`:
```typescript
context.registerAction('download-svg', () => {
  // custom download/export behavior
})
```

## Exporting Standalone Projects

Projects are designed to be easily extracted and run independently:

1. Copy your project folder
2. Create an `index.html` with p5.js CDN
3. Mock the gallery context with default values
4. Import and initialize your project module

See `projects/_Templates/_template/README.md` for detailed export instructions.

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
- **TypeScript** - Type safety at the framework/wrapper level with optional sketch-level opt-out (`// @ts-nocheck`)

## License

MIT
