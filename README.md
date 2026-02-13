# Creative Coding Gallery

A modern gallery for showcasing creative coding projects built with Nuxt 3, Vue 3, and Nuxt UI.

## Architecture

This gallery uses a **JavaScript module architecture** where projects are portable TypeScript/JavaScript modules that can be easily extracted and run standalone. Vue is used only for presentation, navigation, and controls.

### Key Features

- **Full-screen sketches** with overlay UI
- **Portable projects** that can be easily exported
- **Global utilities** (noise, seed, math) shared across all projects
- **Reactive controls** with live updates
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
│   ├── _template/             # Starter template
│   └── noise-field/           # Example project
├── types/
│   └── project.ts             # TypeScript interfaces
├── plugins/
│   └── keyboard-shortcuts.client.ts  # Global keyboard shortcuts (n=new seed)
└── utils/
    └── generative.ts          # Generative art utilities implementation
```

## Creating a New Project

### 1. Copy the Template

```bash
cp -r projects/_template projects/my-new-project
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

### 3. Add Metadata

Add your project to `data/projects.json`:

```json
{
  "id": "my-new-project",
  "title": "My New Project",
  "description": "A cool sketch",
  "date": "2024-12",
  "tags": ["p5js", "generative"],
  "libraries": ["p5"],
  "entryFile": "/projects/my-new-project/index.ts",
  "controls": [
    {
      "type": "slider",
      "label": "Speed",
      "key": "speed",
      "default": 1,
      "min": 0.1,
      "max": 5,
      "step": 0.1
    }
  ]
}
```

### 4. Run and Test

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
```

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
