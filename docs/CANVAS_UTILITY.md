# Canvas Layout Utility

`utils/canvas.ts` — imported via `~/types/project` alongside `SVG`, `shortcuts`, etc.

## Overview

`resolveCanvas()` replaces the scattered `Math.min` / manual flex boilerplate for canvas sizing. It handles three layout modes, optional responsive inset padding, and returns dimensions ready for use in SVG or p5 constructors.

## Quick reference

```typescript
import { resolveCanvas } from '~/types/project'

const { el, width, height, padding } = resolveCanvas(container, config)
```

| Field | Type | Description |
|---|---|---|
| `el` | `HTMLElement` | Parent element for SVG / p5 (wrapper div, or `container` itself for `'full'`) |
| `width` | `number` | Canvas width in px |
| `height` | `number` | Canvas height in px |
| `padding` | `number` | Resolved padding in px (uniform, top value) — use for grid gaps, margins |

## Modes

`config` is a `CanvasMode` string or a `CanvasConfig` object.

```typescript
type CanvasMode = 'full' | 'square' | `${number}:${number}`
```

| Mode | Behavior |
|---|---|
| `'full'` | Fills the container. `el` is the container itself. Default when no config is given. |
| `'square'` | Centered square: `Math.min(availableWidth, availableHeight)`. Creates a wrapper div. |
| `'4:3'` | Centered rect at the given ratio (letterbox fit). Any `'W:H'` string works: `'16:9'`, `'1:1.414'` (A4), `'2:3'` etc. |

## Padding

```typescript
interface CanvasConfig {
  mode?: CanvasMode
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
const { el, width, height } = resolveCanvas(container, 'full')
const svg = new SVG({ parent: el, id: 'sketch', width, height })
```

### SVG sketch — centered square

```typescript
const { el, width, height } = resolveCanvas(container, 'square')
const svg = new SVG({ parent: el, id: 'sketch', width, height })
```

### SVG sketch — custom ratio with inset padding

```typescript
const { el, width, height, padding } = resolveCanvas(container, { mode: '4:3', padding: '2vmin' })
const svg = new SVG({ parent: el, id: 'sketch', width, height })

// Use resolved padding for internal layout math
const gap = padding * 0.5
const margin = padding
```

### p5 sketch — centered square

```typescript
const { el, width, height } = resolveCanvas(container, 'square')
const sketch = new p5((p) => {
  p.setup = () => p.createCanvas(width, height)
  p.windowResized = () => p.resizeCanvas(el.clientWidth, el.clientHeight)
}, el)
```

Note: for p5, pass `el` (not `container`) as the second argument to `new p5()`, and use `el.clientWidth/Height` in `windowResized`.

## Module-level declaration

Every sketch should export a `canvas` constant that mirrors the `resolveCanvas` call in `init()`. This is the "one-value" declaration and makes the sizing intent machine-readable for future tooling (thumbnailing, screenshot crops, etc.).

```typescript
// Matches resolveCanvas(container, 'square') in init()
export const canvas = 'square'

// Or with config:
export const canvas = { mode: '4:3', padding: '2vmin' }
```

The `canvas` field is typed as `CanvasMode | CanvasConfig` on `ProjectModule` in `types/project.ts`.

## Per-layer canvases

Layers that share one canvas (e.g. vera) call `resolveCanvas` once — all layers draw into the same `svg.w` / `svg.h`. If a future sketch needs separate canvases per layer, call `resolveCanvas` multiple times; each call creates its own wrapper div inside the container.

```typescript
// Hypothetical two-canvas sketch
const { el: elA, width: wA, height: hA } = resolveCanvas(container, 'square')
const { el: elB, width: wB, height: hB } = resolveCanvas(container, '16:9')
const svgA = new SVG({ parent: elA, id: 'layer-a', width: wA, height: hA })
const svgB = new SVG({ parent: elB, id: 'layer-b', width: wB, height: hB })
```

## Implementation notes

- Padding is set on `container.style.padding` before reading dimensions. `clientWidth/clientHeight` includes padding, so the utility subtracts it to get the true content area.
- For `'full'` mode, `el = container` — no wrapper is created, and behavior is identical to the previous `new SVG({ parent: container })` default.
- For `'square'` and ratio modes, a `div` wrapper with explicit `width`/`height` inline styles is appended to the container, and the container gets `display: flex` centering. The wrapper's `flexShrink: 0` prevents it from collapsing.
