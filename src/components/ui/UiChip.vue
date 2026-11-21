<!--
  UiChip: interactive pill for filters and multi-select (Dinopedia filters, quiz tags).

  Props
    modelValue  Boolean  selected state (v-model). Rendered as aria-pressed toggle.
    removable   Boolean  shows an x button that emits 'remove' (chip is then not a toggle)
    icon        String   leading UiIcon name
    tone        '' | 'herbivore' | 'carnivore' | 'omnivore' | 'piscivore' | 'insectivore'
                | 'triassic' | 'jurassic' | 'cretaceous'  adds a colour dot (label stays the meaning)
    count       Number|null  trailing count (e.g. results per filter)
    disabled    Boolean

  Emits: update:modelValue (Boolean), remove
-->
<script setup>
import UiIcon from './UiIcon.vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  removable: { type: Boolean, default: false },
  icon: { type: String, default: '' },
  tone: { type: String, default: '' },
  count: { type: Number, default: null },
  disabled: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue', 'remove'])

const DOT = {
  herbivore: 'bg-diet-herbivore', carnivore: 'bg-diet-carnivore', omnivore: 'bg-diet-omnivore',
  piscivore: 'bg-diet-piscivore', insectivore: 'bg-diet-insectivore',
  triassic: 'bg-period-triassic', jurassic: 'bg-period-jurassic', cretaceous: 'bg-period-cretaceous',
}
</script>

<template>
  <span
    v-if="removable"
    class="inline-flex items-center gap-1.5 h-8 pl-3 pr-1 rounded-full border-[1.5px] border-ink bg-ink text-ink-inverse text-sm font-semibold"
  >
    <span v-if="tone" :class="['w-2 h-2 rounded-full ring-1 ring-white/70', DOT[tone]]" aria-hidden="true" />
    <slot />
    <button
      type="button"
      class="w-6 h-6 inline-flex items-center justify-center rounded-full hover:bg-white/20"
      :aria-label="`Remove filter`"
      @click="emit('remove')"
    >
      <UiIcon name="x" :size="14" :stroke="2.5" />
    </button>
  </span>
  <button
    v-else
    type="button"
    :aria-pressed="String(modelValue)"
    :disabled="disabled"
    :class="[
      'ui-chip inline-flex items-center gap-1.5 h-8 px-3 rounded-full border-[1.5px] text-sm font-semibold',
      'transition-[background-color,border-color,transform] duration-fast ease-out disabled:opacity-40',
      modelValue
        ? 'bg-ink text-ink-inverse border-ink'
        : 'bg-surface-raised text-ink border-line-strong hover:border-ink',
    ]"
    @click="emit('update:modelValue', !modelValue)"
  >
    <UiIcon v-if="modelValue" name="check" :size="14" :stroke="2.75" />
    <UiIcon v-else-if="icon" :name="icon" :size="15" />
    <span v-if="tone" :class="['w-2 h-2 rounded-full', DOT[tone]]" aria-hidden="true" />
    <slot />
    <span v-if="count !== null" :class="['tabular text-xs', modelValue ? 'opacity-80' : 'text-ink-subtle']">{{ count }}</span>
  </button>
</template>

<style scoped>
.ui-chip:not(:disabled):active { transform: scale(0.96); }
</style>
