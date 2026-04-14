import { SVG } from '~/utils/svg'
import type { SingleActiveSketchRuntime } from '~/runtime/sketchRuntime'

interface CreateSvgLayerRuntimeArgs {
  parent: HTMLElement
  width: number
  height: number
  runtimeName: string
  print?: PrintContractConfig
  onDraw: (svg: SVG) => void
  onDestroy?: () => void
}

export function createSvgSketchRuntime(args: CreateSvgLayerRuntimeArgs): SingleActiveSketchRuntime {
  const { parent, width, height, runtimeName, print, onDraw, onDestroy } = args
  const svg = new SVG({ 
    parent, 
    id: runtimeName, 
    width, 
    height,
    print,
  })

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
      onDestroy?.()
      // svg.stage.remove()
    }
  }
}
