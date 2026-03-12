import type {
  CleanupFunction,
  ProjectContext,
  ProjectDefinition,
  ProjectLayerDefinition,
  Technique
} from '~/types/project'
import { shortcuts } from '~/utils/shortcuts'
import { resolveContainer } from '~/utils/container'
import { singleActiveLayerManager, type SingleActiveLayerDefinition } from '~/runtime/layerRuntime'
import { createSvgLayerRuntime } from '~/runtime/layerRuntime.svg'
import { createCanvas2dLayerRuntime } from '~/runtime/layerRuntime.canvas2d'
import { createP5LayerRuntime } from '~/runtime/layerRuntime.p5'

interface InitFromProjectDefinitionArgs {
  definition: ProjectDefinition
  container: HTMLElement
  context: ProjectContext
  loadLayerModule: (layer: ProjectLayerDefinition) => Promise<unknown>
}

interface LayerModuleDraw {
  draw?: (context: Record<string, unknown>) => void
}

interface LayerModuleP5 {
  init?: (container: HTMLElement, context: ProjectContext) => Promise<CleanupFunction> | CleanupFunction
}

type LayerModule = LayerModuleDraw & LayerModuleP5

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
  const { v, rnd, coin } = shortcuts(utils)
  const controlState: ProjectContext['controls'] & { activeLayer: string } = {
    ...controls,
    activeLayer: (controls.activeLayer as string | undefined) ?? resolveDefaultLayerId(layers)
  }

  const rootContainerMode = definition.container ?? 'full'
  const { el: baseContainer, width, height } = resolveContainer(container, rootContainerMode)
  const loadedLayerModules = new Map<string, LayerModule>()
  const layerById = new Map(layers.map((layer) => [layer.id, layer]))

  const layerDefinitions: SingleActiveLayerDefinition<string>[] = layers.map((layer) => ({
    id: layer.id,
    technique: resolveTechniqueFromLayer(layer),
    canvas: layer.container ?? 'full',
    createRuntime: ({ parent, width: layerWidth, height: layerHeight }) => {
      const frame = { x: 0, y: 0, width: layerWidth, height: layerHeight }
      const drawWithModule = (
        svg?: import('~/utils/svg').SVG,
        canvas?: import('~/utils/canvas').Canvas
      ) => {
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
          rnd,
          coin
        })
      }

      if (layer.technique === 'svg') {
        return createSvgLayerRuntime({
          parent,
          width: layerWidth,
          height: layerHeight,
          runtimeName: `${definition.id}-${layer.id}`,
          onDraw: (svg) => {
            drawWithModule(svg)
          }
        })
      }

      if (layer.technique === 'canvas2d') {
        return createCanvas2dLayerRuntime({
          parent,
          width: layerWidth,
          height: layerHeight,
          runtimeName: `${definition.id}-${layer.id}`,
          onDraw: (canvas) => {
            drawWithModule(undefined, canvas)
          }
        })
      }

      if (layer.technique === 'p5') {
        const layerModule = loadedLayerModules.get(layer.id)
        if (typeof layerModule?.init !== 'function') {
          throw new Error(
            `Layer "${layer.id}" uses technique "p5" but module is missing init(container, context)`
          )
        }

        // Align p5 startup with seed-aware sketches by resetting once at mount.
        utils.seed.reset()
        return createP5LayerRuntime({
          parent,
          init: (layerContainer) => {
            return layerModule.init!(layerContainer, {
              controls: controlState,
              utils,
              theme,
              onControlChange,
              registerAction
            })
          }
        })
      }

      throw new Error(
        `Technique "${layer.technique}" is not supported by metadata bootstrap yet`
      )
    }
  }))

  for (const layer of layers) {
    const layerModule = await loadLayerModule(layer) as LayerModule
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
    layerManager.setActiveLayer(controlState.activeLayer)
    if (layerById.get(controlState.activeLayer)?.technique !== 'p5') {
      utils.seed.reset()
    }
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
