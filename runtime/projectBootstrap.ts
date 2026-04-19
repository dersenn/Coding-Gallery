import type {
  CleanupFunction,
  ProjectContext,
  ProjectDefinition,
  ProjectSketchDefinition,
  Technique
} from '~/types/project'
import { shortcuts } from '~/utils/shortcuts'
import { resolveContainer, resolveInnerFrame } from '~/utils/container'
import { singleActiveSketchManager, type SingleActiveSketchDefinition } from '~/runtime/sketchRuntime'
import { createSvgSketchRuntime } from '~/runtime/sketchRuntime.svg'
import { createCanvas2dSketchRuntime } from '~/runtime/sketchRuntime.canvas2d'
import { createP5SketchRuntime } from '~/runtime/sketchRuntime.p5'
import { createLoopManager } from '~/runtime/loopManager'
import { resolveTheme } from '~/utils/theme'

interface InitFromProjectDefinitionArgs {
  definition: ProjectDefinition
  container: HTMLElement
  context: ProjectContext
  loadSketchModule: (sketch: ProjectSketchDefinition) => Promise<unknown>
}

interface LayerModuleDraw {
  draw?: (context: Record<string, unknown>) => void
}

interface LayerModuleP5 {
  init?: (container: HTMLElement, context: ProjectContext) => Promise<CleanupFunction> | CleanupFunction
}

type LayerModule = LayerModuleDraw & LayerModuleP5

const resolveDefaultLayerId = (sketches: ProjectSketchDefinition[]): string => {
  return sketches.find((sketch) => sketch.defaultActive)?.id ?? sketches[0]!.id
}

const resolveTechniqueFromLayer = (sketch: ProjectSketchDefinition): Technique => {
  return sketch.technique
}

export async function initFromProjectDefinition(
  args: InitFromProjectDefinitionArgs
): Promise<CleanupFunction> {
  const { definition, container, context, loadSketchModule } = args

  // Escape hatch for advanced sketches that still require custom orchestration.
  if (typeof definition.init === 'function') {
    return definition.init(container, context)
  }

  const sketches = definition.sketches ?? []
  if (!sketches.length) {
    throw new Error(
      `Project "${definition.id}" has no init() and no sketches for metadata bootstrap`
    )
  }

  const { controls, utils, theme, onControlChange, registerAction, setControls, runtime } = context
  const { v, rnd, coin } = shortcuts(utils)
  const controlState: ProjectContext['controls'] & { activeSketch: string } = {
    ...controls,
    activeSketch: (controls.activeSketch as string | undefined) ?? resolveDefaultLayerId(sketches)
  }

  const rootContainerMode = definition.container ?? 'full'
  const { el: baseContainer, width, height } = resolveContainer(container, rootContainerMode)
  const loadedLayerModules = new Map<string, LayerModule>()
  const layerById = new Map(sketches.map((sketch) => [sketch.id, sketch]))

  const layerDefinitions: SingleActiveSketchDefinition<string>[] = sketches.map((sketch) => ({
    id: sketch.id,
    technique: resolveTechniqueFromLayer(sketch),
    canvas: sketch.container ?? 'full',
    createRuntime: ({ parent, width: layerWidth, height: layerHeight }) => {
      const frame = { x: 0, y: 0, width: layerWidth, height: layerHeight }
      const drawWithModule = (
        svg?: import('~/utils/svg').SVG,
        canvas?: import('~/utils/canvas').Canvas
      ) => {
        const layerModule = loadedLayerModules.get(sketch.id)
        layerModule?.draw?.({
          technique: sketch.technique,
          svg,
          canvas,
          ctx: canvas?.ctx,
          frame,
          theme,
          utils,
          controls: controlState,
          setControls,
          runtime,
          v,
          rnd,
          coin
        })
      }

      if (sketch.technique === 'svg') {
        const containerConfig = typeof sketch.container === 'object' ? sketch.container : undefined
        return createSvgSketchRuntime({
          parent,
          width: layerWidth,
          height: layerHeight,
          runtimeName: `${definition.id}-${sketch.id}`,
          print: containerConfig?.print,
          onDraw: (svg) => {
            drawWithModule(svg)
          }
        })
      }

      if (sketch.technique === 'canvas2d') {
        const containerConfig = typeof sketch.container === 'object' ? sketch.container : undefined
        let canvasEl: HTMLElement | null = null
        const loopManager = createLoopManager(
          () => canvasEl?.isConnected ?? true,
          runtime
        )
        return createCanvas2dSketchRuntime({
          parent,
          width: layerWidth,
          height: layerHeight,
          runtimeName: `${definition.id}-${sketch.id}`,
          print: containerConfig?.print,
          onDraw: (canvas) => {
            canvasEl = canvas.el
            const augmentedRuntime = runtime ? { ...runtime, loop: loopManager.register } : undefined
            const layerModule = loadedLayerModules.get(sketch.id)
            layerModule?.draw?.({
              technique: sketch.technique,
              canvas,
              ctx: canvas.ctx,
              frame,
              theme,
              utils,
              controls: controlState,
              setControls,
              runtime: augmentedRuntime,
              v,
              rnd,
              coin
            })
          },
          onDestroy: () => loopManager.stop()
        })
      }

      if (sketch.technique === 'p5') {
        const layerModule = loadedLayerModules.get(sketch.id)
        if (typeof layerModule?.init !== 'function') {
          throw new Error(
            `Sketch "${sketch.id}" uses technique "p5" but module is missing init(container, context)`
          )
        }

        // Align p5 startup with seed-aware sketches by resetting once at mount.
        utils.seed.reset()
        return createP5SketchRuntime({
          parent,
          init: (layerContainer) => {
            return layerModule.init!(layerContainer, {
              controls: controlState,
              utils,
              theme,
              onControlChange,
              registerAction,
              setControls,
              runtime
            })
          }
        })
      }

      throw new Error(
        `Technique "${sketch.technique}" is not supported by metadata bootstrap yet`
      )
    }
  }))

  for (const sketch of sketches) {
    const layerModule = await loadSketchModule(sketch) as LayerModule
    loadedLayerModules.set(sketch.id, layerModule)
  }

  let layerManager: ReturnType<typeof singleActiveSketchManager<string>> | null = null
  let drawViaBootstrap: (() => void) | null = null

  layerManager = singleActiveSketchManager({
    parent: baseContainer,
    width,
    height,
    initialLayerId: controlState.activeSketch,
    sketches: layerDefinitions,
    onResizeRedraw: () => {
      drawViaBootstrap?.()
    }
  })

  let rootResizeObserver: ResizeObserver | null = null
  if (typeof ResizeObserver !== 'undefined' && baseContainer !== container) {
    rootResizeObserver = new ResizeObserver(() => {
      const frame = resolveInnerFrame(container.clientWidth, container.clientHeight, rootContainerMode)
      baseContainer.style.width = `${frame.width}px`
      baseContainer.style.height = `${frame.height}px`
    })
    rootResizeObserver.observe(container)
  }

  const draw = () => {
    if (!layerManager) return
    const activeSketch = layerById.get(controlState.activeSketch)
    const pref = activeSketch?.prefersTheme ?? definition.prefersTheme ?? 'dark'
    Object.assign(theme, resolveTheme(definition.theme, pref))
    layerManager.setActiveLayer(controlState.activeSketch)
    if (activeSketch?.technique !== 'p5') {
      utils.seed.reset()
    }
    layerManager.draw()
  }
  drawViaBootstrap = draw

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
    rootResizeObserver?.disconnect()
    layerManager.destroy()
  }
}
