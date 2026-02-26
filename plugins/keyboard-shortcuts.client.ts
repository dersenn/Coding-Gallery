export default defineNuxtPlugin(() => {
  if (import.meta.client) {
    const handleKeyPress = (_event: KeyboardEvent) => {
      // Reserved for non-project global shortcuts.
      // Project viewer shortcuts (n/r/d) are handled in pages/project/[id].vue.
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
