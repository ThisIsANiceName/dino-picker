<!--
  UiSelect: styled native <select> (native = best mobile + a11y behaviour).
  Inside UiField it picks up id/aria.

  Props
    modelValue   String|Number (v-model)
    options      Array<{ value, label, disabled? } | String>  (or use default slot with <option>s)
    placeholder  String  disabled first option shown while empty
    size         'sm' | 'md'

  Emits: update:modelValue
-->
<script setup>
import { inject, computed } from 'vue'
import UiIcon from './UiIcon.vue'

defineOptions({ inheritAttrs: false })
const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  options: { type: Array, default: () => [] },
  placeholder: { type: String, default: '' },
  size: { type: String, default: 'md' },
})
const emit = defineEmits(['update:modelValue'])
const field = inject('uiField', null)
const opts = computed(() => props.options.map((o) => (typeof o === 'object' ? o : { value: o, label: o })))
</script>

<template>
  <div class="relative">
    <select
      :id="field?.id"
      v-bind="$attrs"
      :value="modelValue"
      :aria-describedby="field?.describedBy.value"
      :aria-invalid="field?.invalid.value ? 'true' : undefined"
      :required="field?.required.value || undefined"
      :class="['ui-control appearance-none !pr-10 cursor-pointer', size === 'sm' ? '!py-1.5 !text-sm' : '']"
      @change="emit('update:modelValue', $event.target.value)"
    >
      <option v-if="placeholder" value="" disabled>{{ placeholder }}</option>
      <slot>
        <option v-for="o in opts" :key="o.value" :value="o.value" :disabled="o.disabled">{{ o.label }}</option>
      </slot>
    </select>
    <UiIcon name="chevron-down" :size="18" class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-ink-muted" />
  </div>
</template>
