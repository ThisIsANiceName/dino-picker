<script setup>
defineProps({
  question: { type: Object, required: true }, // { text, options: [{ label, traits }] }
  index: { type: Number, required: true },
  total: { type: Number, required: true },
})

const emit = defineEmits(['answer'])
</script>

<template>
  <div class="space-y-6">
    <!-- Progress -->
    <div class="space-y-1">
      <div class="flex justify-between text-xs text-earth-600">
        <span>Question {{ index + 1 }} / {{ total }}</span>
        <span>{{ Math.round(((index + 1) / total) * 100) }}%</span>
      </div>
      <div class="h-1.5 rounded-full bg-earth-800 overflow-hidden" role="progressbar" :aria-valuenow="index + 1" :aria-valuemax="total">
        <div
          class="h-full bg-amber-500 rounded-full transition-all duration-300"
          :style="{ width: `${((index + 1) / total) * 100}%` }"
        />
      </div>
    </div>

    <!-- Question text -->
    <h2 class="font-display text-fossil-50 text-xl leading-snug">
      {{ question.text }}
    </h2>

    <!-- Answer options -->
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <button
        v-for="(option, i) in question.options"
        :key="i"
        class="text-left p-4 rounded-xl bg-earth-800 border border-earth-700 hover:border-amber-500 hover:bg-earth-700 transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-amber-500"
        :aria-label="option.label"
        @click="emit('answer', option)"
      >
        <span class="text-amber-500 font-display font-bold mr-2">{{ String.fromCharCode(65 + i) }})</span>
        <span class="text-fossil-100 text-sm">{{ option.label }}</span>
      </button>
    </div>
  </div>
</template>
