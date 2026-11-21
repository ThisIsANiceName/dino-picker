<!--
  UiField: label + help + error wrapper. Wires id / aria-describedby /
  aria-invalid / required into a nested UiInput, UiTextarea or UiSelect via
  provide/inject, so you never hand-write ids.

  Props
    label     String  required visible label
    help      String  helper line under the control
    error     String  error message (replaces help, sets aria-invalid, announced politely)
    required  Boolean adds required semantics (no asterisk; optional fields say "optional")
    optional  Boolean appends "optional" to the label
    count     Number  current length, shows "count / max" when max is set
    max       Number
    id        String  override generated control id

  Slot: default ({ id, describedBy, invalid }) the control
-->
<script>
// Module scope: <script setup> would re-run `let uid` per instance and hand every field the same id.
let uid = 0
</script>

<script setup>
import { computed, provide } from 'vue'

const props = defineProps({
  label: { type: String, required: true },
  help: { type: String, default: '' },
  error: { type: String, default: '' },
  required: { type: Boolean, default: false },
  optional: { type: Boolean, default: false },
  count: { type: Number, default: null },
  max: { type: Number, default: null },
  id: { type: String, default: '' },
})

const controlId = props.id || `ui-field-${++uid}`
const describedBy = computed(() => {
  const ids = []
  if (props.error) ids.push(`${controlId}-error`)
  else if (props.help) ids.push(`${controlId}-help`)
  if (props.max) ids.push(`${controlId}-count`)
  return ids.join(' ') || undefined
})
const invalid = computed(() => !!props.error)

provide('uiField', {
  id: controlId,
  describedBy,
  invalid,
  required: computed(() => props.required),
})
</script>

<template>
  <div class="ui-field">
    <div class="flex items-baseline justify-between gap-3 mb-1.5">
      <label :for="controlId" class="text-sm font-semibold text-ink">
        {{ label }}
        <span v-if="optional" class="font-normal text-ink-subtle">optional</span>
      </label>
      <span
        v-if="max"
        :id="`${controlId}-count`"
        :class="['text-xs tabular', count > max ? 'text-danger font-semibold' : 'text-ink-subtle']"
      >{{ count ?? 0 }} / {{ max }}</span>
    </div>
    <slot :id="controlId" :described-by="describedBy" :invalid="invalid" />
    <p v-if="error" :id="`${controlId}-error`" class="mt-1.5 text-sm font-medium text-danger" aria-live="polite">
      {{ error }}
    </p>
    <p v-else-if="help" :id="`${controlId}-help`" class="mt-1.5 text-sm text-ink-subtle">{{ help }}</p>
  </div>
</template>
