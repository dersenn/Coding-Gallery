<template>
  <div>
    <UContainer>
      <div class="mb-4">
        <NuxtLink to="/" class="text-primary">← Back to Gallery</NuxtLink>
      </div>

      <div v-if="project">
        <div class="mb-6">
          <h1 class="text-3xl font-bold mb-2">{{ project.title }}</h1>
          <p class="text-gray-600 mb-4">{{ project.description }}</p>
          <div class="flex gap-2 mb-2">
            <UBadge v-for="tag in project.tags" :key="tag">{{ tag }}</UBadge>
          </div>
          <p class="text-sm text-gray-500">{{ project.date }}</p>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div class="lg:col-span-3">
            <ProjectViewer :project="project" />
          </div>
          
          <div v-if="project.controls && project.controls.length > 0">
            <ControlPanel :controls="project.controls" />
          </div>
        </div>
      </div>

      <div v-else>
        <p>Project not found</p>
      </div>
    </UContainer>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const { getProjectById } = useProjectLoader()
const { initializeControls } = useControls()

const project = computed(() => getProjectById(route.params.id as string))

watch(project, (newProject) => {
  if (newProject) {
    initializeControls(newProject.controls)
  }
}, { immediate: true })
</script>
