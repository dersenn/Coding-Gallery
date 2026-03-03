import type {
  CleanupFunction,
  ProjectActionDefinition,
  ProjectContext,
  ProjectControlDefinition
} from '~/types/project'
import { SVG, Grid, shortcuts, resolveCanvas } from '~/types/project'
import { syncControlState } from '~/composables/useControls'
import { buildSvgDownloadFilename, serializeSvgWithMetadata } from '~/utils/download'

type AnniLayer = 'sketch1' | 'sketch2'

const GRID_COLS = 8
const GRID_ROWS = 8

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
        default: ['sketch1'],
        options: [
          { label: 'Sketch 1', value: 'sketch1' },
          { label: 'Sketch 2', value: 'sketch2' }
        ]
      }
    ]
  }
]

export const actions: ProjectActionDefinition[] = [
  { key: 'download-svg', label: 'Download SVG' }
]

export const canvas = 'square'

export async function init(
  container: HTMLElement,
  context: ProjectContext
): Promise<CleanupFunction> {
  const { controls, utils, theme, onControlChange, registerAction } = context
  const { v } = shortcuts(utils)

  const controlState = {
    enabledLayers: controls.enabledLayers as AnniLayer[]
  }

  const { el, width, height } = resolveCanvas(container, canvas)

  const stack = document.createElement('div')
  stack.style.position = 'relative'
  stack.style.width = `${width}px`
  stack.style.height = `${height}px`
  el.appendChild(stack)

  const svg1 = new SVG({ parent: stack, id: 'anni-sketch1', width, height })
  const svg2 = new SVG({ parent: stack, id: 'anni-sketch2', width, height })

  ;[svg1.stage, svg2.stage].forEach((s) => {
    s.style.position = 'absolute'
    s.style.top = '0'
    s.style.left = '0'
  })

  const color1 = theme.palette[0] ?? theme.foreground
  const color2 = theme.palette[1] ?? theme.foreground

  const drawCell1 = (cell: { center: () => { x: number; y: number } }, svg: SVG) => {
    const c = cell.center()
    svg.makeCircle(v(c.x, c.y), 4, 'none', color1, 1)
  }

  const drawCell2 = (cell: { center: () => { x: number; y: number }; x: number; y: number; width: number; height: number }, svg: SVG) => {
    svg.makeRect(v(cell.x, cell.y), cell.width, cell.height, 'transparent', color2, 1)
  }

  const drawSketch1 = () => {
    svg1.stage.replaceChildren()
    svg1.makeRect(v(0, 0), width, height, theme.background, 'none', 0)
    const grid = new Grid({
      cols: GRID_COLS,
      rows: GRID_ROWS,
      width,
      height,
      x: 0,
      y: 0,
      utils
    })
    grid.forEach((cell) => drawCell1(cell, svg1))
  }

  const drawSketch2 = () => {
    svg2.stage.replaceChildren()
    svg2.makeRect(v(0, 0), width, height, theme.background, 'none', 0)
    const grid = new Grid({
      cols: GRID_COLS,
      rows: GRID_ROWS,
      width,
      height,
      x: 0,
      y: 0,
      utils
    })
    grid.forEach((cell) => drawCell2(cell, svg2))
  }

  const draw = () => {
    utils.seed.reset()
    drawSketch1()
    drawSketch2()

    const enabledLayers = new Set(controlState.enabledLayers)
    svg1.stage.style.display = enabledLayers.has('sketch1') ? 'block' : 'none'
    svg2.stage.style.display = enabledLayers.has('sketch2') ? 'block' : 'none'
  }

  draw()

  onControlChange((nextControls) => {
    syncControlState(controlState, nextControls)
    draw()
  })

  registerAction('download-svg', () => {
    const enabledLayers = new Set(controlState.enabledLayers)
    const ns = 'http://www.w3.org/2000/svg'
    const exportSvg = document.createElementNS(ns, 'svg') as SVGSVGElement
    exportSvg.setAttribute('xmlns', ns)
    exportSvg.setAttribute('width', width.toString())
    exportSvg.setAttribute('height', height.toString())
    exportSvg.setAttribute('viewBox', `0 0 ${width} ${height}`)

    const bg = document.createElementNS(ns, 'rect')
    bg.setAttribute('x', '0')
    bg.setAttribute('y', '0')
    bg.setAttribute('width', width.toString())
    bg.setAttribute('height', height.toString())
    bg.setAttribute('fill', theme.background)
    exportSvg.appendChild(bg)

    const cloneContent = (stage: SVGSVGElement) => {
      const children = Array.from(stage.children)
      for (let i = 1; i < children.length; i++) {
        exportSvg.appendChild(children[i]!.cloneNode(true))
      }
    }
    if (enabledLayers.has('sketch2')) cloneContent(svg2.stage)
    if (enabledLayers.has('sketch1')) cloneContent(svg1.stage)

    const str = serializeSvgWithMetadata(exportSvg, {
      projectId: 'anni',
      seed: utils.seed.current,
      sourceUrl: typeof window !== 'undefined' ? window.location.href : undefined
    })
    const blob = new Blob([str], { type: 'image/svg+xml' })
    const link = document.createElement('a')
    link.download = buildSvgDownloadFilename({ projectId: 'anni', seed: utils.seed.current })
    link.href = URL.createObjectURL(blob)
    link.click()
    URL.revokeObjectURL(link.href)
  })

  return () => {
    svg1.stage.remove()
    svg2.stage.remove()
    stack.remove()
  }
}
