<!-- BodyTypeGrid: sticker per body shape on the team, with a count. -->
<script setup>
import DinoIllustration from '../dinopedia/DinoIllustration.vue'
defineProps({ rows: { type: Array, required: true } })
const PALETTES = ['#FFEBC2', '#D4ECCF', '#CBE6F2', '#FAD3DE', '#DEDAF2', '#F6DCCD']
</script>

<template>
  <ul v-if="rows.length" class="grid grid-cols-3 sm:grid-cols-4 xl:grid-cols-5 gap-3">
    <li v-for="(b, i) in rows" :key="b.value" class="relative rounded-md border-[1.5px] border-ink overflow-hidden" :style="{ background: PALETTES[i % PALETTES.length] }">
      <DinoIllustration :dino="{ name: b.value, bodyType: b.value, palette: { body: '#56A44C', belly: '#FFF7E6', accent: '#F5AE36' } }" decorative :use-image="false" />
      <span class="absolute right-1.5 top-1.5 min-w-7 h-7 px-1.5 grid place-items-center rounded-full bg-ink text-ink-inverse text-sm font-bold tabular" aria-hidden="true">{{ b.count }}</span>
      <span class="block px-2 pb-1.5 -mt-2 text-xs font-semibold text-lichen-900 truncate">{{ b.label }}<span class="sr-only">: {{ b.count }}</span></span>
    </li>
  </ul>
  <p v-else class="text-ink-muted">No shapes yet.</p>
</template>
