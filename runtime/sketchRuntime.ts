import { resolveContainer } from '~/utils/container'
import type { ContainerConfig, ContainerMode } from '~/utils/container'
import type { CleanupFunction, Technique } from '~/types/project'
import { createSvgSketchRuntime } from '~/runtime/sketchRuntime.svg'
import { createCanvas2dSketchRuntime } from '~/runtime/sketchRuntime.canvas2d'
import { createP5SketchRuntime } from '~/runtime/sketchRuntime.p5'

export type SketchCanvas = ContainerConfig | ContainerMode
export type SketchTechniqueRuntime = Technique

export interface SingleActiveSketchRuntime {
  technique: SketchTechniqueRuntime
  draw: () => void
  destroy: () => void
  exportSvg?: (seed: string | number) => void
  exportPng?: (seed: string | number) => void
}

export interface SingleActiveSketchCreateArgs<LayerId extends string> {
  id: LayerId
  parent: HTMLElement
  width: number
  height: number
}

export interface SingleActiveSketchFrame {
  x: number
  y: number
  width: number
  height: number
}

export interface SingleActiveSketchDefinition<LayerId extends string> {
  id: LayerId
  technique: SketchTechniqueRuntime
  canvas: SketchCanvas
  createRuntime: (
    args: SingleActiveSketchCreateArgs<LayerId>
  ) => SingleActiveSketchRuntime
}

export interface SingleActiveSketchManagerArgs<LayerId extends string> {
  parent: HTMLElement
  width: number
  height: number
  initialLayerId: LayerId
  sketches: ReadonlyArray<SingleActiveSketchDefinition<LayerId>>
  onResizeRedraw?: () => void
}

export interface SingleActiveSketchManager<LayerId extends string> {
  setActiveLayer: (id: LayerId) => void
  draw: () => void
  exportActiveSvg: (seed: string | number) => void
  exportActivePng: (seed: string | number) => void
  destroy: () => void
}

interface SingleActiveSketchRegistryContextArgs<
  LayerId extends string,
  RuntimeArgs extends object
> {
  technique: SketchTechniqueRuntime
  frame: SingleActiveSketchFrame
  args: SingleActiveSketchCreateArgs<LayerId> & RuntimeArgs
  svg?: import('~/utils/svg').SVG
  canvas?: import('~/utils/canvas').Canvas
  ctx?: CanvasRenderingContext2D
}

interface SingleActiveSketchRegistryDrawEntry<
  LayerId extends string,
  RuntimeArgs extends object,
  DrawContext extends object
> {
  label: string
  technique: Exclude<SketchTechniqueRuntime, 'p5'>
  canvas: SketchCanvas
  draw: (context: DrawContext) => void
  createContext: (params: SingleActiveSketchRegistryContextArgs<LayerId, RuntimeArgs>) => DrawContext
  resolveRuntimeName?: (id: LayerId) => string
}

interface SingleActiveSketchRegistryP5Entry<
  LayerId extends string,
  RuntimeArgs extends object
> {
  label: string
  technique: 'p5'
  canvas: SketchCanvas
  init: (
    args: SingleActiveSketchCreateArgs<LayerId> & RuntimeArgs
  ) => Promise<CleanupFunction> | CleanupFunction
  resolveRuntimeName?: (id: LayerId) => string
}

export type SingleActiveSketchRegistryEntry<
  LayerId extends string,
  RuntimeArgs extends object,
  DrawContext extends object
> =
  | SingleActiveSketchRegistryDrawEntry<LayerId, RuntimeArgs, DrawContext>
  | SingleActiveSketchRegistryP5Entry<LayerId, RuntimeArgs>

export type SingleActiveSketchRegistry<
  LayerId extends string,
  RuntimeArgs extends object,
  DrawContext extends object
> = Record<LayerId, SingleActiveSketchRegistryEntry<LayerId, RuntimeArgs, DrawContext>>

export interface SingleActiveSketchSelectOption<LayerId extends string> {
  label: string
  value: LayerId
}

export interface SingleActiveSketchSetupArgs<
  LayerId extends string,
  RuntimeArgs extends object,
  DrawContext extends object
> {
  registry: SingleActiveSketchRegistry<LayerId, RuntimeArgs, DrawContext>
}

export interface SingleActiveSketchSetup<
  LayerId extends string,
  RuntimeArgs extends object
> {
  defaultSketchId: LayerId
  options: SingleActiveSketchSelectOption<LayerId>[]
  createLayerDefinitions: (
    runtimeArgs: RuntimeArgs
  ) => SingleActiveSketchDefinition<LayerId>[]
}

export function singleActiveSketchSetup<
  LayerId extends string,
  RuntimeArgs extends object,
  DrawContext extends object
