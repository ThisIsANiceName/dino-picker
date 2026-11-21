<!--
  UiSkeleton: loading placeholder with a slow shimmer (static under reduced motion).
  Wrap groups in an element with aria-busy="true"; skeletons themselves are aria-hidden.

  Props
    shape   'text' (default) | 'rect' | 'circle' | 'card'
    width   String  CSS width (default 100%; circle uses height)
    height  String  CSS height (text = 1em, rect = 120px, circle = 48px, card = 260px)
    lines   Number  for 'text': number of lines (last one is 60% wide)
-->
<script setup>
import { computed } from 'vue'

const props = defineProps({
  shape: { type: String, default: 'text' },
  width: { type: String, default: '' },
  height: { type: String, default: '' },
  lines: { type: Number, default: 1 },
})
const H = { text: '0.9em', rect: '120px', circle: '48px', card: '260px' }
const R = { text: 'rounded-full', rect: 'rounded-md', circle: 'rounded-full', card: 'rounded-lg' }
const h = computed(() => props.height || H[props.shape] || H.text)
</script>

<template>
  <div v-if="shape === 'text' && lines > 1" class="space-y-2" aria-hidden="true">
    <div
      v-for="i in lines"
      :key="i"
      :class="['ui-skel', R.text]"
      :style="{ height: h, width: i === lines ? '60%' : width || '100%' }"
    />
  </div>
  <div
    v-else
    aria-hidden="true"
    :class="['ui-skel', R[shape] ?? R.text]"
    :style="{ height: h, width: shape === 'circle' ? h : width || '100%' }"
  />
</template>

<style scoped>
.ui-skel {
  background: linear-gradient(
    100deg,
    rgb(var(--c-ink) / 0.07) 30%,
    rgb(var(--c-ink) / 0.13) 50%,
    rgb(var(--c-ink) / 0.07) 70%
  );
  background-size: 200% 100%;
  animation: shimmer 1.6s linear infinite;
}
@keyframes shimmer { from { background-position: 200% 0; } to { background-position: -200% 0; } }
</style>
