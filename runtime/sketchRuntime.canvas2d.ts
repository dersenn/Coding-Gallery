import { Canvas } from '~/utils/canvas'
import type { SingleActiveSketchRuntime } from '~/runtime/sketchRuntime'

interface CreateCanvas2dLayerRuntimeArgs {
  parent: HTMLElement
  width: number
  height: number
  runtimeName: string
  print?: PrintContractConfig
  onDraw: (canvas: Canvas) => void
  onDestroy?: () => void
}

export function createCanvas2dSketchRuntime(
  args: CreateCanvas2dLayerRuntimeArgs
): SingleActiveSketchRuntime {
  const { parent, width, height, runtimeName, print, onDraw, onDestroy } = args
  const canvas = new Canvas({
    parent,
    id: runtimeName,
    width,
    height,
    print,
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
      onDestroy?.()
      // canvas.el.remove()
    }
  }
}