>(
  config: SingleActiveSketchSetupArgs<LayerId, RuntimeArgs, DrawContext>
): SingleActiveSketchSetup<LayerId, RuntimeArgs> {
  const entries = Object.entries(config.registry) as Array<
    [LayerId, SingleActiveSketchRegistryEntry<LayerId, RuntimeArgs, DrawContext>]
  >
  const firstEntry = entries[0]
  if (!firstEntry) {
    throw new Error('Sketch registry must contain at least one entry')
  }

  return {
    defaultSketchId: firstEntry[0],
    options: entries.map(([id, entry]) => ({ label: entry.label, value: id })),
    createLayerDefinitions: (runtimeArgs) => {
      return entries.map(([id, entry]) => ({
        id,
        technique: entry.technique,
        canvas: entry.canvas,
        createRuntime: (baseArgs) => {
          const args = { ...baseArgs, ...runtimeArgs }
          const runtimeName = entry.resolveRuntimeName?.(id) ?? String(id)
          const frame: SingleActiveSketchFrame = { x: 0, y: 0, width: args.width, height: args.height }

          if (entry.technique === 'svg') {
            return createSvgSketchRuntime({
              parent: args.parent,
              width: args.width,
              height: args.height,
              runtimeName,
              onDraw: (svg) => {
                entry.draw(entry.createContext({
                  technique: entry.technique,
                  svg,
                  frame,
                  args
                }))
              }
            })
          }

          if (entry.technique === 'canvas2d') {
            return createCanvas2dSketchRuntime({
              parent: args.parent,
              width: args.width,
              height: args.height,
              runtimeName,
              onDraw: (canvas) => {
                entry.draw(entry.createContext({
                  technique: entry.technique,
                  canvas,
                  ctx: canvas.ctx,
                  frame,
                  args
                }))
              }
            })
          }

          if (entry.technique === 'p5') {
            return createP5SketchRuntime({
              parent: args.parent,
              init: (container) => entry.init({ ...args, parent: container })
            })
          }

          throw new Error(
            `Sketch technique "${entry.technique}" is not supported by singleActiveSketchSetup yet`
          )
        }
      }))
    }
  }
}

export function singleActiveSketchManager<LayerId extends string>(
  args: SingleActiveSketchManagerArgs<LayerId>
): SingleActiveSketchManager<LayerId> {
  const { parent, width, height, sketches } = args

  const clampDimension = (value: number): number => Math.max(1, Math.round(value))
  let containerWidth = clampDimension(width)
  let containerHeight = clampDimension(height)

  const layerContainer = document.createElement('div')
  layerContainer.style.width = `${containerWidth}px`
  layerContainer.style.height = `${containerHeight}px`
  parent.appendChild(layerContainer)

  const layerById = new Map<LayerId, SingleActiveSketchDefinition<LayerId>>(
    sketches.map((sketch) => [sketch.id, sketch])
  )

  const getLayer = (id: LayerId): SingleActiveSketchDefinition<LayerId> => {
    const sketch = layerById.get(id)
    if (!sketch) {
      throw new Error(`Unknown sketch id: ${id}`)
    }
    return sketch
  }

  let activeSketchId = args.initialLayerId
  let mountedLayerId: LayerId | null = null
  let activeRuntime: SingleActiveSketchRuntime | null = null

  const mountActiveIfNeeded = (forceRemount = false) => {
    if (!forceRemount && activeRuntime && mountedLayerId === activeSketchId) {
      return
    }

    activeRuntime?.destroy()
    layerContainer.replaceChildren()

    const sketch = getLayer(activeSketchId)
    const { el, width: layerWidth, height: layerHeight } = resolveContainer(
      layerContainer,
      sketch.canvas
    )
    activeRuntime = sketch.createRuntime({
      id: sketch.id,
      parent: el,
      width: layerWidth,
      height: layerHeight
    })
    mountedLayerId = sketch.id
  }

  const updateContainerSize = (nextWidth: number, nextHeight: number): boolean => {
    const clampedWidth = clampDimension(nextWidth)
    const clampedHeight = clampDimension(nextHeight)
    if (clampedWidth === containerWidth && clampedHeight === containerHeight) {
      return false
    }
    containerWidth = clampedWidth
    containerHeight = clampedHeight
    layerContainer.style.width = `${containerWidth}px`
    layerContainer.style.height = `${containerHeight}px`
    return true
  }

  let resizeRafId: number | null = null
  let resizeObserver: ResizeObserver | null = null
  const hasWindow = typeof window !== 'undefined'

  const handleResize = () => {
    if (resizeRafId !== null) return
    if (!hasWindow) return
    resizeRafId = window.requestAnimationFrame(() => {
      resizeRafId = null
      if (!layerContainer.isConnected) return
      const sizeChanged = updateContainerSize(parent.clientWidth, parent.clientHeight)
      if (!sizeChanged) return
      const technique = getLayer(activeSketchId).technique
      if (technique !== 'canvas2d' && technique !== 'svg') return
      mountActiveIfNeeded(true)
      if (args.onResizeRedraw) {
        args.onResizeRedraw()
      } else {
        activeRuntime?.draw()
      }
    })
  }

  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => {
      handleResize()
    })
    resizeObserver.observe(parent)
  } else if (hasWindow) {
    window.addEventListener('resize', handleResize)
  }

  return {
    setActiveLayer: (id) => {
      activeSketchId = id
    },
    draw: () => {
      mountActiveIfNeeded()
      activeRuntime?.draw()
    },
    exportActiveSvg: (seed) => {
      activeRuntime?.exportSvg?.(seed)
    },
    exportActivePng: (seed) => {
      activeRuntime?.exportPng?.(seed)
    },
    destroy: () => {
      if (resizeObserver) {
        resizeObserver.disconnect()
      } else if (hasWindow) {
        window.removeEventListener('resize', handleResize)
      }
      if (hasWindow && resizeRafId !== null) {
        window.cancelAnimationFrame(resizeRafId)
      }
      activeRuntime?.destroy()
      // layerContainer.remove()
    }
  }
}
