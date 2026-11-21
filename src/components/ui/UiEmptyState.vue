<!--
  UiEmptyState: centred illustration + title + text + action. Use the kit spot
  illustrations (empty-roster, empty-search, quiz-hero, error-meteor).

  Props
    title    String  required. Says what is missing ("No teammates yet")
    text     String  one sentence on what to do next
    image    String  optional image URL (rendered decoratively); or use #image slot
    tone     'default' | 'error'   error tints the title and uses role="alert"
    compact  Boolean smaller paddings/illustration for inline panels (search results)

  Slots: image, default (extra content), action (buttons)
-->
<script setup>
defineProps({
  title: { type: String, required: true },
  text: { type: String, default: '' },
  image: { type: String, default: '' },
  tone: { type: String, default: 'default' },
  compact: { type: Boolean, default: false },
})
</script>

<template>
  <div
    :role="tone === 'error' ? 'alert' : undefined"
    :class="['flex flex-col items-center text-center mx-auto max-w-md', compact ? 'py-8 gap-3' : 'py-16 gap-4']"
  >
    <div v-if="image || $slots.image" :class="['ui-empty__art', compact ? 'w-28' : 'w-44']">
      <slot name="image"><img :src="image" alt="" class="w-full h-auto" /></slot>
    </div>
    <h2 :class="['font-display', compact ? 'text-display-xs' : 'text-display-sm', tone === 'error' ? 'text-danger' : 'text-ink']">
      {{ title }}
    </h2>
    <p v-if="text" class="text-ink-muted max-w-[34ch]">{{ text }}</p>
    <slot />
    <div v-if="$slots.action" class="mt-2 flex flex-wrap justify-center gap-3"><slot name="action" /></div>
  </div>
</template>

<style scoped>
.ui-empty__art { animation: bob 3.2s var(--ease-in-out) infinite; }
@keyframes bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
</style>
