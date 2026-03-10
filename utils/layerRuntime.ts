import { resolveContainer } from '~/utils/container'
import type { ContainerConfig, ContainerMode } from '~/utils/container'
import { Canvas } from '~/utils/canvas'
import { SVG } from '~/utils/svg'
import type { Technique } from '~/types/project'

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

export interface SingleActiveLayerRegistryEntry<
  LayerId extends string,
  RuntimeArgs extends object,
  DrawContext extends object
> {
  label: string
  technique: LayerTechniqueRuntime
  canvas: LayerCanvas
  draw: (context: DrawContext) => void
  createContext: (params: {
    technique: LayerTechniqueRuntime
    frame: SingleActiveLayerFrame
    args: SingleActiveLayerCreateArgs<LayerId> & RuntimeArgs
    svg?: SVG
    canvas?: Canvas
    ctx?: CanvasRenderingContext2D
  }) => DrawContext
  resolveRuntimeName?: (id: LayerId) => string
}

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
            const svg = new SVG({ parent: args.parent, id: runtimeName, width: args.width, height: args.height })
            return {
              technique: entry.technique,
              draw: () => {
                svg.stage.replaceChildren()
                entry.draw(entry.createContext({
                  technique: entry.technique,
                  svg,
                  frame,
                  args
                }))
              },
              exportSvg: (seed) => {
                svg.save(String(seed), runtimeName)
              },
              destroy: () => {
                svg.stage.remove()
              }
            }
          }

          if (entry.technique === 'canvas2d') {
            const canvas = new Canvas({
              parent: args.parent,
              id: runtimeName,
              width: args.width,
              height: args.height
            })
            return {
              technique: entry.technique,
              draw: () => {
                entry.draw(entry.createContext({
                  technique: entry.technique,
                  canvas,
                  ctx: canvas.ctx,
                  frame,
                  args
                }))
              },
              exportPng: (seed) => {
                canvas.save({ seed, projectId: runtimeName })
              },
              destroy: () => {
                canvas.el.remove()
              }
            }
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
