<!--
  UiSlider: labelled range slider on a native <input type="range"> (full keyboard:
  arrows, PageUp/PageDown, Home/End; screen readers get aria-valuetext).

  Props
    modelValue  Number  (v-model)
    label       String  required visible label
    min / max / step  Number  defaults 0 / 100 / 1
    format      Function(value) => String  display + aria-valuetext (e.g. v => `${v}%`)
    hideValue   Boolean  hide the value readout
    disabled    Boolean

  Emits: update:modelValue (Number, on input), change (Number, on release; use for undo history)
-->
<script>
let uid = 0 // module scope: shared across instances (not reset per component)
</script>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  modelValue: { type: Number, default: 0 },
  label: { type: String, required: true },
  min: { type: Number, default: 0 },
  max: { type: Number, default: 100 },
  step: { type: Number, default: 1 },
  format: { type: Function, default: (v) => String(v) },
  hideValue: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue', 'change'])
const id = `ui-slider-${++uid}`
const pct = computed(() => ((props.modelValue - props.min) / (props.max - props.min || 1)) * 100)
</script>

<template>
  <div class="ui-slider">
    <div class="flex items-baseline justify-between mb-1.5">
      <label :for="id" class="text-sm font-semibold text-ink">{{ label }}</label>
      <output v-if="!hideValue" :for="id" class="text-sm tabular text-ink-muted">{{ format(modelValue) }}</output>
    </div>
    <input
      :id="id"
      type="range"
      :min="min"
      :max="max"
      :step="step"
      :value="modelValue"
      :disabled="disabled"
      :aria-valuetext="format(modelValue)"
      :style="{ '--pct': `${pct}%` }"
      class="ui-range w-full"
      @input="emit('update:modelValue', Number($event.target.value))"
      @change="emit('change', Number($event.target.value))"
    />
  </div>
</template>

<style scoped>
.ui-range {
  -webkit-appearance: none;
  appearance: none;
  height: 28px;
  background: transparent;
  cursor: pointer;
}
.ui-range:disabled { opacity: 0.45; cursor: not-allowed; }
.ui-range::-webkit-slider-runnable-track {
  height: 10px;
  border-radius: 9999px;
  border: 1.5px solid rgb(var(--c-ink));
  background: linear-gradient(to right, rgb(var(--c-primary)) var(--pct), rgb(var(--c-surface-raised)) var(--pct));
}
.ui-range::-moz-range-track {
  height: 7px;
  border-radius: 9999px;
  border: 1.5px solid rgb(var(--c-ink));
  background: rgb(var(--c-surface-raised));
}
.ui-range::-moz-range-progress {
  height: 7px;
  border-radius: 9999px;
  background: rgb(var(--c-primary));
}
.ui-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 22px;
  height: 22px;
  margin-top: -7.5px;
  border-radius: 9999px;
  background: rgb(var(--c-surface-raised));
  border: 2px solid rgb(var(--c-ink));
  box-shadow: 2px 2px 0 0 rgb(var(--c-shadow));
  transition: transform var(--dur-fast) var(--ease-spring);
}
.ui-range::-moz-range-thumb {
  width: 18px;
  height: 18px;
  border-radius: 9999px;
  background: rgb(var(--c-surface-raised));
  border: 2px solid rgb(var(--c-ink));
  box-shadow: 2px 2px 0 0 rgb(var(--c-shadow));
}
.ui-range:active::-webkit-slider-thumb { transform: scale(1.15); }
.ui-range:focus-visible { outline: none; }
.ui-range:focus-visible::-webkit-slider-thumb { box-shadow: 0 0 0 4px rgb(var(--c-focus)); }
.ui-range:focus-visible::-moz-range-thumb { box-shadow: 0 0 0 4px rgb(var(--c-focus)); }
</style>
