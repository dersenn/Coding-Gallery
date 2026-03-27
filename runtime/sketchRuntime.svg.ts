import { SVG } from '~/utils/svg'
import type { SingleActiveSketchRuntime } from '~/runtime/sketchRuntime'

interface CreateSvgLayerRuntimeArgs {
  parent: HTMLElement
  width: number
  height: number
  runtimeName: string
  onDraw: (svg: SVG) => void
}

export function createSvgSketchRuntime(args: CreateSvgLayerRuntimeArgs): SingleActiveSketchRuntime {
  const { parent, width, height, runtimeName, onDraw } = args
  const svg = new SVG({ parent, id: runtimeName, width, height })

  return {
    technique: 'svg',
    draw: () => {
      svg.stage.replaceChildren()
      onDraw(svg)
    },
    exportSvg: (seed) => {
      svg.save(String(seed), runtimeName)
    },
    destroy: () => {
      svg.stage.remove()
    }
  }
}
