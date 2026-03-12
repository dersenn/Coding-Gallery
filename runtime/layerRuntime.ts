import { resolveContainer } from '~/utils/container'
import type { ContainerConfig, ContainerMode } from '~/utils/container'
import type { CleanupFunction, Technique } from '~/types/project'
import { createSvgLayerRuntime } from '~/runtime/layerRuntime.svg'
import { createCanvas2dLayerRuntime } from '~/runtime/layerRuntime.canvas2d'
import { createP5LayerRuntime } from '~/runtime/layerRuntime.p5'

export type LayerCanvas = ContainerConfig | ContainerMode
export type LayerTechniqueRuntime = Technique

export interface SingleActiveLayerRuntime {
  technique: LayerTechniqueRuntime
  draw: () => void
  destroy: () => void
  exportSvg?: (seed: string | number) => void
  exportPng?: (seed: string | number) => void
}

export interface SingleActiveLayerCreateArgs<LayerId extends string> {
  id: LayerId
  parent: HTMLElement
  width: number
  height: number
}

export interface SingleActiveLayerFrame {
  x: number
  y: number
  width: number
  height: number
}

export interface SingleActiveLayerDefinition<LayerId extends string> {
  id: LayerId
  technique: LayerTechniqueRuntime
  canvas: LayerCanvas
  createRuntime: (
    args: SingleActiveLayerCreateArgs<LayerId>
  ) => SingleActiveLayerRuntime
}

export interface SingleActiveLayerManagerArgs<LayerId extends string> {
  parent: HTMLElement
  width: number
  height: number
  initialLayerId: LayerId
  layers: ReadonlyArray<SingleActiveLayerDefinition<LayerId>>
}

export interface SingleActiveLayerManager<LayerId extends string> {
  setActiveLayer: (id: LayerId) => void
  draw: () => void
  exportActiveSvg: (seed: string | number) => void
  exportActivePng: (seed: string | number) => void
  destroy: () => void
}

interface SingleActiveLayerRegistryContextArgs<
  LayerId extends string,
  RuntimeArgs extends object
> {
  technique: LayerTechniqueRuntime
  frame: SingleActiveLayerFrame
  args: SingleActiveLayerCreateArgs<LayerId> & RuntimeArgs
  svg?: import('~/utils/svg').SVG
  canvas?: import('~/utils/canvas').Canvas
  ctx?: CanvasRenderingContext2D
}

interface SingleActiveLayerRegistryDrawEntry<
  LayerId extends string,
  RuntimeArgs extends object,
  DrawContext extends object
> {
  label: string
  technique: Exclude<LayerTechniqueRuntime, 'p5'>
  canvas: LayerCanvas
  draw: (context: DrawContext) => void
  createContext: (params: SingleActiveLayerRegistryContextArgs<LayerId, RuntimeArgs>) => DrawContext
  resolveRuntimeName?: (id: LayerId) => string
}

interface SingleActiveLayerRegistryP5Entry<
  LayerId extends string,
  RuntimeArgs extends object
> {
  label: string
  technique: 'p5'
  canvas: LayerCanvas
  init: (
    args: SingleActiveLayerCreateArgs<LayerId> & RuntimeArgs
  ) => Promise<CleanupFunction> | CleanupFunction
  resolveRuntimeName?: (id: LayerId) => string
}

export type SingleActiveLayerRegistryEntry<
  LayerId extends string,
  RuntimeArgs extends object,
  DrawContext extends object
> =
  | SingleActiveLayerRegistryDrawEntry<LayerId, RuntimeArgs, DrawContext>
  | SingleActiveLayerRegistryP5Entry<LayerId, RuntimeArgs>

export type SingleActiveLayerRegistry<
  LayerId extends string,
  RuntimeArgs extends object,
  DrawContext extends object
> = Record<LayerId, SingleActiveLayerRegistryEntry<LayerId, RuntimeArgs, DrawContext>>

