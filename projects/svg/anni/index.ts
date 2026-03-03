import type {
  CleanupFunction,
  ProjectActionDefinition,
  ProjectContext,
  ProjectControlDefinition
} from '~/types/project'
import type { GridCellConfig } from '~/utils/grid'
import type { ThemeTokens } from '~/utils/theme'
import { SVG, Grid, GridCell, shortcuts, resolveCanvas } from '~/types/project'
import { syncControlState } from '~/composables/useControls'

type AnniLayer = 'anni-1'

// ─── Layer 1: Anni1Grid / Anni1Cell ───────────────────────────────────────────
// Per-layer Grid/Cell extension. Grid holds layer context (svg, color); Cell
// draws via this.grid. init() runs after construction because createCell() fires
// before subclass fields exist — same pattern as ShowcaseGrid in svg-example.

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
  }
}

// ─── Project ───────────────────────────────────────────────────────────────────

/**
 * Anni
 *
 * Multi-layer grid sketch with rudimentary cell draw. Each layer is an
 * individual SVG, toggleable via checkbox. Each layer has its own Grid/Cell
 * extension (Anni1Grid + Anni1Cell). Currently one layer: rect outline per
 * cell, theme.palette[0].
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
        type: 'checkbox-group',
        label: 'Layers',
        key: 'enabledLayers',
        default: ['anni-1'],
        options: [{ label: 'Anni 1', value: 'anni-1' }]
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
  const { v } = shortcuts(utils)

  const controlState = { enabledLayers: controls.enabledLayers as AnniLayer[] }

  // ─── Canvas and layer setup ─────────────────────────────────────────────────
  const { el, width, height } = resolveCanvas(container, canvas)
  el.style.position = 'relative'  // stacking context for absolute-positioned SVGs

  const svg1 = new SVG({ parent: el, id: 'anni-layer1', width, height })
  svg1.stage.style.position = 'absolute'
  svg1.stage.style.top = '0'
  svg1.stage.style.left = '0'

  // ─── Layer 1 draw ───────────────────────────────────────────────────────────
  const drawAnni1 = () => {
    svg1.stage.replaceChildren()
    svg1.makeRect(v(0, 0), width, height, theme.background, 'none', 0)
    const grid = new Anni1Grid({
      cols: 8,
      rows: 8,
      width,
      height,
      x: 0,
      y: 0,
      utils
    }).init({ svg: svg1, theme })
    grid.forEach((cell) => (cell as Anni1Cell).draw())
  }

  // ─── Draw entry point ───────────────────────────────────────────────────────
  const draw = () => {
    utils.seed.reset()
    drawAnni1()
    const enabled = new Set(controlState.enabledLayers)
    svg1.stage.style.display = enabled.has('anni-1') ? 'block' : 'none'
  }

  draw()

  onControlChange((nextControls) => {
    syncControlState(controlState, nextControls)
    draw()
  })

  registerAction('download-svg', () => {
    svg1.save(utils.seed.current, 'anni')
  })

  return () => {
    svg1.stage.remove()
  }
}
