const LOOP_BY_CANVAS = new WeakMap()

const DEFAULTS = {
  cols: 64,
  rows: 64,
  noiseScale: 0.065,
  timeScale: 0.0006,
  warpScale: 0.18,
  contrast: 1
}

function resolveAnimatedNoiseControls(controls, utils) {
  return {
    cols: Math.floor(utils.math.clamp(
      typeof controls?.noise_anim_cols === 'number' ? controls.noise_anim_cols : DEFAULTS.cols,
      8,
      220
    )),
    rows: Math.floor(utils.math.clamp(
      typeof controls?.noise_anim_rows === 'number' ? controls.noise_anim_rows : DEFAULTS.rows,
      8,
      220
    )),
    noiseScale: utils.math.clamp(
      typeof controls?.noise_anim_scale === 'number' ? controls.noise_anim_scale : DEFAULTS.noiseScale,
      0.005,
      0.25
    ),
    timeScale: utils.math.clamp(
      typeof controls?.noise_anim_time_scale === 'number' ? controls.noise_anim_time_scale : DEFAULTS.timeScale,
      0.00001,
      0.005
    ),
    warpScale: utils.math.clamp(
      typeof controls?.noise_anim_warp === 'number' ? controls.noise_anim_warp : DEFAULTS.warpScale,
      0,
      0.8
    ),
    contrast: utils.math.clamp(
      typeof controls?.noise_anim_contrast === 'number' ? controls.noise_anim_contrast : DEFAULTS.contrast,
      0.1,
      3
    )
  }
}

/**
 * Minimal animated canvas playground layer:
 * starts one RAF loop per mounted canvas and stops automatically on unmount.
 */
export function draw(context) {
  const { canvas, theme, utils, controls } = context
  if (!canvas) return
  if (LOOP_BY_CANVAS.has(canvas.el)) return

  const palette = Array.isArray(theme.palette) && theme.palette.length > 0
    ? theme.palette
    : [theme.foreground]

  let running = true
  let animationId = null

  const tick = (now) => {
    if (!running) return
    if (!canvas.el.isConnected) {
      running = false
      LOOP_BY_CANVAS.delete(canvas.el)
      return
    }

    const settings = resolveAnimatedNoiseControls(controls, utils)
    const time = now * settings.timeScale
    const cellW = canvas.w / settings.cols
    const cellH = canvas.h / settings.rows

    canvas.background(theme.background)
    canvas.withContext((ctx) => {
      for (let row = 0; row < settings.rows; row++) {
        for (let col = 0; col < settings.cols; col++) {
          // Domain-warped fBm so blobs change topology (split/merge), not just drift.
          const baseX = col * settings.noiseScale
          const baseY = row * settings.noiseScale
          const warpX = utils.noise.simplex2D(baseX * 0.7 - time * 0.8, baseY * 0.7 + time * 0.6) * settings.warpScale
          const warpY = utils.noise.simplex2D(baseX * 0.7 + 23.1 + time * 0.5, baseY * 0.7 - 11.7 - time * 0.7) * settings.warpScale
          const x = baseX + warpX
          const y = baseY + warpY
          const n0 = utils.noise.simplex2D(x * 0.9 + time * 0.2, y * 0.9 - time * 0.15)
          const n1 = utils.noise.simplex2D(x * 1.8 - time * 0.35, y * 1.8 + time * 0.25)
          const n2 = utils.noise.simplex2D(x * 3.2 + time * 0.5, y * 3.2 - time * 0.4)
          const n = n0 * 0.62 + n1 * 0.28 + n2 * 0.1
          const normalized = utils.math.clamp((n + 1) * 0.5, 0, 1) ** settings.contrast
          const colorIndex = Math.min(
            Math.floor(normalized * palette.length),
            Math.max(0, palette.length - 1)
          )
          ctx.fillStyle = palette[colorIndex] ?? theme.foreground
          ctx.fillRect(col * cellW, row * cellH, cellW + 0.5, cellH + 0.5)
        }
      }
    })

    animationId = requestAnimationFrame(tick)
  }

  LOOP_BY_CANVAS.set(canvas.el, true)
  animationId = requestAnimationFrame(tick)
}
