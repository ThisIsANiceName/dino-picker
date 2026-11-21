<!--
  UiBadge: small non-interactive label (diet, period, status, counts).

  Props
    variant  'neutral' | 'primary' | 'accent' | 'success' | 'warning' | 'danger' | 'info'
             | 'diet' | 'period' | 'solid'           default 'neutral'
    value    String  for variant 'diet' (herbivore|carnivore|omnivore|piscivore|insectivore)
             or 'period' (triassic|jurassic|cretaceous). Picks colour and default label.
    size     'sm' | 'md'                              default 'md'
    dot      Boolean leading colour dot (so colour is never the only signal, text is always shown)

  Slot: default (label; falls back to the capitalised `value`)
-->
<script setup>
import { computed } from 'vue'

const props = defineProps({
  variant: { type: String, default: 'neutral' },
  value: { type: String, default: '' },
  size: { type: String, default: 'md' },
  dot: { type: Boolean, default: false },
})

// Tinted backgrounds with dark text: all >= 7:1.
const DIET = {
  herbivore: 'bg-fern-100 text-fern-800 border-fern-300',
  carnivore: 'bg-magma-100 text-magma-800 border-magma-300',
  omnivore: 'bg-resin-100 text-resin-800 border-resin-400',
  piscivore: 'bg-lagoon-100 text-lagoon-800 border-lagoon-300',
  insectivore: 'bg-plum-100 text-plum-800 border-plum-300',
}
const DIET_DOT = {
  herbivore: 'bg-diet-herbivore', carnivore: 'bg-diet-carnivore', omnivore: 'bg-diet-omnivore',
  piscivore: 'bg-diet-piscivore', insectivore: 'bg-diet-insectivore',
}
const PERIOD = {
  triassic: 'bg-[#F6DCCD] text-[#5E2810] border-[#D99673]',
  jurassic: 'bg-jungle-100 text-jungle-800 border-jungle-300',
  cretaceous: 'bg-plum-100 text-plum-800 border-plum-300',
}
const PERIOD_DOT = { triassic: 'bg-period-triassic', jurassic: 'bg-period-jurassic', cretaceous: 'bg-period-cretaceous' }
const BASE = {
  neutral: 'bg-surface-sunken text-ink-muted border-line',
  primary: 'bg-primary-soft text-resin-800 border-resin-400',
  accent: 'bg-accent-soft text-magma-800 border-magma-300',
  success: 'bg-success-soft text-fern-800 border-fern-300',
  warning: 'bg-warning-soft text-resin-800 border-resin-400',
  danger: 'bg-danger-soft text-[#5C1E1A] border-[#E59A92]',
  info: 'bg-info-soft text-lagoon-800 border-lagoon-300',
  solid: 'bg-ink text-ink-inverse border-ink',
}

const key = computed(() => props.value?.toLowerCase?.() ?? '')
const tone = computed(() => {
  if (props.variant === 'diet') return DIET[key.value] ?? BASE.neutral
  if (props.variant === 'period') return PERIOD[key.value] ?? BASE.neutral
  return BASE[props.variant] ?? BASE.neutral
})
const dotClass = computed(() => {
  if (props.variant === 'diet') return DIET_DOT[key.value] ?? 'bg-ink-subtle'
  if (props.variant === 'period') return PERIOD_DOT[key.value] ?? 'bg-ink-subtle'
  return 'bg-current'
})
const fallback = computed(() => (props.value ? props.value[0].toUpperCase() + props.value.slice(1) : ''))
</script>

<template>
  <span
    :class="[
      'inline-flex items-center gap-1.5 rounded-full border font-semibold whitespace-nowrap leading-none',
      size === 'sm' ? 'h-5 px-2 text-2xs' : 'h-6 px-2.5 text-xs',
      tone,
    ]"
  >
    <span v-if="dot" :class="['w-1.5 h-1.5 rounded-full', dotClass]" aria-hidden="true" />
    <slot>{{ fallback }}</slot>
  </span>
</template>
