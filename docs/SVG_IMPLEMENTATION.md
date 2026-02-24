# SVG Engine Implementation

Technical reference for the SVG-oriented workflow in this gallery.

## What it covers

- Vector and math helpers used by SVG sketches
- Shorthand APIs for rapid sketching
- `utils/svg.ts` classes (`SVG`, `Path`, `pPt`)
- Template locations and example usage patterns

## Core building blocks

### Generative utilities

- `Vec` class and vector ops (`add`, `sub`, `dot`, `cross`, `lerp`, `mid`)
- Math helpers (`rad`, `deg`, `divLength`)
- Seeded random/noise integration

### Shorthand helpers (`utils/shortcuts.ts`)

Common aliases for quick coding:
- random: `rnd`, `rndRange`, `rndInt`, `coin`
- math: `map`, `lerp`, `clamp`, `norm`, `dist`, `rad`, `deg`, `divLength`
- vectors: `v`, `vDist`, `vLerp`, `vMid`, `vDot`, `vAng`
- noise: `noise2`, `noise3`, `simplex2`, `simplex3`

### SVG classes (`utils/svg.ts`)

- `SVG`: stage and shape creation (`makeLine`, `makeCircle`, `makeRect`, `makePath`, etc.)
- `Path`: polygon and bezier/spline builders (`buildPolygon`, `buildQuadBez`, `buildSpline`)
- `save(seed?, sketchName?)` for deterministic filename exports

## Templates and examples

- Static template: `projects/_Templates/_svg-template/`
- Animated template: `projects/_Templates/_svg-animated-template/`
- Example: `projects/_Templates/_svg-example/`

## Minimal usage sketch

```typescript
import { SVG, Path } from '~/utils/svg'
import { shortcuts } from '~/utils/shortcuts'

export async function init(container, context) {
  const { v } = shortcuts(context.utils)
  const svg = new SVG({ parent: container, id: 'my-sketch' })
  const pts = [v(100, 100), v(200, 150), v(300, 100)]
  const path = new Path(pts, false)
  svg.makePath(path.buildSpline(0.3), 'none', '#000', 2)
  return () => svg.stage.remove()
}
```

## Related docs

- Main docs: `../README.md`
- Docs index: `INDEX.md`
- Seed details: `SEED_SYSTEM.md`
- Template guide: `../projects/_Templates/_template/README.md`
