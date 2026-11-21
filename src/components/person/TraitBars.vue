<!--
  TraitBars: bipolar UiStatBars from traitProfile(dino), optionally with the
  person's quiz answers as compare ticks. Bars grow in once (staggered).
-->
<script setup>
import { computed } from 'vue'
import { UiStatBar } from '../ui/index.js'
import { TRAIT_AXES, traitProfile } from '../layout/contracts.js'

const props = defineProps({
  dino: { type: Object, required: true },
  quizTraits: { type: Object, default: null },
})
const profile = computed(() => traitProfile(props.dino))
const COLORS = ['#F5AE36', '#56A44C', '#D2335F', '#3A91BA', '#7A6CBE', '#E8951A', '#1F6B5C']
const rows = computed(() => (profile.value ? TRAIT_AXES.map((ax, i) => ({
  ...ax,
  value: profile.value[ax.key] ?? 3,
  compare: typeof props.quizTraits?.[ax.key] === 'number' ? props.quizTraits[ax.key] : null,
  color: COLORS[i % COLORS.length],
})) : []))
</script>

<template>
  <div v-if="rows.length">
    <ul class="grid sm:grid-cols-2 gap-x-10 gap-y-6">
      <li v-for="(r, i) in rows" :key="r.key" class="trait-row" :style="{ '--i': i }">
        <UiStatBar :label="r.label" :value="r.value" :max="5" :min-label="r.minLabel" :max-label="r.maxLabel" :color="r.color" :compare="r.compare" />
      </li>
    </ul>
    <p v-if="quizTraits" class="mt-6 text-sm text-ink-muted flex items-center gap-2">
      <span class="inline-block w-1 h-4 rounded-full bg-ink" aria-hidden="true" /> The tick marks show the quiz answers.
    </p>
  </div>
  <slot v-else name="empty" />
</template>

<style scoped>
.trait-row :deep(.ui-statbar__grow),
.trait-row :deep(.ui-statbar__slide) { animation-delay: calc(var(--i) * 60ms); }
</style>
