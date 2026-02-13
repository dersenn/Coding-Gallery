<template>
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
    <NuxtLink 
      v-for="project in projects" 
      :key="project.id"
      :to="`/project/${project.id}`"
      class="block"
    >
      <UCard>
        <template #header>
          <h3 class="text-xl font-semibold">{{ project.title }}</h3>
        </template>

        <p class="text-gray-600 mb-4">{{ project.description }}</p>
        
        <div class="flex flex-wrap gap-2 mb-3">
          <UBadge v-for="tag in project.tags" :key="tag" size="sm">{{ tag }}</UBadge>
        </div>

        <p class="text-xs text-gray-500">{{ project.date }}</p>
      </UCard>
    </NuxtLink>
  </div>
</template>

<script setup lang="ts">
const { projects } = useProjectLoader()
</script>
