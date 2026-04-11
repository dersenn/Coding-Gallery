import { shortcuts } from '~/types/project'
import { createGenerativeUtils } from '~/utils/generative'
import { drawVera1 } from './vera1.js'
import { drawVera2 } from './vera2.js'

/**
 * Vera (C4TA — computational line studies)
 *
 * A series of independently toggleable sketches, each exploring a different
 * rule system for line placement within an overlapping tile grid.
 *
 * Sketch inventory:
 * - Vera 1: constrained motif selection (4 candidates per tile)
 * - Vera 2: one diagonal per tile from a random left-edge point to a random right-edge point
 */
export function draw(context) {
  const { svg, controls, utils, theme } = context
  const { v } = shortcuts(utils)

  const seed = utils.seed.current
  // Each layer gets its own PRNG stream from the same project seed.
  // Toggling one layer cannot affect the other's random sequence.
  const v1rnd = createGenerativeUtils(seed)
  const v2rnd = createGenerativeUtils(seed)

  svg.rect(v(0, 0), svg.w, svg.h, theme.background, 'none', 0)

  const makeLayerContext = (rnd) => ({ svg, theme, utils, controls, v, rnd })

  // Render order keeps Vera 1 on top when both are enabled, matching migration baseline.
  const enabledLayers = new Set(controls.enabledLayers)
  if (enabledLayers.has('vera2')) drawVera2(makeLayerContext(() => v2rnd.seed.random()))
  if (enabledLayers.has('vera1')) drawVera1(makeLayerContext(() => v1rnd.seed.random()))
}
