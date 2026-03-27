import { shortcuts } from '~/types/project'

/**
 * Canvas2D Sketch Template — animated sketch with RAF loop.
 *
 * The sketch runtime calls draw(context) once on mount and again on
 * control changes. Resize and cleanup are handled automatically.
 *
 * Context shape:
 *   canvas   — Canvas instance (canvas.el, canvas.w, canvas.h, canvas.c)
 *   theme    — color tokens (background, foreground, annotation, palette)
 *   controls — current control values (read-only snapshot)
 *   utils    — seed, noise, math, vec, array, grid, cell, color
 *   runtime  — pause/play API (optional)
 */

// One RAF loop per mounted canvas — prevents double-starting on hot reload.
const LOOP_BY_CANVAS = new WeakMap()

export function draw(context) {
  const { canvas, theme, controls, utils, runtime } = context
  if (!canvas) return
  if (LOOP_BY_CANVAS.has(canvas.el)) return

  const { v, rnd } = shortcuts(utils)

  // Enable the pause/play button in the viewer shell.
  // Remove this line if the sketch has no animation loop.
  runtime?.enablePause?.()

  let running = true
  let t = 0

  const tick = (now) => {
    // Stop if unmounted from DOM.
    if (!canvas.el.isConnected) {
      running = false
      LOOP_BY_CANVAS.delete(canvas.el)
      return
    }
    if (!running) return

    if (!runtime?.paused) {
      t = now * 0.001

      // ── Sketch code starts here ──────────────────────────────────────────
      //
      // utils.seed.reset() before each frame so control changes don't alter
      // the random structure — only remove it if accumulating state is intentional.
      utils.seed.reset()

      canvas.background(theme.background)

      const count = controls?.count ?? 40
      const size  = controls?.size  ?? 6

      for (let i = 0; i < count; i++) {
        const x = rnd() * canvas.w
        const y = rnd() * canvas.h
        const r = size * (0.5 + 0.5 * Math.sin(t + i))
        const color = theme.palette[i % theme.palette.length] ?? theme.foreground
        canvas.circle(v(x, y), r, 'transparent', color, 1)
      }
      //
      // ── Sketch code ends here ────────────────────────────────────────────
    }

    requestAnimationFrame(tick)
  }

  LOOP_BY_CANVAS.set(canvas.el, true)
  requestAnimationFrame(tick)
}
