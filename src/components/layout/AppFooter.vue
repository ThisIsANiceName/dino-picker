<!-- AppFooter: desktop-only quiet footer with the motion toggle. -->
<script setup>
import { useTeamStore } from '../../stores/teamStore.js'
import MotionToggle from './MotionToggle.vue'

const team = useTeamStore()
</script>

<template>
  <footer class="hidden md:block border-t border-line mt-16" data-print-hide>
    <div class="mx-auto max-w-[1240px] px-6 py-6 flex items-center gap-6 text-sm text-ink-subtle">
      <p><span class="font-display text-ink-muted">{{ team.name }}</span> · {{ team.year }} · Dino Selector</p>
      <RouterLink to="/design-system" class="link text-ink-subtle hover:text-ink">Design system</RouterLink>
      <div class="ml-auto"><MotionToggle /></div>
    </div>
  </footer>
</template>
