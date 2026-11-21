<!--
  PersonAvatar: a teammate's avatar, filling its container (square).
  Uses the studio's DinoAvatar when available; otherwise a local fallback
  (dino illustration on its palette, or the egg when there is no dino yet).

  Props: person (Object), dino (Object|null), size (Number, render px hint), alt (String)
-->
<script setup>
import { computed } from 'vue'
import { DinoAvatarComponent } from '../layout/contracts.js'
import { SPOTS } from '../layout/spots.js'
import DinoIllustration from '../dinopedia/DinoIllustration.vue'
import { dinoName, possessive } from '../dinopedia/dinoUtils.js'

const props = defineProps({
  person: { type: Object, required: true },
  dino: { type: Object, default: null },
  size: { type: Number, default: 240 },
  alt: { type: String, default: '' },
  shape: { type: String, default: 'square' },
})

const altText = computed(() => {
  if (props.alt) return props.alt
  const who = possessive(props.person.name)
  return props.dino ? `${who} avatar: a ${dinoName(props.dino)}` : `${who} avatar: an egg, no dino yet`
})
</script>

<template>
  <div class="person-avatar relative w-full aspect-square overflow-hidden">
    <component
      :is="DinoAvatarComponent"
      v-if="DinoAvatarComponent"
      :person="person"
      :dino="dino"
      :size="size"
      :alt="altText"
      :shape="shape"
    />
    <div v-else-if="dino" role="img" :aria-label="altText" class="w-full h-full" :style="{ background: dino.palette?.belly ?? '#FFEBC2' }">
      <DinoIllustration :dino="dino" decorative class="w-full h-full scale-110 translate-y-[4%]" />
    </div>
    <div v-else role="img" :aria-label="altText" class="w-full h-full bg-surface-sunken grid place-items-center">
      <img :src="SPOTS.eggWhole" alt="" class="w-1/2 h-auto" />
    </div>
  </div>
</template>

<style scoped>
.person-avatar :deep(svg),
.person-avatar :deep(img:not(.w-1\/2)) { display: block; width: 100%; height: 100%; }
.person-avatar > :deep(*) { width: 100% !important; height: 100% !important; }
</style>
