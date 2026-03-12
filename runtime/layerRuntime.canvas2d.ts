import { Canvas } from '~/utils/canvas'
import type { SingleActiveLayerRuntime } from '~/runtime/layerRuntime'

interface CreateCanvas2dLayerRuntimeArgs {
  parent: HTMLElement
  width: number
  height: number
  runtimeName: string
  onDraw: (canvas: Canvas) => void
}

export function createCanvas2dLayerRuntime(
  args: CreateCanvas2dLayerRuntimeArgs
): SingleActiveLayerRuntime {
  const { parent, width, height, runtimeName, onDraw } = args
  const canvas = new Canvas({
    parent,
    id: runtimeName,
    width,
    height
  })

  return {
    technique: 'canvas2d',
    draw: () => {
      onDraw(canvas)
    },
    exportPng: (seed) => {
      canvas.save({ seed, projectId: runtimeName })
    },
    destroy: () => {
      canvas.el.remove()
    }
  }
}
