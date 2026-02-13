<template>
  <UCard class="bg-black/50 backdrop-blur-md border border-white/10">
    <template #header>
      <div class="flex justify-between items-center">
        <h3 class="font-semibold text-white">Controls</h3>
        <UButton 
          size="xs" 
          variant="ghost" 
          color="neutral"
          @click="resetControls(controls)"
        >
          Reset
        </UButton>
      </div>
    </template>

    <div class="space-y-4">
      <div v-for="control in controls" :key="control.key">
        <label class="block text-sm font-medium mb-2 text-gray-300">
          {{ control.label }}
        </label>

        <!-- Slider -->
        <div v-if="control.type === 'slider'" class="space-y-2">
          <input
            type="range"
            :min="control.min"
            :max="control.max"
            :step="control.step"
            :value="controlValues[control.key]"
            @input="updateControl(control.key, parseFloat(($event.target as HTMLInputElement).value))"
            class="w-full accent-blue-500"
          />
          <div class="text-xs text-gray-400 text-right">
            {{ controlValues[control.key] }}
          </div>
        </div>

        <!-- Toggle -->
        <label v-else-if="control.type === 'toggle'" class="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            :checked="controlValues[control.key] as boolean"
            @change="updateControl(control.key, ($event.target as HTMLInputElement).checked)"
            class="w-5 h-5 rounded cursor-pointer accent-blue-500"
          />
          <span class="text-sm text-gray-300">{{ controlValues[control.key] ? 'On' : 'Off' }}</span>
        </label>

        <!-- Select -->
        <select
          v-else-if="control.type === 'select'"
          :value="controlValues[control.key]"
          @change="updateControl(control.key, ($event.target as HTMLSelectElement).value)"
          class="w-full px-3 py-2 bg-black/30 border border-white/20 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
        >
          <option 
            v-for="option in control.options" 
            :key="option.value" 
            :value="option.value"
            class="bg-gray-900"
          >
            {{ option.label }}
          </option>
        </select>

        <!-- Color -->
        <input
          v-else-if="control.type === 'color'"
          type="color"
          :value="controlValues[control.key]"
          @input="updateControl(control.key, ($event.target as HTMLInputElement).value)"
          class="w-full h-10 rounded cursor-pointer bg-black/30 border border-white/20"
        />
      </div>
    </div>
  </UCard>
</template>

<script setup lang="ts">
import type { ControlDefinition } from '~/types/project'

const props = defineProps<{
  controls: ControlDefinition[]
}>()

const { controlValues, updateControl, resetControls } = useControls()
</script>
