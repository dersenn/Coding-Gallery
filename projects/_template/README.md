# Project Template

This is a starter template for creating new projects in the gallery.

## Quick Start

1. **Copy this folder** and rename it to your project name:
   ```bash
   cp -r projects/_template projects/my-new-project
   ```

2. **Edit `index.ts`** to implement your sketch

3. **Add project metadata** to `data/projects.json`:
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

4. **Run dev server** and navigate to your project

## Available Context

### Controls
Access control values from your controls definition:
```typescript
const speed = controls.speed as number
```

### Global Utilities

#### Noise Functions
```typescript
// Simplex noise (-1 to 1)
utils.noise.simplex2D(x, y)
utils.noise.simplex3D(x, y, z)

// Perlin noise (0 to 1)
utils.noise.perlin2D(x, y)
utils.noise.perlin3D(x, y, z)
```

#### Seeded Random

Seeds are automatically loaded from the URL (`?seed=...`). Press **'n'** to generate a new random seed.

```typescript
// Random between 0 and 1
const r = utils.seed.random()

// Random in range
const x = utils.seed.randomRange(0, width)

// Random integer
const i = utils.seed.randomInt(0, 10)

// Get current seed (for logging/debugging)
console.log('Current seed:', utils.seed.current)

// Manually set a seed (usually not needed - use URL instead)
utils.seed.set("oo2x9k...")
```

#### Math Helpers
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

### Toggle
```json
{
  "type": "toggle",
  "label": "Show Grid",
  "key": "showGrid",
  "default": true
}
```

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

### Color
```json
{
  "type": "color",
  "label": "Background",
  "key": "bgColor",
  "default": "#000000"
}
```

## Reactive Control Updates

Listen for control changes:
```typescript
onControlChange((newControls) => {
  speed = newControls.speed as number
  showGrid = newControls.showGrid as boolean
  // Re-initialize or update as needed
})
```

## p5.js Instance Mode

All projects use p5.js instance mode to prevent namespace conflicts:
```typescript
const sketch = new p5((p) => {
  // Use p. prefix for all p5 functions
  p.setup = () => { }
  p.draw = () => { }
}, container)
```

## Cleanup

Always return a cleanup function to properly dispose of resources:
```typescript
return () => {
  sketch.remove()
  // Clean up any other resources
}
```

## Keyboard Shortcuts

- **'n'** - Generate new random seed (works globally in all projects)
- Projects can register their own shortcuts (e.g., 'd' for download)

## Exporting Standalone

To export your project as a standalone HTML file:

1. Copy your project folder
2. Create an `index.html` file with seed support:
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>My Project</title>
  <script src="https://cdn.jsdelivr.net/npm/p5@1.9.0"></script>
  <style>
    body { margin: 0; padding: 0; overflow: hidden; }
    #app { width: 100vw; height: 100vh; }
  </style>
</head>
<body>
  <div id="app"></div>
  <script type="module">
    import { init } from './index.js'
    
    // Get seed from URL or generate new one
    const params = new URLSearchParams(location.search)
    const seedString = params.get('seed') || generateSeed()
    
    function generateSeed() {
      const alphabet = '123456789abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ'
      return 'oo' + Array(49).fill(0)
        .map(() => alphabet[(Math.random() * alphabet.length) | 0]).join('')
    }
    
    // Mock gallery context with seed
    const mockContext = {
      controls: { /* Your default control values */ },
      utils: {
        seed: {
          current: seedString,
          set: (s) => { location.search = '?seed=' + s },
          random: () => Math.random(), // Replace with actual sfc32 if needed
          randomRange: (min, max) => min + Math.random() * (max - min),
          randomInt: (min, max) => Math.floor(min + Math.random() * (max - min + 1)),
        },
        noise: { /* Implement or stub */ },
        math: { /* Implement basic math helpers */ },
      },
      onControlChange: () => {},
    }
    
    console.log('Seed:', seedString)
    init(document.getElementById('app'), mockContext)
  </script>
</body>
</html>
```

## Tips

- Use `p.windowResized()` to handle canvas resizing
- Use `p.frameCount` or `p.millis()` for animations
- Test with different control values to ensure reactivity
- Keep your sketch performant - aim for 60fps
- Use TypeScript for better IDE support
