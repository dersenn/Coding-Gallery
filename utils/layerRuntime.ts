import { resolveContainer } from '~/utils/container'
import type { ContainerConfig, ContainerMode } from '~/utils/container'
import { SVG } from '~/utils/svg'

export type LayerCanvas = ContainerConfig | ContainerMode

export interface SingleActiveSvgLayerRuntime {
  exportName: string
  svg: SVG
  draw: () => void
  destroy: () => void
}

export interface SingleActiveSvgLayerCreateArgs<LayerId extends string> {
  id: LayerId
  parent: HTMLElement
  width: number
  height: number
}

export interface SingleActiveSvgLayerDefinition<LayerId extends string> {
  id: LayerId
  canvas: LayerCanvas
  createRuntime: (
    args: SingleActiveSvgLayerCreateArgs<LayerId>
  ) => SingleActiveSvgLayerRuntime
}

export interface SingleActiveSvgLayerManagerArgs<LayerId extends string> {
  parent: HTMLElement
  width: number
  height: number
  initialLayerId: LayerId
  layers: ReadonlyArray<SingleActiveSvgLayerDefinition<LayerId>>
}

export interface SingleActiveSvgLayerManager<LayerId extends string> {
  setActiveLayer: (id: LayerId) => void
  draw: () => void
  exportActiveSvg: (seed: string | number) => void
  destroy: () => void
}

export interface SingleActiveSvgLayerFrame {
  x: number
  y: number
  width: number
  height: number
}

export interface SingleActiveSvgLayerRegistryEntry<
  LayerId extends string,
  DrawContext extends object
> {
  label: string
  canvas: LayerCanvas
  draw: (context: DrawContext) => void
}

export type SingleActiveSvgLayerRegistry<
  LayerId extends string,
  DrawContext extends object
> = Record<LayerId, SingleActiveSvgLayerRegistryEntry<LayerId, DrawContext>>

export interface SingleActiveSvgLayerSelectOption<LayerId extends string> {
  label: string
  value: LayerId
}

export interface SingleActiveSvgLayerSetupArgs<
  LayerId extends string,
  RuntimeArgs extends object,
  DrawContext extends object
> {
  registry: SingleActiveSvgLayerRegistry<LayerId, DrawContext>
  createContext: (params: {
    svg: SVG
    frame: SingleActiveSvgLayerFrame
    args: SingleActiveSvgLayerCreateArgs<LayerId> & RuntimeArgs
  }) => DrawContext
  resolveRuntimeName?: (id: LayerId) => string
}

export interface SingleActiveSvgLayerSetup<
  LayerId extends string,
  RuntimeArgs extends object
> {
  defaultLayerId: LayerId
  options: SingleActiveSvgLayerSelectOption<LayerId>[]
  createLayerDefinitions: (
    runtimeArgs: RuntimeArgs
  ) => SingleActiveSvgLayerDefinition<LayerId>[]
}

export function singleActiveSvgLayerSetup<
  LayerId extends string,
  RuntimeArgs extends object,
  DrawContext extends object
>(
  config: SingleActiveSvgLayerSetupArgs<LayerId, RuntimeArgs, DrawContext>
): SingleActiveSvgLayerSetup<LayerId, RuntimeArgs> {
  const { registry, createContext, resolveRuntimeName } = config
  const entries = Object.entries(registry) as Array<
    [LayerId, SingleActiveSvgLayerRegistryEntry<LayerId, DrawContext>]
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
        canvas: entry.canvas,
        createRuntime: (baseArgs) => {
          const args = { ...baseArgs, ...runtimeArgs }
          const runtimeName = resolveRuntimeName?.(id) ?? String(id)
          const svg = new SVG({ parent: args.parent, id: runtimeName, width: args.width, height: args.height })
          const frame: SingleActiveSvgLayerFrame = { x: 0, y: 0, width: args.width, height: args.height }
          return {
            exportName: runtimeName,
            svg,
            draw: () => {
              svg.stage.replaceChildren()
              entry.draw(createContext({ svg, frame, args }))
            },
            destroy: () => {
              svg.stage.remove()
            }
          }
        }
      }))
    }
  }
}

export function singleActiveSvgLayerManager<LayerId extends string>(
  args: SingleActiveSvgLayerManagerArgs<LayerId>
): SingleActiveSvgLayerManager<LayerId> {
  const { parent, width, height, layers } = args

  const layerContainer = document.createElement('div')
  // Keep container dimensions explicit so nested resolveContainer calls have
  // concrete measurement bounds for per-layer aspect ratios.
  layerContainer.style.width = `${width}px`
  layerContainer.style.height = `${height}px`
  parent.appendChild(layerContainer)

  const layerById = new Map<LayerId, SingleActiveSvgLayerDefinition<LayerId>>(
    layers.map((layer) => [layer.id, layer])
  )

  const getLayer = (id: LayerId): SingleActiveSvgLayerDefinition<LayerId> => {
    const layer = layerById.get(id)
    if (!layer) {
      throw new Error(`Unknown layer id: ${id}`)
    }
    return layer
  }

  let activeLayerId = args.initialLayerId
  let mountedLayerId: LayerId | null = null
  let activeRuntime: SingleActiveSvgLayerRuntime | null = null

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
      activeRuntime?.svg.save(String(seed), activeRuntime.exportName)
    },
    destroy: () => {
      activeRuntime?.destroy()
      layerContainer.remove()
    }
  }
}
