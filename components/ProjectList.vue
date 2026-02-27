<template>
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    <NuxtLink
      v-for="project in projects" 
      :key="project.id"
      :to="`/project/${project.id}`"
      class="group block"
    >
      <UCard class="bg-black/50 backdrop-blur-md font-medium"
      :ui="{
        root: 'ring-0',
        header: 'p-0',
        body: 'p-0',
        footer: 'p-0',
      }"
      >
        <template #header>
          <h3 class="text-xl text-white transition-colors group-hover:text-gray-200">{{ project.title }}</h3>
        </template>

        <!--<p class="text-sm text-gray-300 mb-4">{{ project.description }}</p>-->
        
        <div class="flex flex-wrap gap-2 mb-2">
          <UBadge v-for="tag in project.tags" :key="tag" size="sm">{{ tag }}</UBadge>
        </div>

        <p class="text-xs text-gray-600">{{ project.date }}</p>
      </UCard>
    </NuxtLink>
  </div>
</template>

<script setup lang="ts">
const { getVisibleProjects } = useProjectLoader()
const projects = computed(() => getVisibleProjects())
</script>
