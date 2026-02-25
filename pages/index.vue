<template>
  <div class="min-h-screen bg-black text-white font-medium py-4">
    <UContainer>
      <h1 class="text-2xl leading-tight tracking-tight mb-4">Coding Gallery</h1>
      <ProjectList />
    </UContainer>
  </div>
</template>

<script setup lang="ts">
const { projects } = useProjectLoader()
</script>
