import type {
  ProjectContext,
  CleanupFunction,
  ProjectControlDefinition,
  ProjectActionDefinition
} from '~/types/project'
import { SVG, Path, shortcuts, resolveCanvas } from '~/types/project' // Path used in commented example; keep for discoverability
import { syncControlState } from '~/composables/useControls'

/**
 * SVG Project Template
 *
 * Copy this folder to start a new SVG sketch. Minimal scaffold with the
 * standard draw/reset/controls pattern already wired.
 *
 * Context available in init():
 * - utils   — seed, noise, math, vec, array, grid, cell, color
 * - theme   — background, foreground, annotation, outline, palette
 * - controls / onControlChange / registerAction
 *
 * Shorthand aliases via shortcuts(utils):
 * - v, Vec, rnd, rndInt, rndRange, coin
 * - map, lerp, clamp, norm, dist, rad, deg
 * - vDist, vLerp, vMid, vDot, vAng
 * - noise2, noise3, simplex2, simplex3
 * - shuffle, divLength, Grid, Cell, clr
 * - All destructured at init — remove unused ones when done.
 */

// Export controls - define them here in your sketch
export const controls: ProjectControlDefinition[] = [
  // Example controls (uncomment and modify as needed):
  // {
  //   type: 'group',
  //   id: 'shape',
  //   label: 'Shape',
  //   controls: [
  //     {
  //       type: 'slider',
  //       label: 'Line Count',
  //       key: 'lineCount',
  //       default: 10,
  //       min: 1,
  //       max: 50,
  //       step: 1
  //     },
  //     {
  //       type: 'slider',
  //       label: 'Stroke Width',
  //       key: 'strokeWidth',
  //       default: 2,
  //       min: 0.5,
  //       max: 10,
  //       step: 0.5
  //     }
  //   ]
  // }
]

export const actions: ProjectActionDefinition[] = [
  {
    key: 'download-svg',
    label: 'Download SVG'
  }
]

// Declarative canvas sizing — mirrors the resolveCanvas() call in init().
// Change this value to switch modes; keep it in sync with the call below.
// export const canvas = 'square'
// export const canvas = '4:3'
export const canvas = 'full'

export async function init(
  container: HTMLElement,
  context: ProjectContext
): Promise<CleanupFunction> {
  const { controls, utils, theme, onControlChange, registerAction } = context
  const {
    v, Vec,
    rnd, rndInt, rndRange, coin,
    map, lerp, clamp, norm, dist, rad, deg,
    vDist, vLerp, vMid, vDot, vAng,
    noise2, noise3, simplex2, simplex3,
    shuffle, divLength,
    Grid, Cell,
    clr,
  } = shortcuts(utils)
  const controlState = { ...controls }

  // resolveCanvas sets up container centering and returns the sized wrapper element.
  // Switch the mode string to change the layout — no other code needs to change.
  //
  //   'full'        fills the viewport (default)
  //   'square'      centered square
  //   '4:3'         centered rect at a custom ratio (any 'W:H' string works)
  //
  // Add padding for a responsive inset (number → px, string → any CSS length):
  //   resolveCanvas(container, { mode: 'square', padding: '2vmin' })
  //   → result.padding is the resolved px value, useful for grid gaps / margins
  const { el, width, height } = resolveCanvas(container, 'full')
  const svg = new SVG({ parent: el, id: 'svg-sketch', width, height })

  // ---------------------------------------------------------------------------
  // draw() — called on init and on every control change.
  //
  // utils.seed.reset() restores the PRNG to position 0 for the current seed
  // before each draw, so slider/toggle changes never affect the random structure.
  // Remove it only if accumulating state across redraws is intentional.
  // ---------------------------------------------------------------------------
  const draw = () => {
    utils.seed.reset()
    svg.stage.replaceChildren()

    // Your sketch code here — example: scatter random circles.
    const count = 40
    for (let i = 0; i < count; i++) {
      const pos = v(rnd() * svg.w, rnd() * svg.h)
      const r = rnd() * 20 + 4
      svg.makeCircle(pos, r, 'none', theme.foreground, 1)
    }

    // Example: a spline through seeded random points.
    // const pts = Array.from({ length: 6 }, () => v(rnd() * svg.w, rnd() * svg.h))
    // const pathStr = new Path(pts, false).buildSpline(0.4)
    // svg.makePath(pathStr, 'none', theme.foreground, 1)
  }

  draw()

  onControlChange((newControls) => {
    syncControlState(controlState, newControls)
    draw()
  })

  registerAction('download-svg', () => {
    svg.save(utils.seed.current, 'svg-sketch')
  })

  return () => {
    svg.stage.remove()
  }
}
