<!--
  EraTimeline: each teammate's dino as a range on the 252-66 mya scale, with period bands.
  Built in HTML/CSS so labels stay crisp and readable at every width.
-->
<script setup>
import { computed } from 'vue'
import { ERA_END, ERA_START, PERIODS, dinoName, firstName } from '../dinopedia/dinoUtils.js'

const props = defineProps({ rows: { type: Array, required: true } })

const SPAN = ERA_START - ERA_END
const pct = (mya) => ((ERA_START - mya) / SPAN) * 100
const BAND = { triassic: 'bg-period-triassic/10', jurassic: 'bg-period-jurassic/10', cretaceous: 'bg-period-cretaceous/10' }
const FILL = { triassic: 'bg-period-triassic', jurassic: 'bg-period-jurassic', cretaceous: 'bg-period-cretaceous' }
const LINE = { triassic: 'border-period-triassic', jurassic: 'border-period-jurassic', cretaceous: 'border-period-cretaceous' }

const items = computed(() => props.rows
  .filter((r) => r.dino && (r.dino.myaFrom != null || PERIODS.some((p) => p.value === r.dino.period)))
  .map((r) => {
    const p = PERIODS.find((pp) => pp.value === r.dino.period)
    const exact = r.dino.myaFrom != null
    const from = exact ? r.dino.myaFrom : p.from
    const to = exact ? (r.dino.myaTo ?? from) : p.to
    return {
      id: r.person.id, name: firstName(r.person.name), dino: dinoName(r.dino), from, to, exact, period: r.dino.period,
      text: exact ? (from === to ? `${from} million years ago` : `${from} to ${to} million years ago`) : `sometime in the ${p.label}`,
    }
  })
  .sort((a, b) => b.from - a.from))
</script>

<template>
  <div v-if="items.length">
    <div class="grid grid-cols-[minmax(4.5rem,7rem)_1fr] gap-x-3">
      <span aria-hidden="true" />
      <div class="flex text-xs font-semibold text-ink-muted" aria-hidden="true">
        <span v-for="p in PERIODS" :key="p.value" class="text-center truncate" :style="{ width: `${((p.from - p.to) / SPAN) * 100}%` }">{{ p.label }}</span>
      </div>
    </div>
    <ul class="mt-1.5 relative" :aria-label="`When each teammate's dino lived`">
      <li v-for="it in items" :key="it.id" class="grid grid-cols-[minmax(4.5rem,7rem)_1fr] gap-x-3 items-center h-8">
        <span class="text-sm font-semibold truncate text-right">{{ it.name }}</span>
        <span class="relative h-full flex" :title="`${it.name}: ${it.dino}, ${it.text}`">
          <span v-for="p in PERIODS" :key="p.value" :class="['h-full border-l border-dashed border-line-strong/50', BAND[p.value]]" :style="{ width: `${((p.from - p.to) / SPAN) * 100}%` }" aria-hidden="true" />
          <span
            :class="['absolute top-1/2 -translate-y-1/2 h-3.5 rounded-full border-[1.5px]', it.exact ? `${FILL[it.period] ?? 'bg-ink-subtle'} border-ink` : `border-dashed ${LINE[it.period] ?? 'border-ink-subtle'} bg-transparent`]"
            :style="{ left: `${pct(it.from)}%`, width: `max(12px, ${pct(it.to) - pct(it.from)}%)` }"
            aria-hidden="true"
          />
          <span class="sr-only">{{ it.dino }}, {{ it.text }}</span>
        </span>
      </li>
    </ul>
    <div class="grid grid-cols-[minmax(4.5rem,7rem)_1fr] gap-x-3 mt-1 text-2xs text-ink-subtle tabular" aria-hidden="true">
      <span />
      <span class="flex justify-between"><span>252 million years ago</span><span>66</span></span>
    </div>
    <p v-if="items.some((i) => !i.exact)" class="mt-3 text-xs text-ink-subtle flex items-center gap-2">
      <span class="inline-block w-6 h-3 rounded-full border-[1.5px] border-dashed border-ink-subtle" aria-hidden="true" /> Custom dinos: we only know the period.
    </p>
  </div>
  <p v-else class="text-ink-muted">Pick some dinos to see when the herd lived.</p>
</template>
