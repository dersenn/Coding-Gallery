# `context.setControls`

Programmatically update control values from inside a sketch without touching
the URL or browser history. Intended for init-time setup: seed-deterministic
randomisation, viewport-responsive defaults, or any one-time override.

## Signature

```ts
context.setControls(updates: Array<{ key: string; value: ControlValue }>): void
```

## Usage

```js
export function draw(context) {
  const { canvas, controls, utils, setControls } = context

  // One-time init — call at the top of draw(), not inside runtime.loop()
  utils.seed.reset()
  setControls([
    { key: 'density', value: utils.seed.randomRange(0.1, 0.9) },
    { key: 'columns', value: canvas.w > canvas.h ? 12 : 6 },
  ])

  // ... rest of sketch
}
```

## Behaviour

- Values are applied immediately and reflected in the control panel UI.
- The normal `onControlChange` callback fires, so a redraw triggers if called
  from `draw()`.
- No URL change occurs. Seeds and control state remain independent.
- Calling `setControls` on every frame or inside `runtime.loop()` is wasteful —
  use it for one-time setup only.

## Implementation

- `silentUpdateControls` in `composables/useControls.ts` — writes values without
  calling `syncQueryWithControl`.
- Wired into `ProjectContext` in `components/ProjectViewer.vue`.
- `setControls` on `ProjectContext` in `types/project.ts`.
