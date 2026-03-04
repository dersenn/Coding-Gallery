import { resolveCanvas } from '~/utils/canvas'
import type { CanvasConfig, CanvasMode } from '~/utils/canvas'
import type { SVG } from '~/utils/svg'

export type LayerCanvas = CanvasConfig | CanvasMode

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

export interface CreateSingleActiveSvgLayerManagerArgs<LayerId extends string> {
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

export interface SingleActiveSvgLayerRegistryEntry<
  LayerId extends string,
  RuntimeArgs extends object
> {
  label: string
  canvas: LayerCanvas
  createRuntime: (
    args: SingleActiveSvgLayerCreateArgs<LayerId> & RuntimeArgs
  ) => SingleActiveSvgLayerRuntime
}

export type SingleActiveSvgLayerRegistry<
  LayerId extends string,
  RuntimeArgs extends object
> = Record<LayerId, SingleActiveSvgLayerRegistryEntry<LayerId, RuntimeArgs>>

export interface SingleActiveSvgLayerSelectOption<LayerId extends string> {
  label: string
  value: LayerId
}

export interface SingleActiveSvgLayerSetup<
  LayerId extends string,
  RuntimeArgs extends object
> {
  entries: ReadonlyArray<[LayerId, SingleActiveSvgLayerRegistryEntry<LayerId, RuntimeArgs>]>
  defaultLayerId: LayerId
  options: SingleActiveSvgLayerSelectOption<LayerId>[]
  createLayerDefinitions: (
    runtimeArgs: RuntimeArgs
  ) => SingleActiveSvgLayerDefinition<LayerId>[]
}

export function createSingleActiveSvgLayerSetup<
  LayerId extends string,
  RuntimeArgs extends object
>(
  registry: SingleActiveSvgLayerRegistry<LayerId, RuntimeArgs>
): SingleActiveSvgLayerSetup<LayerId, RuntimeArgs> {
  const entries = Object.entries(registry) as Array<
    [LayerId, SingleActiveSvgLayerRegistryEntry<LayerId, RuntimeArgs>]
  >
  const firstEntry = entries[0]
  if (!firstEntry) {
    throw new Error('Layer registry must contain at least one entry')
  }

  return {
    entries,
    defaultLayerId: firstEntry[0],
    options: entries.map(([id, entry]) => ({ label: entry.label, value: id })),
    createLayerDefinitions: (runtimeArgs) => {
      return entries.map(([id, entry]) => ({
        id,
        canvas: entry.canvas,
        createRuntime: (baseArgs) => {
          return entry.createRuntime({ ...baseArgs, ...runtimeArgs })
        }
      }))
    }
  }
}

export function createSingleActiveSvgLayerManager<LayerId extends string>(
  args: CreateSingleActiveSvgLayerManagerArgs<LayerId>
): SingleActiveSvgLayerManager<LayerId> {
  const { parent, width, height, layers } = args

  const layerHost = document.createElement('div')
  // Keep host dimensions explicit so nested resolveCanvas calls have
  // concrete measurement bounds for per-layer aspect ratios.
  layerHost.style.width = `${width}px`
  layerHost.style.height = `${height}px`
  parent.appendChild(layerHost)

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
    layerHost.replaceChildren()

    const layer = getLayer(activeLayerId)
    const { el, width: layerWidth, height: layerHeight } = resolveCanvas(
      layerHost,
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
      layerHost.remove()
    }
  }
}
