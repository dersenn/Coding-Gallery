export interface LoopTickState {
  elapsed: number  // pause-compensated ms since loop start
  delta: number    // ms since last frame
  frame: number    // integer frame count from 0
}

export interface LoopManager {
  register: (fn: (state: LoopTickState) => void) => void
  pause: () => void
  resume: () => void
  stop: () => void
  readonly paused: boolean
}

interface PauseApi {
  paused: boolean
  enablePause?: () => void
  onPauseChange?: (cb: (paused: boolean) => void) => () => void
}

export function createLoopManager(
  getIsConnected: () => boolean,
  pauseApi?: PauseApi
): LoopManager {
  let tickFn: ((state: LoopTickState) => void) | null = null
  let rafId: number | null = null
  let running = false
  let isPaused = pauseApi?.paused ?? false

  let startTime: number | null = null
  let prevTime: number | null = null
  let pausedAt: number | null = null
  let totalPausedMs = 0
  let frame = 0

  let pauseCleanup: (() => void) | null = null

  const tick = (now: number) => {
    if (!running) return

    if (!getIsConnected()) {
      stop()
      return
    }

    if (isPaused) {
      rafId = null
      return
    }

    if (startTime === null) startTime = now
    if (prevTime === null) prevTime = now

    const elapsed = (now - startTime) - totalPausedMs
    const delta = now - prevTime
    prevTime = now

    tickFn!({ elapsed, delta, frame })
    frame++

    rafId = requestAnimationFrame(tick)
  }

  const start = () => {
    if (rafId !== null) return
    rafId = requestAnimationFrame(tick)
  }

  const pause = () => {
    if (isPaused) return
    isPaused = true
    pausedAt = performance.now()
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
  }

  const resume = () => {
    if (!isPaused) return
    isPaused = false
    if (pausedAt !== null) {
      totalPausedMs += performance.now() - pausedAt
      pausedAt = null
    }
    if (running) start()
  }

  const stop = () => {
    running = false
    if (rafId !== null) {
      cancelAnimationFrame(rafId)
      rafId = null
    }
    if (pauseCleanup) {
      pauseCleanup()
      pauseCleanup = null
    }
  }

  const register = (fn: (state: LoopTickState) => void) => {
    if (running) return  // idempotent — already running, controls read live each tick
    tickFn = fn
    running = true

    pauseApi?.enablePause?.()

    if (pauseApi?.onPauseChange) {
      pauseCleanup = pauseApi.onPauseChange((paused) => {
        if (paused) pause()
        else resume()
      })
    }

    if (!isPaused) start()
  }

  return {
    register,
    pause,
    resume,
    stop,
    get paused() { return isPaused }
  }
}
