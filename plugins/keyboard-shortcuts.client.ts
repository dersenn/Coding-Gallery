// Nuxt convention plugin entrypoint.
// Keep this file in `plugins/` even when lightweight so global shortcuts have
// a stable home separate from project-specific route shortcuts.
export default defineNuxtPlugin(() => {
  if (import.meta.client) {
    const handleKeyPress = (_event: KeyboardEvent) => {
      // Reserved for non-project global shortcuts.
      // Project viewer shortcuts (n/r/d) are handled in components/ProjectRouteView.vue.
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
