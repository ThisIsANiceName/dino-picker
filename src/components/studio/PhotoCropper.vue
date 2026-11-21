<!--
  PhotoCropper: square crop of a picked image with drag + zoom, then a client-side re-encode
  (canvas, max 1024 px, WebP with JPEG fallback). Re-encoding drops EXIF/GPS metadata.

  Props
    modelValue  Boolean  dialog open (v-model)
    file        File     the picked image (already validated by the caller)
    busy        Boolean  show the confirm button as loading (while uploading)
  Emits
    update:modelValue, confirm(Blob), error(message)
-->
<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { UiButton, UiModal, UiSlider } from '../ui/index.js'
import { canvasToBlob } from '../../lib/art/index.js'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  file: { type: Object, default: null },
  busy: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue', 'confirm', 'error'])

const V = 288 // viewport edge in CSS px
const MAX_OUT = 1024
const url = ref('')
const natural = ref({ w: 0, h: 0 })
const zoom = ref(100) // percent, 100..400
const off = ref({ x: 0, y: 0 }) // image top-left relative to the viewport
const imgEl = ref(null)
const encoding = ref(false)
let drag = null

const scale = computed(() => {
  const { w, h } = natural.value
  return w && h ? (V / Math.min(w, h)) * (zoom.value / 100) : 1
})
const shown = computed(() => ({ w: natural.value.w * scale.value, h: natural.value.h * scale.value }))

function clamp() {
  off.value = {
    x: Math.min(0, Math.max(V - shown.value.w, off.value.x)),
    y: Math.min(0, Math.max(V - shown.value.h, off.value.y)),
  }
}

function release() {
  if (url.value) URL.revokeObjectURL(url.value)
  url.value = ''
}

watch(
  () => [props.modelValue, props.file],
  ([open, file]) => {
    release()
    if (!open || !file) return
    natural.value = { w: 0, h: 0 }
    zoom.value = 100
    url.value = URL.createObjectURL(file)
  },
  { immediate: true },
)
onBeforeUnmount(release)

function onLoad() {
  const el = imgEl.value
  if (!el?.naturalWidth) return
  natural.value = { w: el.naturalWidth, h: el.naturalHeight }
  off.value = { x: (V - shown.value.w) / 2, y: (V - shown.value.h) / 2 }
  clamp()
}
function onLoadError() {
  emit('error', "That file can't be read as a picture. Use a JPG, PNG or WebP under 8 MB.")
  emit('update:modelValue', false)
}

function setZoom(next) {
  const prev = scale.value
  // Zoom around the viewport centre.
  const cx = (V / 2 - off.value.x) / prev
  const cy = (V / 2 - off.value.y) / prev
  zoom.value = Math.min(400, Math.max(100, next))
  off.value = { x: V / 2 - cx * scale.value, y: V / 2 - cy * scale.value }
  clamp()
}

function onPointerDown(e) {
  drag = { x: e.clientX, y: e.clientY, ox: off.value.x, oy: off.value.y }
  e.currentTarget.setPointerCapture?.(e.pointerId)
}
function onPointerMove(e) {
  if (!drag) return
  off.value = { x: drag.ox + e.clientX - drag.x, y: drag.oy + e.clientY - drag.y }
  clamp()
}
function onPointerUp() { drag = null }
function onWheel(e) { setZoom(zoom.value - Math.sign(e.deltaY) * 10) }
function onKey(e) {
  const step = e.shiftKey ? 24 : 8
  const d = { ArrowLeft: [step, 0], ArrowRight: [-step, 0], ArrowUp: [0, step], ArrowDown: [0, -step] }[e.key]
  if (d) {
    e.preventDefault()
    off.value = { x: off.value.x + d[0], y: off.value.y + d[1] }
    clamp()
  } else if (e.key === '+' || e.key === '=') { e.preventDefault(); setZoom(zoom.value + 10) }
  else if (e.key === '-') { e.preventDefault(); setZoom(zoom.value - 10) }
}

async function confirm() {
  if (!natural.value.w || encoding.value) return
  encoding.value = true
  try {
    const s = scale.value
    const src = V / s // source square edge in image pixels
    const out = Math.max(64, Math.min(MAX_OUT, Math.round(src)))
    const canvas = document.createElement('canvas')
    canvas.width = out
    canvas.height = out
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#FFFFFF' // transparent PNGs get a white ground (JPEG fallback has no alpha)
    ctx.fillRect(0, 0, out, out)
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(imgEl.value, -off.value.x / s, -off.value.y / s, src, src, 0, 0, out, out)
    let blob = await canvasToBlob(canvas, 'image/webp', 0.9)
    if (blob.type !== 'image/webp') blob = await canvasToBlob(canvas, 'image/jpeg', 0.9)
    emit('confirm', blob)
  } catch {
    emit('error', "That picture couldn't be prepared. Try another one.")
  } finally {
    encoding.value = false
  }
}
</script>

<template>
  <UiModal
    :model-value="modelValue"
    title="Crop your photo"
    description="Drag to move, zoom to fit. Faces read best inside the circle."
    size="sm"
    :dismissible="!busy"
    @update:model-value="emit('update:modelValue', $event)"
  >
    <div class="flex flex-col items-center gap-4">
      <div
        class="cropper"
        :style="{ width: `${V}px`, height: `${V}px` }"
        tabindex="0"
        role="application"
        aria-label="Photo crop area. Use arrow keys to move, plus and minus to zoom."
        @pointerdown="onPointerDown"
        @pointermove="onPointerMove"
        @pointerup="onPointerUp"
        @pointercancel="onPointerUp"
        @wheel.prevent="onWheel"
        @keydown="onKey"
      >
        <img
          v-if="url"
          ref="imgEl"
          :src="url"
          alt=""
          draggable="false"
          :style="{ width: `${shown.w}px`, height: `${shown.h}px`, transform: `translate(${off.x}px, ${off.y}px)` }"
          @load="onLoad"
          @error="onLoadError"
        />
        <span class="cropper__ring" aria-hidden="true" />
      </div>
      <div class="w-full max-w-[288px]">
        <UiSlider
          :model-value="zoom"
          label="Zoom"
          :min="100"
          :max="400"
          :step="5"
          :format="(v) => `${v} percent`"
          @update:model-value="setZoom"
        />
      </div>
      <p class="text-xs text-ink-subtle text-center max-w-[36ch]">
        The photo is resized on this device before it is uploaded. Location and camera data are removed.
      </p>
    </div>
    <template #footer>
      <UiButton variant="ghost" :disabled="busy" @click="emit('update:modelValue', false)">Cancel</UiButton>
      <UiButton icon="check" :loading="busy || encoding" data-autofocus @click="confirm">Use this photo</UiButton>
    </template>
  </UiModal>
</template>

<style scoped>
.cropper {
  position: relative;
  overflow: hidden;
  border-radius: 18px;
  border: 1.5px solid rgb(var(--c-ink));
  background: rgb(var(--c-surface-sunken));
  cursor: grab;
  touch-action: none;
  user-select: none;
}
.cropper:active { cursor: grabbing; }
.cropper img { position: absolute; top: 0; left: 0; max-width: none; transform-origin: 0 0; }
.cropper__ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  box-shadow: 0 0 0 999px rgb(11 43 40 / 0.45);
  outline: 2px dashed rgb(255 255 255 / 0.85);
  outline-offset: -2px;
  pointer-events: none;
}
</style>
