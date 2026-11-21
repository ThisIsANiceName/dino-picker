<!--
  DinoAvatar: a person's composed avatar (dino with gear, scene and frame, or their photo
  inside the same scene/frame) at a fixed pixel size.

  Props
    person  Object  optional; person.avatar (AvatarConfig) and person.photoUrl are used
    dino    Object  optional; the person's dino (bodyType + palette seed the default avatar)
    config  Object  optional AvatarConfig; overrides person.avatar (studio previews)
    size    Number  px, default 96
    alt     String  accessible name; decorative (aria-hidden) when empty
    shape   'auto' (default: rounded square, or the frame's own shape) | 'square' | 'circle'

  Cheap enough for 50 on a page: composed SVGs are memoised by config JSON and shown as <img>.
  Photo avatars render inline SVG so the browser can load the uploaded picture.
-->
<script setup>
import { computed } from 'vue'
import { ART, composeAvatarSvg, resolveAvatarConfig, normalizeAvatarConfig, svgDataUri } from '../../lib/art/index.js'

const props = defineProps({
  person: { type: Object, default: null },
  dino: { type: Object, default: null },
  config: { type: Object, default: null },
  size: { type: Number, default: 96 },
  alt: { type: String, default: '' },
  shape: { type: String, default: 'auto' },
})

const resolved = computed(() =>
  props.config
    ? normalizeAvatarConfig(props.config, props.dino)
    : resolveAvatarConfig(props.person, props.dino),
)

const svg = computed(() => composeAvatarSvg(resolved.value, { size: 512 }))
const isPhoto = computed(() => resolved.value.display === 'photo' && !!resolved.value.photo)

const uriCache = new Map()
const src = computed(() => {
  if (isPhoto.value) return ''
  const s = svg.value
  let uri = uriCache.get(s)
  if (!uri) {
    uri = svgDataUri(s)
    if (uriCache.size > 400) uriCache.clear()
    uriCache.set(s, uri)
  }
  return uri
})

// Frames carry their own silhouette; without one we round the corners (or go circular).
const radius = computed(() => {
  if (props.shape === 'circle') return '50%'
  const frame = resolved.value.frame && ART.frameById[resolved.value.frame.id]
  if (frame) return '0'
  if (props.shape === 'square') return '0'
  return `${Math.round(Math.min(26, props.size * 0.2))}px`
})

const style = computed(() => ({
  width: `${props.size}px`,
  height: `${props.size}px`,
  borderRadius: radius.value,
}))
</script>

<script>
export default { name: 'DinoAvatar' }
</script>

<template>
  <span
    v-if="isPhoto"
    class="dino-avatar"
    :style="style"
    :role="alt ? 'img' : undefined"
    :aria-label="alt || undefined"
    :aria-hidden="alt ? undefined : 'true'"
    v-html="svg"
  />
  <img
    v-else
    class="dino-avatar"
    :style="style"
    :src="src"
    :alt="alt"
    :aria-hidden="alt ? undefined : 'true'"
    :width="size"
    :height="size"
    draggable="false"
    decoding="async"
  />
</template>

<style scoped>
.dino-avatar {
  display: inline-block;
  flex: none;
  overflow: hidden;
  vertical-align: middle;
  user-select: none;
}
.dino-avatar :deep(svg) {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
