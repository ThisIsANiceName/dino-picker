<!--
  UiTextarea: multi-line input with optional auto-grow. Inside UiField it picks up id/aria.

  Props
    modelValue  String (v-model)
    rows        Number  initial rows, default 3
    autogrow    Boolean grow with content up to maxRows (default true)
    maxRows     Number  default 10
    ...native attributes pass through (placeholder, maxlength)

  Emits: update:modelValue
-->
<script setup>
import { inject, ref, watch, nextTick, onMounted } from 'vue'

defineOptions({ inheritAttrs: false })
const props = defineProps({
  modelValue: { type: String, default: '' },
  rows: { type: Number, default: 3 },
  autogrow: { type: Boolean, default: true },
  maxRows: { type: Number, default: 10 },
})
const emit = defineEmits(['update:modelValue'])
const field = inject('uiField', null)
const el = ref(null)

function resize() {
  if (!props.autogrow || !el.value) return
  const ta = el.value
  ta.style.height = 'auto'
  const lh = parseFloat(getComputedStyle(ta).lineHeight) || 22
  const max = lh * props.maxRows + 24
  ta.style.height = `${Math.min(ta.scrollHeight + 3, max)}px`
}
watch(() => props.modelValue, () => nextTick(resize))
onMounted(resize)
</script>

<template>
  <textarea
    :id="field?.id"
    ref="el"
    v-bind="$attrs"
    :rows="rows"
    :value="modelValue"
    :aria-describedby="field?.describedBy.value"
    :aria-invalid="field?.invalid.value ? 'true' : undefined"
    :required="field?.required.value || undefined"
    class="ui-control resize-y min-h-[5.5rem] leading-relaxed"
    @input="emit('update:modelValue', $event.target.value)"
  />
</template>
