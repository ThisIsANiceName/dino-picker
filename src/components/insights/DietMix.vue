<!-- DietMix: one labelled bar per diet (count of teammates). -->
<script setup>
import { UiStatBar } from '../ui/index.js'
import { cap } from '../dinopedia/dinoUtils.js'
import { dietWord } from './stats.js'

defineProps({ rows: { type: Array, required: true }, total: { type: Number, required: true } })
const COLOR = { herbivore: '#3E8A37', carnivore: '#D2335F', omnivore: '#E8951A', piscivore: '#27779D', insectivore: '#6254A6' }
</script>

<template>
  <ul v-if="rows.length" class="space-y-4">
    <li v-for="(r, i) in rows" :key="r.key" :style="{ '--i': i }" class="diet-row">
      <UiStatBar :label="cap(dietWord(r.key, r.count))" :value="r.count" :max="total" :color="COLOR[r.key] ?? '#7F8875'" :format="(v, m) => `${v} of ${m}`" />
    </li>
  </ul>
  <p v-else class="text-ink-muted">No dinos yet, so no menu.</p>
</template>

<style scoped>
.diet-row :deep(.ui-statbar__grow) { animation-delay: calc(var(--i) * 60ms); }
</style>
