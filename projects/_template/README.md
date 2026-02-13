# p5.js Project Template

Minimal template for creating new p5.js projects in the gallery.

## Quick Start

1. **Copy this folder** and rename it:
   ```bash
   cp -r projects/_template projects/my-sketch
   ```

2. **Edit `index.ts`** - Add your controls and implement your sketch

3. **Add metadata** to `data/projects.json`:
   ```json
   {
     "id": "my-sketch",
     "title": "My Sketch",
     "description": "A cool generative sketch",
     "date": "2026-02",
     "tags": ["p5js", "generative"],
     "libraries": ["p5"],
     "entryFile": "/projects/my-sketch/index.ts"
   }
   ```

4. **Run and test**:
   ```bash
   npm run dev
   ```
   Navigate to `http://localhost:3000/project/my-sketch`

## Controls

Define controls directly in your `index.ts`:

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
  },
  {
    type: 'toggle',
    label: 'Show Grid',
    key: 'showGrid',
    default: false
  },
  {
    type: 'color',
    label: 'Background',
    key: 'bgColor',
    default: '#000000'
  }
]
```

Access in your sketch:
```typescript
const speed = controls.speed as number
const showGrid = controls.showGrid as boolean
```

## Available Utilities

All projects have access to `utils` via the context:

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
utils.array.divLength(vecA, vecB, 10)       // Divide line into segments
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
- Control values persist in URL for sharing

## Project Structure

```
my-sketch/
├── index.ts          # Your sketch code + controls
└── README.md         # Optional documentation
```

## Tips

1. **Seeded Random** - All random functions use the URL seed for reproducibility
2. **Instance Mode** - p5.js runs in instance mode to prevent conflicts
3. **Cleanup** - Always return a cleanup function to remove the sketch on unmount
4. **TypeScript** - Use types for better autocomplete, but you can write plain JS too
5. **URL Sharing** - Share URLs with specific seeds and control values

## Example Sketch

```typescript
import type { ProjectContext, CleanupFunction, ControlDefinition } from '~/types/project'
import p5 from 'p5'

export const controls: ControlDefinition[] = [
  { type: 'slider', label: 'Speed', key: 'speed', default: 1, min: 0.1, max: 5, step: 0.1 }
]

export async function init(
  container: HTMLElement,
  context: ProjectContext
): Promise<CleanupFunction> {
  const { controls, utils } = context
  let speed = controls.speed as number

  const sketch = new p5((p) => {
    p.setup = () => {
      p.createCanvas(container.clientWidth, container.clientHeight)
    }

    p.draw = () => {
      p.background(0)
      p.fill(255)
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

- **SVG Static**: `projects/_svg-template/`
- **SVG Animated**: `projects/_svg-animated-template/`

## See Also

- Main README: `/README.md`
- SVG Implementation: `/SVG_IMPLEMENTATION.md`
