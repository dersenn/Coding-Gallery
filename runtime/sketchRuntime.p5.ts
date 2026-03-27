import type { CleanupFunction } from '~/types/project'
import type { SingleActiveSketchRuntime } from '~/runtime/sketchRuntime'

export type P5LayerInit = (container: HTMLElement) => Promise<CleanupFunction> | CleanupFunction

interface CreateP5LayerRuntimeArgs {
  parent: HTMLElement
  init: P5LayerInit
}

export function createP5SketchRuntime(args: CreateP5LayerRuntimeArgs): SingleActiveSketchRuntime {
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
      console.error('Failed to initialize p5 sketch runtime', error)
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
