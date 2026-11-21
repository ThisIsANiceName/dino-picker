<!-- Full-body dino illustration (wraps the studio's DinoArt). Props: dino, label. -->
<script setup>
import DinoArt from '../dino/DinoArt.vue'
import { dinoLabel } from '../../lib/quiz/index.js'

defineProps({
  dino: { type: Object, required: true },
  label: { type: String, default: '' },
})
</script>

<template>
  <DinoArt :body-type="dino.bodyType" :palette="dino.palette" :title="label || `Illustration of ${dinoLabel(dino)}`" />
</template>
