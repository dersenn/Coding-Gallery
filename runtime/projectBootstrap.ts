import type {
  CleanupFunction,
  ProjectContext,
  ProjectDefinition,
  ProjectLayerDefinition,
  Technique
} from '~/types/project'
import { shortcuts } from '~/utils/shortcuts'
import { Canvas } from '~/utils/canvas'
import { resolveContainer } from '~/utils/container'
import { singleActiveLayerManager, type SingleActiveLayerDefinition } from '~/runtime/layerRuntime'
import { SVG } from '~/utils/svg'

interface InitFromProjectDefinitionArgs {
  definition: ProjectDefinition
  container: HTMLElement
  context: ProjectContext
  loadLayerModule: (layer: ProjectLayerDefinition) => Promise<unknown>
}

interface LayerModuleDraw {
  draw?: (context: Record<string, unknown>) => void
}

const resolveDefaultLayerId = (layers: ProjectLayerDefinition[]): string => {
  return layers.find((layer) => layer.defaultActive)?.id ?? layers[0]!.id
}

const resolveTechniqueFromLayer = (layer: ProjectLayerDefinition): Technique => {
  return layer.technique
}

export async function initFromProjectDefinition(
  args: InitFromProjectDefinitionArgs
): Promise<CleanupFunction> {
  const { definition, container, context, loadLayerModule } = args

  // Escape hatch for advanced sketches that still require custom orchestration.
  if (typeof definition.init === 'function') {
    return definition.init(container, context)
  }

  const layers = definition.layers ?? []
  if (!layers.length) {
    throw new Error(
      `Project "${definition.id}" has no init() and no layers for metadata bootstrap`
    )
  }

  const { controls, utils, theme, onControlChange, registerAction } = context
  const { v, rnd } = shortcuts(utils)
  const controlState: ProjectContext['controls'] & { activeLayer: string } = {
    ...controls,
    activeLayer: (controls.activeLayer as string | undefined) ?? resolveDefaultLayerId(layers)
  }

  const rootContainerMode = definition.container ?? 'full'
  const { el: baseContainer, width, height } = resolveContainer(container, rootContainerMode)
  const loadedLayerModules = new Map<string, LayerModuleDraw>()

  const layerDefinitions: SingleActiveLayerDefinition<string>[] = layers.map((layer) => ({
    id: layer.id,
    technique: resolveTechniqueFromLayer(layer),
    canvas: layer.container ?? 'full',
    createRuntime: ({ parent, width: layerWidth, height: layerHeight }) => {
      const frame = { x: 0, y: 0, width: layerWidth, height: layerHeight }
      const drawWithModule = () => {
        const layerModule = loadedLayerModules.get(layer.id)
        layerModule?.draw?.({
          technique: layer.technique,
          svg,
          canvas,
          ctx: canvas?.ctx,
          frame,
          theme,
          utils,
          controls: controlState,
          v,
          rnd
        })
      }

      let svg: SVG | undefined
      let canvas: Canvas | undefined
      if (layer.technique === 'svg') {
        svg = new SVG({
          parent,
          id: `${definition.id}-${layer.id}`,
          width: layerWidth,
          height: layerHeight
        })
      } else if (layer.technique === 'canvas2d') {
        canvas = new Canvas({
          parent,
          id: `${definition.id}-${layer.id}`,
          width: layerWidth,
          height: layerHeight
        })
      } else {
        throw new Error(
          `Technique "${layer.technique}" is not supported by metadata bootstrap yet`
        )
      }

      return {
        technique: layer.technique,
        draw: () => {
          if (svg) {
            svg.stage.replaceChildren()
          }
          drawWithModule()
        },
        exportSvg: (seed) => {
          if (!svg) return
          svg.save(String(seed), `${definition.id}-${layer.id}`)
        },
        exportPng: (seed) => {
          if (!canvas) return
          canvas.save({ projectId: `${definition.id}-${layer.id}`, seed })
        },
        destroy: () => {
          if (svg) svg.stage.remove()
          if (canvas) canvas.el.remove()
        }
      }
    }
  }))

  for (const layer of layers) {
    const layerModule = await loadLayerModule(layer) as LayerModuleDraw
    loadedLayerModules.set(layer.id, layerModule)
  }

  const layerManager = singleActiveLayerManager({
    parent: baseContainer,
    width,
    height,
    initialLayerId: controlState.activeLayer,
    layers: layerDefinitions
  })

  const draw = () => {
    utils.seed.reset()
    layerManager.setActiveLayer(controlState.activeLayer)
    layerManager.draw()
  }

  draw()

  onControlChange((nextControls) => {
    Object.assign(controlState, nextControls)
    draw()
  })

  registerAction('download-svg', () => {
    layerManager.exportActiveSvg(utils.seed.current)
  })
  registerAction('download-png', () => {
    layerManager.exportActivePng(utils.seed.current)
  })

  return () => {
    layerManager.destroy()
  }
}
