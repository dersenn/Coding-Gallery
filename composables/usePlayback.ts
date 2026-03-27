export const usePlayback = () => {
  const paused = useState<boolean>('runtimePaused', () => false)
  const pauseEnabled = useState<boolean>('runtimePauseEnabled', () => false)

  const togglePause = () => {
    paused.value = !paused.value
  }

  const setPaused = (value: boolean) => {
    paused.value = value
  }

  const setPauseEnabled = (value: boolean) => {
    pauseEnabled.value = value
    if (!value) {
      paused.value = false
    }
  }

  return {
    paused,
    pauseEnabled,
    togglePause,
    setPaused,
    setPauseEnabled
  }
}

