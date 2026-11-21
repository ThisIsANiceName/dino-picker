<!--
  DinoFacts: the fact block for a dino (badges, pronunciation, stats, era bar, fun fact).
  Degrades for non-catalog dinos: shows whatever is known.
  Props: dino, layout ('card' | 'wide')
-->
<script setup>
import { computed } from 'vue'
import { UiBadge } from '../ui/index.js'
import EraBar from './EraBar.vue'
import { bodyTypeLabel, fmtMetres, fmtWeight, lengthOf, regionsText } from './dinoUtils.js'

const props = defineProps({
  dino: { type: Object, required: true },
  layout: { type: String, default: 'card' },
})

const stats = computed(() => {
  const d = props.dino
  const kmh = d.speedKmh
  return [
    { label: 'Length', value: fmtMetres(lengthOf(d)) },
    { label: 'Height', value: fmtMetres(d.heightM) ?? (d.height || null) },
    { label: 'Weight', value: fmtWeight(d.weightKg) ?? (d.weight || null) },
    { label: 'Top speed', value: kmh ? `${kmh} km/h` : null },
    { label: 'Found in', value: regionsText(d) || null, wide: true },
  ].filter((s) => s.value)
})
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-wrap gap-1.5">
      <UiBadge v-if="dino.period" variant="period" :value="dino.period" dot />
      <UiBadge v-if="dino.diet" variant="diet" :value="dino.diet" dot />
      <UiBadge v-if="dino.bodyType">{{ bodyTypeLabel(dino.bodyType) }}</UiBadge>
      <UiBadge v-if="dino.isDinosaur === false" variant="info">Not technically a dinosaur</UiBadge>
      <UiBadge v-if="dino.source === 'custom'" variant="accent">Custom dino</UiBadge>
    </div>

    <dl v-if="stats.length" :class="['grid gap-x-4 gap-y-3', layout === 'wide' ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2']">
      <div v-for="s in stats" :key="s.label" :class="['min-w-0', s.wide ? 'col-span-2' : '', s.wide && layout === 'wide' ? 'sm:col-span-4' : '']">
        <dt class="text-xs font-semibold text-ink-subtle">{{ s.label }}</dt>
        <dd class="font-display text-xl leading-tight tabular break-words">{{ s.value }}</dd>
      </div>
    </dl>

    <EraBar v-if="dino.period || dino.myaFrom != null" :from="dino.myaFrom" :to="dino.myaTo" :period="dino.period" />

    <div v-if="dino.funFact" class="relative mt-2 rounded-md bg-primary-soft border-[1.5px] border-ink px-4 pt-4 pb-3.5 shadow-sticker-sm -rotate-[0.6deg]">
      <span class="absolute -top-3 left-3 inline-flex items-center h-6 px-2.5 rounded-full bg-ink text-ink-inverse text-2xs font-semibold rotate-[-3deg]">Fun fact</span>
      <p class="text-[0.9375rem] leading-relaxed">{{ dino.funFact }}</p>
    </div>
  </div>
</template>
