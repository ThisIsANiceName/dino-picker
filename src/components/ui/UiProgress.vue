<!--
  UiProgress: determinate progress.

  Props
    value    Number  current (0..max)
    max      Number  default 100
    label    String  required accessible name ("Quiz progress", "Exporting team shirts")
    variant  'bar' (default) | 'steps' (one segment per step; quiz)
    showValue Boolean  show "value / max" (steps) or "NN%" (bar) next to the label
    tone     'primary' | 'accent' | 'success'  default 'primary'
    hideLabel Boolean  keep the label for screen readers only

  role="progressbar" with aria-valuenow/min/max and aria-valuetext.
-->
<script setup>
import { computed } from 'vue'

const props = defineProps({
  value: { type: Number, default: 0 },
  max: { type: Number, default: 100 },
  label: { type: String, required: true },
  variant: { type: String, default: 'bar' },
  showValue: { type: Boolean, default: false },
  tone: { type: String, default: 'primary' },
  hideLabel: { type: Boolean, default: false },
})
const pct = computed(() => Math.min(100, Math.max(0, (props.value / (props.max || 1)) * 100)))
const text = computed(() => (props.variant === 'steps' ? `${props.value} of ${props.max}` : `${Math.round(pct.value)}%`))
const FILL = { primary: 'bg-primary', accent: 'bg-accent', success: 'bg-success' }
</script>

<template>
  <div class="ui-progress">
    <div v-if="!hideLabel || showValue" class="flex items-baseline justify-between mb-1.5 text-sm">
      <span :class="hideLabel ? 'sr-only' : 'font-semibold text-ink'">{{ label }}</span>
      <span v-if="showValue" class="tabular text-ink-muted" aria-hidden="true">{{ text }}</span>
    </div>
    <div
      role="progressbar"
      :aria-label="label"
      :aria-valuenow="value"
      aria-valuemin="0"
      :aria-valuemax="max"
      :aria-valuetext="text"
    >
      <div v-if="variant === 'steps'" class="flex gap-1">
        <span
          v-for="i in max"
          :key="i"
          :class="[
            'h-2.5 flex-1 rounded-full border-[1.5px] border-ink transition-colors duration-base',
            i <= value ? FILL[tone] ?? FILL.primary : 'bg-surface-raised',
            i === value ? 'ui-progress__current' : '',
          ]"
        />
      </div>
      <div v-else class="h-3 rounded-full border-[1.5px] border-ink bg-surface-raised overflow-hidden">
        <div
          :class="['h-full rounded-full transition-[width] duration-slow ease-out', FILL[tone] ?? FILL.primary]"
          :style="{ width: `${pct}%` }"
        />
      </div>
    </div>
  </div>
</template>

<style scoped>
.ui-progress__current { animation: pop-in 360ms var(--ease-spring) both; }
@keyframes pop-in { 0% { transform: scaleY(0.4); } 60% { transform: scaleY(1.5); } 100% { transform: none; } }
</style>
