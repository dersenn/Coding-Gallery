import type {
  CleanupFunction,
  ProjectActionDefinition,
  ProjectContext,
  ProjectControlDefinition
} from '~/types/project'
import { SVG, shortcuts, resolveContainer } from '~/types/project'
import { syncControlState } from '~/composables/useControls'
import { createGenerativeUtils } from '~/utils/generative'
import { drawVera1 } from './layers/vera1'
import { drawVera2 } from './layers/vera2'
import type { LayerDrawContext } from './layers/types'

/**
 * Vera (C4TA — computational line studies)
 *
 * A series of independently toggleable layers, each exploring a different
 * rule system for line placement within an overlapping tile grid.
 * Intended as a growing exercise in computational composition.
 *
 * Layer inventory:
 * - Vera 1: constrained motif selection (4 candidates per tile)
 * - Vera 2: one diagonal per tile from a random left-edge point to a random right-edge point
 */

type VeraLayer = 'vera1' | 'vera2'

export const controls: ProjectControlDefinition[] = [
  {
    type: 'group',
    id: 'composition',
    label: 'Composition',
    collapsible: true,
    defaultOpen: true,
    controls: [
      {
        type: 'checkbox-group',
        label: 'Sketches',
        key: 'enabledLayers',
        default: ['vera1'],
        options: [
          { label: 'Vera 1', value: 'vera1' },
          { label: 'Vera 2', value: 'vera2' }
        ]
      }
    ]
  }
]

export const actions: ProjectActionDefinition[] = [
  { key: 'download-svg', label: 'Download SVG' }
]

export const container = 'square'

export async function init(
  container: HTMLElement,
  context: ProjectContext
): Promise<CleanupFunction> {
  const { controls, utils, theme, onControlChange, registerAction } = context
  const { v } = shortcuts(utils)

  const controlState = {
    enabledLayers: controls.enabledLayers as VeraLayer[]
  }

  const { el, width, height } = resolveContainer(container, 'square')
  const svg = new SVG({ parent: el, id: 'vera', width, height })

  const draw = () => {
    const seed = utils.seed.current
    // Each layer gets its own PRNG stream from the same project seed.
    // Toggling one layer cannot affect the other's random sequence.
    const v1rnd = createGenerativeUtils(seed)
    const v2rnd = createGenerativeUtils(seed)

    svg.stage.replaceChildren()
    svg.makeRect(v(0, 0), svg.w, svg.h, theme.background, 'none', 0)

    const makeLayerContext = (rnd: () => number): LayerDrawContext => ({
      svg,
      theme,
      utils,
      controls,
      v,
      rnd
    })

    // Render order keeps Vera 1 on top when both are enabled, matching migration baseline.
    const enabledLayers = new Set(controlState.enabledLayers)
    if (enabledLayers.has('vera2')) {
      drawVera2(makeLayerContext(() => v2rnd.seed.random()))
    }
    if (enabledLayers.has('vera1')) {
      drawVera1(makeLayerContext(() => v1rnd.seed.random()))
    }
  }

  draw()

  onControlChange((nextControls) => {
    syncControlState(controlState, nextControls)
    draw()
  })

  registerAction('download-svg', () => {
    svg.save(utils.seed.current, 'vera')
  })

  return () => {
    svg.stage.remove()
  }
}
