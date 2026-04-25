<script setup>
import { ref } from 'vue'

const props = defineProps({
  dino: { type: Object, required: true },
  selected: { type: Boolean, default: false },
  clickable: { type: Boolean, default: false },
})

const emit = defineEmits(['select'])

const imgError = ref(false)

const DIET_CONFIG = {
  herbivore: { label: '🌿 Herbivore', classes: 'diet-badge-herbivore' },
  carnivore: { label: '🥩 Carnivore', classes: 'diet-badge-carnivore' },
  omnivore:  { label: '🍽️ Omnivore',  classes: 'diet-badge-omnivore' },
}

function dietConfig(diet) {
  return DIET_CONFIG[diet?.toLowerCase()] ?? { label: diet ?? '—', classes: 'period-badge' }
}

// Inline SVG silhouette used when the dino image 404s
const FALLBACK_SVG = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'%3E%3Crect width='200' height='200' fill='%233d2c14'/%3E%3Ctext x='50%25' y='55%25' dominant-baseline='middle' text-anchor='middle' font-size='100'%3E🦕%3C/text%3E%3C/svg%3E`
</script>

<template>
  <article
    :class="[
      'relative rounded-xl overflow-hidden bg-earth-800 border transition-all duration-200 dino-card-texture',
      selected
        ? 'border-amber-500 ring-2 ring-amber-500/50'
        : 'border-earth-700 hover:border-amber-700',
      clickable ? 'cursor-pointer card-hover' : '',
    ]"
    :aria-pressed="clickable ? selected : undefined"
    :role="clickable ? 'button' : 'article'"
    :tabindex="clickable ? 0 : undefined"
    :aria-label="clickable ? `Select ${dino.name}` : dino.name"
    @click="clickable && emit('select', dino)"
    @keydown.enter="clickable && emit('select', dino)"
    @keydown.space.prevent="clickable && emit('select', dino)"
  >
    <!-- Image -->
    <div class="aspect-video bg-earth-900 overflow-hidden">
      <img
        v-if="!imgError"
        :src="dino.image"
        :alt="dino.name"
        class="w-full h-full object-cover"
        loading="lazy"
        @error="imgError = true"
      />
      <img
        v-else
        :src="FALLBACK_SVG"
        :alt="`${dino.name} silhouette`"
        class="w-full h-full object-contain p-4 opacity-40"
      />
    </div>

    <!-- Info -->
    <div class="p-3 space-y-2">
      <h3 class="font-display text-fossil-50 capitalize truncate text-sm font-semibold leading-tight">
        {{ dino.name }}
      </h3>

      <div class="flex flex-wrap gap-1">
        <span
          v-if="dino.diet"
          :class="['text-xs px-1.5 py-0.5 rounded font-medium', dietConfig(dino.diet).classes]"
        >
          {{ dietConfig(dino.diet).label }}
        </span>
        <span
          v-if="dino.period"
          class="text-xs px-1.5 py-0.5 rounded font-medium period-badge capitalize"
        >
          {{ dino.period }}
        </span>
      </div>
    </div>

    <!-- Selected checkmark -->
    <div
      v-if="selected"
      class="absolute top-2 right-2 w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center"
      aria-hidden="true"
    >
      <svg class="w-4 h-4 text-earth-950" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
        <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
      </svg>
    </div>
  </article>
</template>
