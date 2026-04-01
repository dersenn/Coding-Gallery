import { shortcuts } from '~/types/project'

/**
 * Canvas2D Sketch Template — animated sketch using runtime.loop().
 *
 * The sketch runtime calls draw(context) once on mount and again on
 * control changes. Resize and cleanup are handled automatically.
 *
 * Context shape:
 *   canvas   — Canvas instance (canvas.el, canvas.w, canvas.h, canvas.c)
 *   theme    — color tokens (background, foreground, annotation, palette)
 *   controls — current control values (read live each frame inside loop)
 *   utils    — seed, noise, math, vec, array, grid, cell, color
 *   runtime  — animation API: runtime.loop(fn), pause/play handled by runtime
 *
 * Animation: call runtime.loop(fn) once inside draw() to register the tick
 * function and start the RAF loop. The call is idempotent — re-calling on
 * control change is a no-op. Remove runtime.loop() entirely for static sketches.
 */

export function draw(context) {
  const { canvas, theme, controls, utils, runtime } = context
  if (!canvas) return

  const { v, rnd } = shortcuts(utils)

  runtime.loop(({ elapsed }) => {
    const t = elapsed * 0.001

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
  })
}
