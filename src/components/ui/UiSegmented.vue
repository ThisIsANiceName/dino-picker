<!--
  UiSegmented: single-choice segmented control (radio group semantics,
  arrow keys move + select, roving tabindex). Use for 2-5 mutually exclusive
  options: Front/Back, export size, square/circle preview, garment type.

  Props
    modelValue  String|Number  selected value (v-model)
    options     Array<{ value, label, icon?: String, disabled?: Boolean }>
                (plain strings/numbers are accepted and used as value + label)
    label       String  required accessible name for the group
    size        'sm' | 'md'  default 'md'
    block       Boolean  stretch to full width

  Emits: update:modelValue
-->
<script setup>
import { computed, ref } from 'vue'
import UiIcon from './UiIcon.vue'

const props = defineProps({
  modelValue: { type: [String, Number], default: null },
  options: { type: Array, required: true },
  label: { type: String, required: true },
  size: { type: String, default: 'md' },
  block: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue'])
const btns = ref([])

const opts = computed(() =>
  props.options.map((o) => (typeof o === 'object' ? o : { value: o, label: String(o) })),
)
const activeIndex = computed(() => Math.max(0, opts.value.findIndex((o) => o.value === props.modelValue)))

function onKey(e, i) {
  const n = opts.value.length
  let next = null
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = i + 1
  else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = i - 1
  if (next === null) return
  e.preventDefault()
  for (let k = 0; k < n; k++) {
    const j = (next + (next > i ? k : -k) + n * 2) % n
    if (!opts.value[j].disabled) {
      emit('update:modelValue', opts.value[j].value)
      btns.value[j]?.focus()
      return
    }
  }
}
</script>

<template>
  <div
    role="radiogroup"
    :aria-label="label"
    :class="[
      'inline-flex p-1 gap-1 rounded-full bg-surface-sunken border-[1.5px] border-line-strong',
      block ? 'flex w-full' : '',
    ]"
  >
    <button
      v-for="(o, i) in opts"
      :key="o.value"
      ref="btns"
      type="button"
      role="radio"
      :aria-checked="String(o.value === modelValue)"
      :tabindex="i === activeIndex ? 0 : -1"
      :disabled="o.disabled"
      :class="[
        'inline-flex items-center justify-center gap-1.5 rounded-full font-semibold whitespace-nowrap transition-colors duration-fast',
        'disabled:opacity-40 disabled:cursor-not-allowed',
        size === 'sm' ? 'h-7 px-3 text-xs' : 'h-9 px-4 text-sm',
        block ? 'flex-1' : '',
        o.value === modelValue ? 'bg-ink text-ink-inverse shadow-sticker-sm' : 'text-ink-muted hover:text-ink hover:bg-ink/[0.06]',
      ]"
      @click="emit('update:modelValue', o.value)"
      @keydown="onKey($event, i)"
    >
      <UiIcon v-if="o.icon" :name="o.icon" :size="size === 'sm' ? 14 : 16" />
      {{ o.label }}
    </button>
  </div>
</template>
