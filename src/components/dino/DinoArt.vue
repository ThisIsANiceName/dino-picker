<!--
  DinoArt: the full-body illustration of a body type, recoloured with a palette.
  Fills its container's width at 1:1.

  Props
    bodyType  String  required (one of the 12 manifest body types; unknown falls back)
    palette   Object  { body, belly, accent, shade? } hex colours (dino.palette works as is)
    title     String  optional accessible name; decorative (aria-hidden) when absent
-->
<script setup>
import { computed } from 'vue'
import { dinoSvg, svgDataUri } from '../../lib/art/index.js'

const props = defineProps({
  bodyType: { type: String, required: true },
  palette: { type: Object, default: null },
  title: { type: String, default: '' },
})

const uriCache = new Map()
const src = computed(() => {
  const svg = dinoSvg(props.bodyType, props.palette ?? undefined)
  let uri = uriCache.get(svg)
  if (!uri) {
    uri = svgDataUri(svg)
    if (uriCache.size > 300) uriCache.clear()
    uriCache.set(svg, uri)
  }
  return uri
})
</script>

<script>
export default { name: 'DinoArt' }
</script>

<template>
  <img
    :src="src"
    :alt="title"
    :aria-hidden="title ? undefined : 'true'"
    width="512"
    height="512"
    draggable="false"
    decoding="async"
    class="dino-art"
  />
</template>

<style scoped>
.dino-art {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 1 / 1;
  user-select: none;
}
</style>
