import type { CleanupFunction } from '~/types/project'
import type { SingleActiveLayerRuntime } from '~/runtime/layerRuntime'

export type P5LayerInit = (container: HTMLElement) => Promise<CleanupFunction> | CleanupFunction

interface CreateP5LayerRuntimeArgs {
  parent: HTMLElement
  init: P5LayerInit
}

export function createP5LayerRuntime(args: CreateP5LayerRuntimeArgs): SingleActiveLayerRuntime {
  const { parent, init } = args
  let cleanup: CleanupFunction | null = null
  let cleanupRequested = false

  const runCleanup = () => {
    if (!cleanup) return
    const fn = cleanup
    cleanup = null
    fn()
  }

  void Promise.resolve(init(parent))
    .then((teardown) => {
      cleanup = teardown
      if (cleanupRequested) {
        runCleanup()
      }
    })
    .catch((error) => {
      console.error('Failed to initialize p5 layer runtime', error)
    })

  return {
    technique: 'p5',
    // p5 owns its own animation loop; manager draw only ensures mount.
    draw: () => {},
    destroy: () => {
      cleanupRequested = true
      runCleanup()
    }
  }
}
