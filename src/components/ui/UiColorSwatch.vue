<!--
  UiColorSwatch: one round colour chip. Single colour, or a palette preset
  (2-3 colours shown as pie slices, e.g. body/belly/accent).

  Props
    color     String   hex, for a single swatch
    colors    String[] hexes, for a palette preset swatch (overrides color)
    name      String   required human name, used as accessible label ("Moss", "Sunset palette")
    selected  Boolean  shows the ring + check (aria-checked when role="radio")
    size      'sm' (28) | 'md' (36, default) | 'lg' (48)
    role      'radio' (default, inside a radiogroup) | 'button'
    tabindex  Number   for roving focus inside groups

  Emits: click
-->
<script setup>
import { computed } from 'vue'
import { readableOn } from './color.js'
import UiIcon from './UiIcon.vue'

const props = defineProps({
  color: { type: String, default: '#FFFFFF' },
  colors: { type: Array, default: null },
  name: { type: String, required: true },
  selected: { type: Boolean, default: false },
  size: { type: String, default: 'md' },
  role: { type: String, default: 'radio' },
  tabindex: { type: Number, default: undefined },
})

const SIZE = { sm: 'w-7 h-7', md: 'w-9 h-9', lg: 'w-12 h-12' }
const fill = computed(() => {
  const list = props.colors?.length ? props.colors : [props.color]
  if (list.length === 1) return list[0]
  const step = 100 / list.length
  return `conic-gradient(from -45deg, ${list.map((c, i) => `${c} ${i * step}% ${(i + 1) * step}%`).join(', ')})`
})
const checkColor = computed(() => readableOn(props.colors?.[0] ?? props.color))
</script>

<template>
  <button
    type="button"
    :role="role"
    :aria-checked="role === 'radio' ? String(selected) : undefined"
    :aria-pressed="role === 'button' ? String(selected) : undefined"
    :aria-label="name"
    :title="name"
    :tabindex="tabindex"
    :class="[
      'ui-swatch relative inline-flex items-center justify-center rounded-full shrink-0',
      'border-[1.5px] border-ink/80 transition-transform duration-fast ease-spring',
      SIZE[size] ?? SIZE.md,
      selected ? 'is-selected' : 'hover:scale-110',
    ]"
    :style="{ background: fill }"
  >
    <template v-if="selected">
      <span v-if="colors && colors.length > 1" class="absolute -right-1 -top-1 w-5 h-5 rounded-full bg-ink text-white grid place-items-center ring-2 ring-surface">
        <UiIcon name="check" :size="12" :stroke="3.25" />
      </span>
      <UiIcon v-else name="check" :size="size === 'sm' ? 14 : 18" :stroke="3" :style="{ color: checkColor }" />
    </template>
  </button>
</template>

<style scoped>
.ui-swatch.is-selected {
  box-shadow: 0 0 0 3px rgb(var(--c-surface)), 0 0 0 5px rgb(var(--c-ink));
}
.ui-swatch:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgb(var(--c-surface)), 0 0 0 6px rgb(var(--c-focus));
}
</style>
