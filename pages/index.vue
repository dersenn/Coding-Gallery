<template>
  <div class="min-h-screen bg-black text-white font-medium p-4">
    <UContainer>
      <h1 class="text-2xl leading-tight tracking-tight mb-4">Things I've Coded…</h1>
      <ProjectList :show-hidden="showHiddenProjects" />
    </UContainer>
  </div>
</template>

<script setup lang="ts">
const config = useRuntimeConfig()
const route = useRoute()
const showHiddenProjects = useState<boolean>('showHiddenProjects', () => false)

if (import.meta.server) {
  const tokenFromQuery = route.query.showHidden
  const hiddenProjectsToken = config.hiddenProjectsToken

  showHiddenProjects.value = typeof tokenFromQuery === 'string'
    && hiddenProjectsToken.length > 0
    && tokenFromQuery === hiddenProjectsToken
}
</script>
