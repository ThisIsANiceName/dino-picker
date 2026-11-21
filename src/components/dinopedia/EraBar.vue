<!--
  EraBar: where a dino lived on a Triassic to Cretaceous scale (252 to 66 mya).
  The marker slides into place on mount (skipped under reduced motion).
-->
<script setup>
import { computed, onMounted, ref } from 'vue'
import { prefersReducedMotion } from '../ui/index.js'
import { ERA_END, ERA_START, PERIODS, fmtMya } from './dinoUtils.js'

const props = defineProps({
  from: { type: Number, default: null },
  to: { type: Number, default: null },
  period: { type: String, default: '' },
})

const span = ERA_START - ERA_END
const TINT = { triassic: 'bg-period-triassic/20', jurassic: 'bg-period-jurassic/20', cretaceous: 'bg-period-cretaceous/20' }
const pos = (mya) => Math.min(100, Math.max(0, ((ERA_START - mya) / span) * 100))
const range = computed(() => {
  let f = props.from, t = props.to
  if (f == null) {
    const p = PERIODS.find((x) => x.value === props.period)
    if (!p) return null
    f = p.from; t = p.to
  }
  if (t == null) t = f
  const left = pos(f), right = pos(t)
  return { left, width: Math.max(1.4, right - left) }
})
const settled = ref(prefersReducedMotion())
onMounted(() => { if (!settled.value) requestAnimationFrame(() => requestAnimationFrame(() => { settled.value = true })) })
const label = computed(() => fmtMya(props.from, props.to) ?? (props.period ? `Sometime in the ${props.period.charAt(0).toUpperCase()}${props.period.slice(1)}` : 'Unknown age'))
</script>

<template>
  <figure class="era-bar">
    <figcaption class="flex items-baseline justify-between gap-3 mb-2">
      <span class="text-sm font-semibold">When it lived</span>
      <span class="text-sm text-ink-muted tabular text-right">{{ label }}</span>
    </figcaption>
    <div class="relative" role="img" :aria-label="`Timeline: ${label}, on a scale from 252 to 66 million years ago`">
      <div class="flex h-7 rounded-full border-[1.5px] border-ink overflow-hidden">
        <div
          v-for="p in PERIODS"
          :key="p.value"
          :class="['relative flex items-center justify-center text-2xs font-semibold border-r last:border-r-0 border-ink/40', TINT[p.value], period === p.value ? 'text-ink' : 'text-ink-muted']"
          :style="{ width: `${((p.from - p.to) / span) * 100}%` }"
        >
          <span class="truncate px-1">{{ p.label }}</span>
        </div>
      </div>
      <div
        v-if="range"
        :class="['era-bar__marker absolute -top-1.5 -bottom-1.5 rounded-full border-2 border-ink', from == null ? 'bg-accent/20 border-dashed' : 'bg-accent shadow-sticker-sm']"
        :style="{ left: settled ? `${range.left}%` : '0%', width: `${range.width}%`, minWidth: '10px' }"
        aria-hidden="true"
      />
    </div>
    <div class="flex justify-between mt-1.5 text-2xs text-ink-subtle tabular" aria-hidden="true">
      <span>252 mya</span><span>66 mya</span>
    </div>
  </figure>
</template>

<style scoped>
.era-bar__marker { transition: left 700ms var(--ease-spring); opacity: 0.92; }
</style>
