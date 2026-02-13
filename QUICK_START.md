# Quick Start Guide

## What Changed?

Your gallery has been transformed from an iframe-based system to a modern JavaScript module architecture. Projects are now portable TypeScript modules that can easily be reused and exported.

## Try It Now

1. **Start the dev server** (if not already running):
   ```bash
   npm run dev
   ```

2. **Visit the gallery**: http://localhost:3002

3. **Open the example project**: Click on "Perlin Noise Field"

4. **Try the controls**:
   - Adjust particle count (bottom-right panel)
   - Change flow speed
   - Toggle trails on/off
   - Change background color

5. **Test the overlay UI**:
   - Click the info button (top-right) to show/hide project details
   - Click "Hide Controls" to collapse the control panel
   - Click "Gallery" (top-left) to return to the home page

## Create Your First Project

### 1. Copy the Template

```bash
cd projects
cp -r _template my-first-sketch
cd my-first-sketch
```

### 2. Edit `index.ts`

Open `projects/my-first-sketch/index.ts` and modify the draw function:

```typescript
p.draw = () => {
  p.background(220)
  
  // Simple animated circle
  const x = p.width / 2 + Math.cos(p.frameCount * 0.02) * 100
  const y = p.height / 2 + Math.sin(p.frameCount * 0.02) * 100
  
  p.fill(255, 0, 100)
  p.noStroke()
  p.circle(x, y, 50)
}
```

### 3. Add to Gallery

Open `data/projects.json` and add your project:

```json
{
  "id": "my-first-sketch",
  "title": "My First Sketch",
  "description": "A simple animated circle",
  "date": "2024-12",
  "tags": ["p5js", "animation"],
  "libraries": ["p5"],
  "entryFile": "/projects/my-first-sketch/index.ts"
}
```

### 4. View Your Project

Navigate to: http://localhost:3002/project/my-first-sketch

## Add Controls

Edit your project metadata in `data/projects.json`:

```json
{
  "id": "my-first-sketch",
  "title": "My First Sketch",
  "description": "A simple animated circle",
  "date": "2024-12",
  "tags": ["p5js", "animation"],
  "libraries": ["p5"],
  "entryFile": "/projects/my-first-sketch/index.ts",
  "controls": [
    {
      "type": "slider",
      "label": "Speed",
      "key": "speed",
      "default": 1,
      "min": 0.1,
      "max": 5,
      "step": 0.1
    },
    {
      "type": "color",
      "label": "Circle Color",
      "key": "circleColor",
      "default": "#ff0064"
    }
  ]
}
```

Then update your `index.ts` to use the controls:

```typescript
export async function init(container, context) {
  const { controls, utils, onControlChange } = context
  
  let speed = controls.speed as number
  let circleColor = controls.circleColor as string

  const sketch = new p5((p) => {
    p.setup = () => {
      p.createCanvas(container.clientWidth, container.clientHeight)
    }

    p.draw = () => {
      p.background(220)
      
      const x = p.width / 2 + Math.cos(p.frameCount * 0.02 * speed) * 100
      const y = p.height / 2 + Math.sin(p.frameCount * 0.02 * speed) * 100
      
      p.fill(circleColor)
      p.noStroke()
      p.circle(x, y, 50)
    }

    p.windowResized = () => {
      p.resizeCanvas(container.clientWidth, container.clientHeight)
    }

    onControlChange((newControls) => {
      speed = newControls.speed as number
      circleColor = newControls.circleColor as string
    })
  }, container)

  return () => sketch.remove()
}
```

## Use Global Utilities

### Noise Example

```typescript
p.draw = () => {
  p.background(220)
  
  // Use Perlin noise for smooth animation
  const noiseVal = utils.noise.perlin2D(p.frameCount * 0.01, 0)
  const x = utils.math.map(noiseVal, 0, 1, 0, p.width)
  
  p.circle(x, p.height / 2, 50)
}
```

### Seeded Random Example

```typescript
p.setup = () => {
  p.createCanvas(container.clientWidth, container.clientHeight)
  
  // Set seed for reproducible randomness
  utils.seed.set("my-seed-123")
  
  // Generate random positions
  for (let i = 0; i < 100; i++) {
    const x = utils.seed.randomRange(0, p.width)
    const y = utils.seed.randomRange(0, p.height)
    p.circle(x, y, 10)
  }
}
```

## Project Types You Can Create

### p5.js 2D
- Generative art
- Data visualizations
- Interactive animations
- Particle systems

### p5.js WebGL
- 3D graphics
- Custom shaders
- 3D animations

### SVG Manipulation
- Import your custom SVG library
- Morphing animations
- Path generation

## Tips

1. **Always use p5 instance mode** - Prefix all p5 functions with `p.`
2. **Handle cleanup** - Return a cleanup function from `init()`
3. **Handle resize** - Implement `p.windowResized()`
4. **Test controls** - Make sure your sketch reacts to control changes
5. **Keep it performant** - Aim for 60fps

## Need Help?

- See `README.md` for full documentation
- Check `projects/_template/README.md` for detailed examples
- Look at `projects/noise-field/index.ts` for a working example
- Review `IMPLEMENTATION_SUMMARY.md` for architecture details

## What's Different from Before?

### Old (iframe-based):
- Projects were HTML files in `public/projects/`
- Used `postMessage` for communication
- Harder to share code between projects
- Complex to debug

### New (module-based):
- Projects are TypeScript modules in `projects/`
- Direct prop passing
- Shared utilities (noise, seed, math)
- Easy to debug and develop

## Your Next Steps

1. **Explore the noise field example** to understand the pattern
2. **Create a simple test project** using the template
3. **Add your custom SVG library** to `utils/` directory
4. **Port your old projects** one by one when ready
5. **Customize overlay styling** if desired

Happy coding! 🎨