export interface SingleActiveLayerSelectOption<LayerId extends string> {
  label: string
  value: LayerId
}

export interface SingleActiveLayerSetupArgs<
  LayerId extends string,
  RuntimeArgs extends object,
  DrawContext extends object
> {
  registry: SingleActiveLayerRegistry<LayerId, RuntimeArgs, DrawContext>
}

export interface SingleActiveLayerSetup<
  LayerId extends string,
  RuntimeArgs extends object
> {
  defaultLayerId: LayerId
  options: SingleActiveLayerSelectOption<LayerId>[]
  createLayerDefinitions: (
    runtimeArgs: RuntimeArgs
  ) => SingleActiveLayerDefinition<LayerId>[]
}

export function singleActiveLayerSetup<
  LayerId extends string,
  RuntimeArgs extends object,
  DrawContext extends object
>(
  config: SingleActiveLayerSetupArgs<LayerId, RuntimeArgs, DrawContext>
): SingleActiveLayerSetup<LayerId, RuntimeArgs> {
  const entries = Object.entries(config.registry) as Array<
    [LayerId, SingleActiveLayerRegistryEntry<LayerId, RuntimeArgs, DrawContext>]
  >
  const firstEntry = entries[0]
  if (!firstEntry) {
    throw new Error('Layer registry must contain at least one entry')
  }

  return {
    defaultLayerId: firstEntry[0],
    options: entries.map(([id, entry]) => ({ label: entry.label, value: id })),
    createLayerDefinitions: (runtimeArgs) => {
      return entries.map(([id, entry]) => ({
        id,
        technique: entry.technique,
        canvas: entry.canvas,
        createRuntime: (baseArgs) => {
          const args = { ...baseArgs, ...runtimeArgs }
          const runtimeName = entry.resolveRuntimeName?.(id) ?? String(id)
          const frame: SingleActiveLayerFrame = { x: 0, y: 0, width: args.width, height: args.height }

          if (entry.technique === 'svg') {
            return createSvgLayerRuntime({
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
            return createCanvas2dLayerRuntime({
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
            return createP5LayerRuntime({
              parent: args.parent,
              init: (container) => entry.init({ ...args, parent: container })
            })
          }

          throw new Error(
            `Layer technique "${entry.technique}" is not supported by singleActiveLayerSetup yet`
          )
        }
      }))
    }
  }
}

export function singleActiveLayerManager<LayerId extends string>(
  args: SingleActiveLayerManagerArgs<LayerId>
): SingleActiveLayerManager<LayerId> {
  const { parent, width, height, layers } = args

  const layerContainer = document.createElement('div')
  layerContainer.style.width = `${width}px`
  layerContainer.style.height = `${height}px`
  parent.appendChild(layerContainer)

  const layerById = new Map<LayerId, SingleActiveLayerDefinition<LayerId>>(
    layers.map((layer) => [layer.id, layer])
  )

  const getLayer = (id: LayerId): SingleActiveLayerDefinition<LayerId> => {
    const layer = layerById.get(id)
    if (!layer) {
      throw new Error(`Unknown layer id: ${id}`)
    }
    return layer
  }

  let activeLayerId = args.initialLayerId
  let mountedLayerId: LayerId | null = null
  let activeRuntime: SingleActiveLayerRuntime | null = null

  const mountActiveIfNeeded = () => {
    if (activeRuntime && mountedLayerId === activeLayerId) {
      return
    }

    activeRuntime?.destroy()
    layerContainer.replaceChildren()

    const layer = getLayer(activeLayerId)
    const { el, width: layerWidth, height: layerHeight } = resolveContainer(
      layerContainer,
      layer.canvas
    )
    activeRuntime = layer.createRuntime({
      id: layer.id,
      parent: el,
      width: layerWidth,
      height: layerHeight
    })
    mountedLayerId = layer.id
  }

  return {
    setActiveLayer: (id) => {
      activeLayerId = id
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
      activeRuntime?.destroy()
      layerContainer.remove()
    }
  }
}
