import type {
  CleanupFunction,
  ProjectActionDefinition,
  ProjectContext,
  ProjectControlDefinition,
  CanvasConfig
} from '~/types/project'
import type { GridCellConfig } from '~/utils/grid'
import type { ThemeTokens } from '~/utils/theme'
import { SVG, Grid, GridCell, shortcuts, resolveCanvas } from '~/types/project'
import { syncControlState } from '~/composables/useControls'

type AnniLayer = 'anni-1'
type LayerCanvas = CanvasConfig | 'full' | 'square' | `${number}:${number}`

interface LayerDefinition {
  id: AnniLayer
  label: string
  canvas: LayerCanvas
  exportName: string
}

interface LayerRuntime {
  exportName: string
  svg: SVG
  draw: () => void
  destroy: () => void
}

const LAYERS: LayerDefinition[] = [
  {
    id: 'anni-1',
    label: 'Anni 1',
    canvas: { mode: 'square' },
    exportName: 'anni-layer1'
  }
]

// ─── Layer 1 model + draw pipeline ─────────────────────────────────────────────
// Keep this split (Grid subclass + Cell subclass): it stays lightweight now and
// gives a clean seam for future per-layer divergence without utility wrappers.

class Anni1Grid extends Grid {
  svg!: SVG
  color!: string
  /** Post-construction setup. Resolves color from theme.palette[0]. */
  init(extras: { svg: SVG; theme: ThemeTokens }): this {
    this.svg = extras.svg
    this.color = extras.theme.palette[0] ?? extras.theme.foreground
    return this
  }
  protected override createCell(config: GridCellConfig): GridCell {
    return new Anni1Cell(config)
  }
}

class Anni1Cell extends GridCell {
  /** Draw this cell: rect outline tl→br using grid's svg and color. */
  draw(): void {
    const g = this.grid as Anni1Grid
    g.svg.makeRectAB(this.tl(), this.br(), 'none', g.color, 1)
    if (this.row === 3) {
      g.svg.makeCircle(this.center(), this.width * 0.2, 'none', g.color, 1)
    }
  }
}

function drawAnni1Grid(
  svg: SVG,
  width: number,
  height: number,
  theme: ThemeTokens,
  utils: ProjectContext['utils']
): void {
  const { v } = shortcuts(utils)
  svg.stage.replaceChildren()
  svg.makeRect(v(0, 0), width, height, theme.background, 'none', 0)
  const grid = new Anni1Grid({
    cols: 8,
    rows: 8,
    width,
    height,
    x: 0,
    y: 0,
    utils
  }).init({ svg, theme })
  grid.forEach((cell) => (cell as Anni1Cell).draw())
}

function createAnni1Layer(args: {
  parent: HTMLElement
  width: number
  height: number
  theme: ThemeTokens
  utils: ProjectContext['utils']
}): LayerRuntime {
  const { parent, width, height, theme, utils } = args
  const svg = new SVG({ parent, id: 'anni-layer1', width, height })

  const draw = () => {
    drawAnni1Grid(svg, width, height, theme, utils)
  }

  return {
    exportName: 'anni-layer1',
    svg,
    draw,
    destroy: () => {
      svg.stage.remove()
    }
  }
}

function createLayerRuntime(
  layer: LayerDefinition,
  parent: HTMLElement,
  theme: ThemeTokens,
  utils: ProjectContext['utils']
): LayerRuntime {
  const { el, width, height } = resolveCanvas(parent, layer.canvas)
  if (layer.id === 'anni-1') {
    return createAnni1Layer({ parent: el, width, height, theme, utils })
  }
  throw new Error(`Unknown layer id: ${layer.id}`)
}

// ─── Project ───────────────────────────────────────────────────────────────────

/**
 * Anni
 *
 * Per-layer SVG sketch scaffold with one active layer for now.
 * The architecture keeps explicit layer runtime wiring so future layers can
 * adopt their own canvas config/aspect ratio without touching core lifecycle.
 */

export const controls: ProjectControlDefinition[] = [
  {
    type: 'group',
    id: 'composition',
    label: 'Composition',
    collapsible: true,
    defaultOpen: true,
    controls: [
      {
        type: 'select',
        label: 'Layer',
        key: 'activeLayer',
        default: 'anni-1',
        options: LAYERS.map((layer) => ({ label: layer.label, value: layer.id }))
      }
    ]
  }
]

export const actions: ProjectActionDefinition[] = [
  { key: 'download-svg', label: 'Download SVG' }
]

export const canvas = { mode: 'square' as const, padding: '2vmin' }

export async function init(
  container: HTMLElement,
  context: ProjectContext
): Promise<CleanupFunction> {
  const { controls, utils, theme, onControlChange, registerAction } = context

  const controlState = {
    activeLayer: (controls.activeLayer as AnniLayer | undefined) ?? LAYERS[0]!.id
  }

  // 1) Resolve base frame once.
  const base = resolveCanvas(container, canvas)
  const baseEl = base.el

  // 2) Single active layer host (selected via controls).
  const layerHost = document.createElement('div')
  // Derive explicit host size from resolveCanvas output (not percentage CSS),
  // so per-layer resolveCanvas always measures a concrete box.
  layerHost.style.width = `${base.width}px`
  layerHost.style.height = `${base.height}px`
  baseEl.appendChild(layerHost)
  let activeRuntime: LayerRuntime | null = null
  let mountedLayerId: AnniLayer | null = null

  const mountActiveLayer = (layerId: AnniLayer) => {
    if (activeRuntime && mountedLayerId === layerId) {
      return
    }
    activeRuntime?.destroy()
    layerHost.replaceChildren()

    const layer = LAYERS.find((candidate) => candidate.id === layerId)
    if (!layer) {
      throw new Error(`Unknown selected layer: ${layerId}`)
    }
    activeRuntime = createLayerRuntime(layer, layerHost, theme, utils)
    mountedLayerId = layerId
  }

  // ─── Draw entry point ───────────────────────────────────────────────────────
  const draw = () => {
    utils.seed.reset()
    mountActiveLayer(controlState.activeLayer)
    activeRuntime?.draw()
  }

  draw()

  onControlChange((nextControls) => {
    syncControlState(controlState, nextControls)
    draw()
  })

  registerAction('download-svg', () => {
    activeRuntime?.svg.save(utils.seed.current, activeRuntime.exportName)
  })

  return () => {
    activeRuntime?.destroy()
    layerHost.remove()
    if (baseEl !== container) {
      baseEl.remove()
    }
  }
}
