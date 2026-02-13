<template>
  <div>
    <NuxtPage :transition="{
      name: 'page',
      mode: 'out-in'
    }" />
  </div>
</template>

<style>
/* Page transition - crossfade */
.page-enter-active,
.page-leave-active {
  transition: opacity 0.3s ease;
}

.page-enter-from,
.page-leave-to {
  opacity: 0;
}
</style>
