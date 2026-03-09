# Canvas Drawing Utility

`utils/canvas.ts` provides a minimal, vanilla 2D drawing API for sketches that do not need SVG and do not need full p5 ergonomics.

Use it together with `resolveContainer()` from `utils/container.ts` (or `~/types/project` re-exports).

## Goals

- Keep the utility small and easy to extend
- Match familiar p5-like drawing flow where sensible
- Fit existing project runtime contracts (`init(container, context)`)

## API surface (v1)

```typescript
import { Canvas, createCanvas2D, draw } from '~/types/project'
```

- `new Canvas({ parent, id, width, height, alpha? })`
- `createCanvas2D(config)` convenience constructor
- `draw(target, callback)` context save/restore wrapper

`Canvas` instance methods:

- `clear()`
- `background(fill)`
- `resize(width, height)`
- `fill(color | null)`
- `stroke(color | null)`
- `strokeWeight(weight)`
- `line(a, b, stroke?, strokeW?)`
- `rect(at, width, height, fill?, stroke?, strokeW?)`
- `rectC(center, width, height, fill?, stroke?, strokeW?)`
- `circle(at, radius?, fill?, stroke?, strokeW?)`
- `text(value, at, fill?, options?)`
- `withContext((ctx) => ...)`
- `save({ projectId?, seed? })`

## Example project init

```typescript
import type { CleanupFunction, ProjectContext } from '~/types/project'
import { resolveContainer, Canvas, shortcuts } from '~/types/project'

export const container = 'full'

export async function init(container: HTMLElement, context: ProjectContext): Promise<CleanupFunction> {
  const { theme, utils } = context
  const { rnd } = shortcuts(utils)
  const { el, width, height } = resolveContainer(container, 'full')
  const cv = new Canvas({ parent: el, id: 'my-canvas', width, height })

  cv.background(theme.background)
  for (let i = 0; i < 200; i++) {
    cv.circle(
      { x: rnd() * width, y: rnd() * height },
      2,
      theme.foreground,
      'transparent'
    )
  }

  return () => {
    cv.el.remove()
  }
}
```

## Notes

- Keep this utility intentionally compact for now; avoid adding advanced path/transform APIs until needed by at least one sketch.
- p5 remains fully supported and is still a recommended option for rapid prototyping.
