<!-- PrintToolbar: slim bar for print views (hidden when printing). -->
<script setup>
import { UiButton, UiIcon } from '../ui/index.js'
defineProps({ title: { type: String, required: true }, hint: { type: String, default: '' } })
function print() { window.print() }
</script>

<template>
  <div class="theme-jungle sticky top-0 z-nav bg-bg/95 backdrop-blur border-b-[1.5px] border-jungle-950" data-print-hide>
    <div class="mx-auto max-w-[1400px] h-14 px-3 sm:px-6 flex items-center gap-3">
      <RouterLink to="/insights" class="inline-flex items-center gap-1.5 h-10 px-2 rounded-full font-semibold text-ink-muted hover:text-ink">
        <UiIcon name="arrow-left" :size="18" /> <span>Back</span>
      </RouterLink>
      <div class="min-w-0 flex-1">
        <h1 tabindex="-1" class="font-display text-lg leading-tight truncate">{{ title }}</h1>
        <p v-if="hint" class="hidden sm:block text-xs text-ink-subtle truncate">{{ hint }}</p>
      </div>
      <slot />
      <UiButton size="sm" icon="print" @click="print">Print</UiButton>
    </div>
  </div>
</template>
