<!--
  UiStatBar: labelled horizontal bar for traits and composition stats.

  Two modes:
   - unipolar (default): label left, value right, bar fills 0..max. ("Energy  4/5")
   - bipolar (set minLabel + maxLabel): marker on a scale between two poles.
     ("Night owl  ●──────  Early bird")

  Props
    label     String  required trait name
    value     Number  required
    max       Number  default 5 (catalog traits are 1..5); use 100 for percentages
    minLabel  String  left pole (bipolar mode)
    maxLabel  String  right pole (bipolar mode)
    color     String  any CSS colour for the fill, default primary
    compare   Number|null  optional second value drawn as an outline tick (e.g. a teammate)
    format    Function(value, max) => String  readout, default "v/max"
    animate   Boolean grow-in on mount (700 ms, disabled under reduced motion). Default true
    hideValue Boolean

  A11y: role="meter" with aria-valuenow/min/max + aria-valuetext including poles.
-->
<script setup>
import { computed } from 'vue'

const props = defineProps({
  label: { type: String, required: true },
  value: { type: Number, required: true },
  max: { type: Number, default: 5 },
  minLabel: { type: String, default: '' },
  maxLabel: { type: String, default: '' },
  color: { type: String, default: '' },
  compare: { type: Number, default: null },
  format: { type: Function, default: null },
  animate: { type: Boolean, default: true },
  hideValue: { type: Boolean, default: false },
})

const bipolar = computed(() => !!(props.minLabel && props.maxLabel))
const pct = computed(() => Math.min(100, Math.max(0, (props.value / (props.max || 1)) * 100)))
const cmpPct = computed(() => (props.compare === null ? null : Math.min(100, Math.max(0, (props.compare / props.max) * 100))))
const readout = computed(() => (props.format ? props.format(props.value, props.max) : `${props.value}/${props.max}`))
const valueText = computed(() =>
  bipolar.value
    ? `${props.value} of ${props.max}, between ${props.minLabel} and ${props.maxLabel}`
    : `${readout.value}`,
)
const fill = computed(() => props.color || 'rgb(var(--c-primary))')
</script>

<template>
  <div class="ui-statbar">
    <div class="flex items-baseline justify-between gap-3 mb-1.5">
      <span class="text-sm font-semibold text-ink">{{ label }}</span>
      <span v-if="!hideValue && !bipolar" class="text-sm tabular text-ink-muted">{{ readout }}</span>
    </div>
    <div
      role="meter"
      :aria-label="label"
      :aria-valuenow="value"
      aria-valuemin="0"
      :aria-valuemax="max"
      :aria-valuetext="valueText"
      class="relative h-3.5 rounded-full border-[1.5px] border-ink bg-surface-raised"
    >
      <!-- unipolar fill -->
      <div
        v-if="!bipolar"
        :class="['absolute inset-y-0 left-0 rounded-full origin-left', animate ? 'ui-statbar__grow' : '']"
        :style="{ width: `${pct}%`, background: fill }"
      />
      <!-- bipolar: centre tick + marker -->
      <template v-else>
        <span class="absolute inset-y-0.5 left-1/2 w-px bg-line-strong" aria-hidden="true" />
        <span
          :class="['absolute top-1/2 w-5 h-5 -ml-2.5 -mt-2.5 rounded-full border-2 border-ink shadow-sticker-sm', animate ? 'ui-statbar__slide' : '']"
          :style="{ left: `${pct}%`, background: fill }"
          aria-hidden="true"
        />
      </template>
      <span
        v-if="cmpPct !== null"
        class="absolute -top-1 -bottom-1 w-1 -ml-0.5 rounded-full bg-ink"
        :style="{ left: `${cmpPct}%` }"
        aria-hidden="true"
      />
    </div>
    <div v-if="bipolar" class="flex justify-between mt-1 text-xs text-ink-subtle">
      <span>{{ minLabel }}</span><span>{{ maxLabel }}</span>
    </div>
  </div>
</template>

<style scoped>
.ui-statbar__grow { animation: bar-grow 700ms var(--ease-out) both; }
.ui-statbar__slide { animation: marker-in 700ms var(--ease-spring) both; }
@keyframes bar-grow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
@keyframes marker-in { from { opacity: 0; transform: scale(0.3); } to { opacity: 1; transform: none; } }
</style>
