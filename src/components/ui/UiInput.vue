<!--
  UiInput: text input. Inside UiField it picks up id/aria automatically.

  Props
    modelValue  String|Number  (v-model)
    type        String  default 'text' ('search' shows a search icon)
    icon        String  leading UiIcon name
    size        'sm' | 'md'  default 'md'
    clearable   Boolean shows an x button when non-empty
    ...any native attribute (placeholder, maxlength, autocomplete, inputmode) passes through

  Emits: update:modelValue, clear
  Exposes: focus()
-->
<script setup>
import { inject, ref, computed } from 'vue'
import UiIcon from './UiIcon.vue'

defineOptions({ inheritAttrs: false })
const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  type: { type: String, default: 'text' },
  icon: { type: String, default: '' },
  size: { type: String, default: 'md' },
  clearable: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue', 'clear'])
const field = inject('uiField', null)
const el = ref(null)
const leading = computed(() => props.icon || (props.type === 'search' ? 'search' : ''))

defineExpose({ focus: () => el.value?.focus() })
</script>

<template>
  <div class="relative">
    <UiIcon
      v-if="leading"
      :name="leading"
      :size="18"
      class="absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle pointer-events-none"
    />
    <input
      :id="field?.id"
      ref="el"
      v-bind="$attrs"
      :type="type"
      :value="modelValue"
      :aria-describedby="field?.describedBy.value"
      :aria-invalid="field?.invalid.value ? 'true' : undefined"
      :required="field?.required.value || undefined"
      :class="[
        'ui-control',
        size === 'sm' ? '!py-1.5 !text-sm' : '',
        leading ? '!pl-10' : '',
        clearable && modelValue ? '!pr-10' : '',
      ]"
      @input="emit('update:modelValue', $event.target.value)"
    />
    <button
      v-if="clearable && modelValue"
      type="button"
      class="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 inline-flex items-center justify-center rounded-full text-ink-muted hover:bg-ink/10"
      aria-label="Clear"
      @click="emit('update:modelValue', ''); emit('clear'); el?.focus()"
    >
      <UiIcon name="x" :size="16" />
    </button>
  </div>
</template>
