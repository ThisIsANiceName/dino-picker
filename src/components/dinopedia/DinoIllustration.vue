<!--
  DinoIllustration: full-body dino art for a dino object, filling its container width (1:1).
  Order: a custom image (dino.image, set in the Dinopedia) > studio DinoArt > bundled SVG.

  Props: dino (Object), decorative (Boolean: alt="" / aria-hidden), useImage (Boolean, default true)
-->
<script setup>
import { computed, ref, watch } from 'vue'
import { DinoArtComponent } from '../layout/contracts.js'
import { dinoName } from './dinoUtils.js'

const rawFiles = import.meta.glob('../../assets/art/dinos/*.svg', { query: '?raw', import: 'default', eager: true })
// Drop any <metadata> block a file tool appended (it can make the SVG invalid XML).
const raw = Object.fromEntries(Object.entries(rawFiles).map(([k, v]) => [k, String(v).replace(/<metadata[\s\S]*?<\/metadata>/g, '')]))

const props = defineProps({
  dino: { type: Object, required: true },
  decorative: { type: Boolean, default: false },
  useImage: { type: Boolean, default: true },
})

const imgFailed = ref(false)
watch(() => props.dino?.image, () => { imgFailed.value = false })

const title = computed(() => (props.decorative ? '' : `Illustration of a ${dinoName(props.dino)}`))
const bodyType = computed(() => props.dino?.bodyType || 'raptor')
const palette = computed(() => props.dino?.palette ?? { body: '#56A44C', belly: '#FFEBC2', accent: '#D2335F' })
const showImage = computed(() => props.useImage && !!props.dino?.image && !imgFailed.value)

const fallbackSvg = computed(() => raw[`../../assets/art/dinos/${bodyType.value}.svg`] ?? raw['../../assets/art/dinos/raptor.svg'] ?? '')
function mix(a, b, t) {
  const p = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16))
  try {
    const [x, y] = [p(a), p(b)]
    return `#${x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('')}`
  } catch { return a }
}
const cssVars = computed(() => ({
  '--dino-body': palette.value.body,
  '--dino-belly': palette.value.belly,
  '--dino-accent': palette.value.accent,
  '--dino-shade': mix(palette.value.body, '#0b2b28', 0.3),
}))
</script>

<template>
  <div class="dino-illus relative aspect-square" :aria-hidden="decorative ? 'true' : undefined">
    <img
      v-if="showImage"
      :src="dino.image"
      :alt="decorative ? '' : `Picture of a ${dinoName(dino)}`"
      class="absolute inset-0 w-full h-full object-cover"
      loading="lazy"
      referrerpolicy="no-referrer"
      @error="imgFailed = true"
    />
    <component :is="DinoArtComponent" v-else-if="DinoArtComponent" :body-type="bodyType" :palette="palette" :title="title" />
    <div v-else class="w-full h-full" :style="cssVars" :role="decorative ? undefined : 'img'" :aria-label="title || undefined" v-html="fallbackSvg" />
  </div>
</template>

<style scoped>
.dino-illus :deep(svg) { display: block; width: 100%; height: 100%; }
</style>
