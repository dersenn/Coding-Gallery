# Container Layout Utility

`utils/container.ts` — imported via `~/types/project` alongside `SVG`, `shortcuts`, etc.

## Overview

`resolveContainer()` replaces the scattered `Math.min` / manual flex boilerplate for container sizing. It handles three layout modes, optional responsive inset padding, and returns dimensions ready for use in SVG, p5, or vanilla 2D constructors.

## Quick reference

```typescript
import { resolveContainer } from '~/types/project'

const { el, width, height, padding } = resolveContainer(container, config)
```

| Field | Type | Description |
|---|---|---|
| `el` | `HTMLElement` | Parent element for SVG / p5 (wrapper div, or `container` itself for `'full'`) |
| `width` | `number` | Canvas width in px |
| `height` | `number` | Canvas height in px |
| `padding` | `number` | Resolved padding in px (uniform, top value) — use for grid gaps, margins |

## Modes

`config` is a `ContainerMode` string or a `ContainerConfig` object.

```typescript
type ContainerMode = 'full' | 'square' | `${number}:${number}`
```

| Mode | Behavior |
|---|---|
| `'full'` | Fills the container. `el` is the container itself. Default when no config is given. |
| `'square'` | Centered square: `Math.min(availableWidth, availableHeight)`. Creates a wrapper div. |
| `'4:3'` | Centered rect at the given ratio (letterbox fit). Any `'W:H'` string works: `'16:9'`, `'1:1.414'` (A4), `'2:3'` etc. |

## Padding

```typescript
interface ContainerConfig {
  mode?: ContainerMode
  padding?: number | string
}
```

- `padding: 32` → `32px`
- `padding: '2vmin'` → any CSS length unit; `vmin` is a natural fit since it scales with the same axis used for square/ratio sizing
- The browser resolves the unit; `result.padding` is always the computed px value

Padding is applied to the container before dimensions are measured, so `width` and `height` already reflect the reduced area.

## Usage

### SVG sketch — full container (default)

```typescript
const { el, width, height } = resolveContainer(container, 'full')
const svg = new SVG({ parent: el, id: 'sketch', width, height })
```

### SVG sketch — centered square

```typescript
const { el, width, height } = resolveContainer(container, 'square')
const svg = new SVG({ parent: el, id: 'sketch', width, height })
```

### SVG sketch — custom ratio with inset padding

```typescript
const { el, width, height, padding } = resolveContainer(container, { mode: '4:3', padding: '2vmin' })
const svg = new SVG({ parent: el, id: 'sketch', width, height })

// Use resolved padding for internal layout math
const gap = padding * 0.5
const margin = padding
```

### p5 sketch — centered square

```typescript
const { el, width, height } = resolveContainer(container, 'square')
const sketch = new p5((p) => {
  p.setup = () => p.createCanvas(width, height)
  p.windowResized = () => p.resizeCanvas(el.clientWidth, el.clientHeight)
}, el)
```

Note: for p5, pass `el` (not `container`) as the second argument to `new p5()`, and use `el.clientWidth/Height` in `windowResized`.

## Module-level declaration

Every sketch should export a `container` constant that mirrors the `resolveContainer` call in `init()`. This is the "one-value" declaration and makes the sizing intent machine-readable for future tooling (thumbnailing, screenshot crops, etc.).

```typescript
// Matches resolveContainer(container, 'square') in init()
export const container = 'square'

// Or with config:
export const container = { mode: '4:3', padding: '2vmin' }
```

The `container` field is typed as `ContainerMode | ContainerConfig` on `ProjectModule` in `types/project.ts`.

## Per-layer canvases

Layers that share one container-resolved artboard (e.g. vera) call `resolveContainer` once — all layers draw into the same `svg.w` / `svg.h`. If a future sketch needs separate artboards per layer, call `resolveContainer` multiple times; each call creates its own wrapper div inside the container.

```typescript
// Hypothetical two-canvas sketch
const { el: elA, width: wA, height: hA } = resolveContainer(container, 'square')
const { el: elB, width: wB, height: hB } = resolveContainer(container, '16:9')
const svgA = new SVG({ parent: elA, id: 'layer-a', width: wA, height: hA })
const svgB = new SVG({ parent: elB, id: 'layer-b', width: wB, height: hB })
```

## Implementation notes

- Padding is set on `container.style.padding` before reading dimensions. `clientWidth/clientHeight` includes padding, so the utility subtracts it to get the true content area.
- For `'full'` mode, `el = container` — no wrapper is created, and behavior is identical to the previous `new SVG({ parent: container })` default.
- For `'square'` and ratio modes, a `div` wrapper with explicit `width`/`height` inline styles is appended to the container, and the container gets `display: flex` centering. The wrapper's `flexShrink: 0` prevents it from collapsing.

## Drawing utility split

Layout and drawing utilities are intentionally split:

- `utils/container.ts`: sizing/layout (`resolveContainer`, `resolveInnerFrame`, `createFrameTransform`)
- `utils/canvas.ts`: lightweight 2D drawing helper (`Canvas`, `createCanvas2D`, `draw`)

Example:

```typescript
import { resolveContainer, Canvas } from '~/types/project'

const { el, width, height } = resolveContainer(container, 'full')
const cv = new Canvas({ parent: el, id: 'my-canvas', width, height })
cv.background('#111')
```
