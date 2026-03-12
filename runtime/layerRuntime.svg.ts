import { SVG } from '~/utils/svg'
import type { SingleActiveLayerRuntime } from '~/runtime/layerRuntime'

interface CreateSvgLayerRuntimeArgs {
  parent: HTMLElement
  width: number
  height: number
  runtimeName: string
  onDraw: (svg: SVG) => void
}

export function createSvgLayerRuntime(args: CreateSvgLayerRuntimeArgs): SingleActiveLayerRuntime {
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
