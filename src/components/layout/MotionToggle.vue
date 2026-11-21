<!-- MotionToggle: in-app "Reduce motion" switch (persists via motion.js). -->
<script setup>
import { ref, onMounted } from 'vue'
import { setMotionPreference } from '../ui/index.js'

const reduced = ref(false)
onMounted(() => { reduced.value = document.documentElement.dataset.motion === 'reduce' })
function toggle() {
  reduced.value = !reduced.value
  setMotionPreference(reduced.value ? 'reduce' : null)
}
</script>

<template>
  <button
    type="button"
    role="switch"
    :aria-checked="String(reduced)"
    class="inline-flex items-center gap-2.5 min-h-[44px] text-sm font-semibold text-ink-muted hover:text-ink rounded-full"
    @click="toggle"
  >
    <span :class="['relative w-10 h-6 rounded-full border-[1.5px] border-ink transition-colors duration-fast', reduced ? 'bg-ink' : 'bg-surface-raised']" aria-hidden="true">
      <span :class="['absolute top-0.5 w-4 h-4 rounded-full transition-[left,background-color] duration-base ease-spring', reduced ? 'left-[18px] bg-primary' : 'left-0.5 bg-ink']" />
    </span>
    Reduce motion
  </button>
</template>
