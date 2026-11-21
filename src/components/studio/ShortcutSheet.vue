<!--
  ShortcutSheet: the "?" keyboard shortcut list, in a UiModal.
  Props: modelValue (Boolean, v-model), groups: Array<{ title, items: Array<[keys: String[], what: String]> }>
-->
<script setup>
import { UiModal, UiButton } from '../ui/index.js'

defineProps({
  modelValue: { type: Boolean, default: false },
  groups: { type: Array, required: true },
})
defineEmits(['update:modelValue'])
</script>

<template>
  <UiModal :model-value="modelValue" title="Keyboard shortcuts" size="md" @update:model-value="$emit('update:modelValue', $event)">
    <div class="grid gap-6 sm:grid-cols-2">
      <section v-for="g in groups" :key="g.title">
        <h3 class="text-sm font-bold text-ink mb-2">{{ g.title }}</h3>
        <dl class="space-y-2">
          <div v-for="([keys, what], i) in g.items" :key="i" class="flex items-center justify-between gap-3 text-sm">
            <dt class="text-ink-muted">{{ what }}</dt>
            <dd class="flex items-center gap-1 shrink-0">
              <template v-for="(k, j) in keys" :key="j"><kbd class="kbd">{{ k }}</kbd></template>
            </dd>
          </div>
        </dl>
      </section>
    </div>
    <template #footer>
      <UiButton variant="secondary" data-autofocus @click="$emit('update:modelValue', false)">Close</UiButton>
    </template>
  </UiModal>
</template>
