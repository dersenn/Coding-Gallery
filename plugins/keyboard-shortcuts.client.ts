export default defineNuxtPlugin(() => {
  if (import.meta.client) {
    const handleKeyPress = async (event: KeyboardEvent) => {
      // Only trigger if not typing in input/textarea
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return
      }

      switch (event.key.toLowerCase()) {
        case 'n': {
          event.preventDefault()
          const { generateNewSeed } = useSeedFromURL()
          await generateNewSeed()
          break
        }
        // Future: Add more global shortcuts here
        // Projects can still register their own shortcuts (like 'd' for download)
      }
    }

    window.addEventListener('keydown', handleKeyPress)

    // Cleanup on plugin unmount
    return {
      provide: {
        removeKeyboardShortcuts: () => {
          window.removeEventListener('keydown', handleKeyPress)
        },
      },
    }
  }
})
