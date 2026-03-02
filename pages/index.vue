<template>
  <div class="min-h-screen bg-black text-white font-medium p-4">
    <UContainer>
      <h1 class="text-2xl leading-tight tracking-tight mb-4">Things I've Coded…</h1>
      <ProjectList :show-hidden="showHiddenProjects" />
    </UContainer>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const showHiddenProjects = useState<boolean>('showHiddenProjects', () => false)

const showHiddenToken = computed(() => {
  const tokenFromQuery = route.query.showHidden
  if (typeof tokenFromQuery === 'string') return tokenFromQuery
  if (Array.isArray(tokenFromQuery) && typeof tokenFromQuery[0] === 'string') return tokenFromQuery[0]
  return ''
})

const { data: showHiddenAccess } = await useFetch<{ enabled: boolean }>('/api/show-hidden', {
  query: computed(() => showHiddenToken.value ? { showHidden: showHiddenToken.value } : {}),
  default: () => ({ enabled: false }),
  watch: [showHiddenToken]
})

watchEffect(() => {
  showHiddenProjects.value = showHiddenAccess.value?.enabled === true
})
</script>
