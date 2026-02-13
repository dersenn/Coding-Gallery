<template>
  <div>
    <UContainer>
      <h1 class="text-3xl font-bold mb-8">Creative Coding Gallery</h1>
      <ProjectList />
    </UContainer>
  </div>
</template>

<script setup lang="ts">
const { projects } = useProjectLoader()
</script>
