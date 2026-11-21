<!-- DinoTile: Dinopedia card. Art on its palette, name, period + diet badges. -->
<script setup>
import { UiBadge } from '../ui/index.js'
import DinoIllustration from './DinoIllustration.vue'
import { dinoLink, dinoName } from './dinoUtils.js'

defineProps({
  dino: { type: Object, required: true },
  owners: { type: Array, default: () => [] },
})
</script>

<template>
  <RouterLink :to="dinoLink(dino)" class="dino-tile group block h-full rounded-lg border-[1.5px] border-ink bg-surface shadow-sticker overflow-hidden">
    <div class="relative border-b-[1.5px] border-ink overflow-hidden" :style="{ background: dino.palette?.belly ?? '#FFEBC2' }">
      <DinoIllustration :dino="dino" decorative class="dino-tile__art w-full" />
      <span v-if="owners.length" class="absolute right-2 top-2 inline-flex items-center gap-1 h-6 px-2 rounded-full bg-ink text-ink-inverse text-2xs font-semibold">
        {{ owners.length === 1 ? owners[0] : `${owners.length} teammates` }}
      </span>
      <span v-if="dino.source === 'custom'" class="absolute left-2 top-2 inline-flex h-6 px-2 items-center rounded-full bg-surface-raised border border-ink text-2xs font-semibold">Custom</span>
    </div>
    <div class="px-3 pt-2.5 pb-3">
      <h3 class="font-display text-lg leading-tight truncate">{{ dinoName(dino) }}</h3>
      <div class="mt-2 flex flex-wrap gap-1.5">
        <UiBadge v-if="dino.period" variant="period" :value="dino.period" size="sm" />
        <UiBadge v-if="dino.diet" variant="diet" :value="dino.diet" size="sm" />
      </div>
    </div>
  </RouterLink>
</template>

<style scoped>
.dino-tile { transition: transform var(--dur-base) var(--ease-spring), box-shadow var(--dur-base) var(--ease-out); }
.dino-tile:hover { transform: translate(-2px, -3px); box-shadow: 5px 7px 0 0 rgb(var(--c-shadow)); }
.dino-tile:active { transform: translate(1px, 2px); box-shadow: 1px 1px 0 0 rgb(var(--c-shadow)); }
.dino-tile__art { transition: transform var(--dur-slow) var(--ease-spring); }
.dino-tile:hover .dino-tile__art { transform: scale(1.05) rotate(-2deg); }
</style>
