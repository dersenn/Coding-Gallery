<template>
  <div class="min-h-screen bg-black">
    <NuxtPage :transition="{
      name: 'page',
      mode: 'out-in'
    }" />
  </div>
</template>

<script setup lang="ts">
// Drop a PNG/SVG export anywhere to restore its sketch, seed and controls
useRestoreFromFile()
</script>

<style>
/* Page transitions - crossfade */
.page-enter-active,
.page-leave-active {
  transition: opacity 0.3s ease;
}
.page-enter-from,
.page-leave-to {
  opacity: 0;
}
/* Sketch transitions - crossfade */
.sketch-enter-active,
.sketch-leave-active {
  transition: opacity 0.15s ease;
}
.sketch-enter-from,
.sketch-leave-to {
  opacity: 0;
}
</style>
