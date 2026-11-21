<!--
  ShirtStage: the garment mockup with the live print art on top, plus direct manipulation.
  The art is drawn by the shared shirt renderer (src/lib/shirt/render.js drawSide), the same
  function the exports use.

  Props
    config      ShirtConfig (reactive; this component never mutates it, it emits patches)
    side        'front' | 'back'
    env         shirt env (person, dino, team, roster, avatarConfig)
    selectedId  String|null
    zoom        'art' (print area fills the stage) | 'garment' (whole mockup)
    showSafe    Boolean  draw the safe-area guide
    handles     Boolean  show scale/rotate handles (desktop); phones use the panel sliders
    label       String   accessible summary of the picture
  Emits
    select(id|null)
    update(id, patch)   live change while dragging (no history)
    commit(label)       the gesture ended: push one undo step
    cancel()            the gesture was aborted (Esc): revert live edits
-->
<script setup>
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from 'vue'
import { prefersReducedMotion } from '../ui/index.js'
import { svgDataUri } from '../../lib/art/index.js'
import {
  MASTER, MAX_TEXT, MIN_TEXT, SAFE_MARGIN, artBox, drawSide, layerArt, layerGeometry, mockupFor, prepareShirt, textSpecs,
} from '../../lib/shirt/index.js'

const props = defineProps({
  config: { type: Object, required: true },
  side: { type: String, default: 'front' },
  env: { type: Object, required: true },
  selectedId: { type: String, default: null },
  zoom: { type: String, default: 'art' },
  showSafe: { type: Boolean, default: true },
  handles: { type: Boolean, default: true },
  label: { type: String, default: 'Shirt preview' },
})
const emit = defineEmits(['select', 'update', 'commit', 'cancel'])

const root = ref(null)
const canvas = ref(null)
const size = ref({ w: 0, h: 0 })
let ro = null

// ── View geometry (mockup units -> stage px) ────────────────────────────────
const mock = computed(() => mockupFor(props.config, props.side))
const mockSrc = computed(() => svgDataUri(mock.value.svg))
const box = computed(() => artBox(props.config.sides[props.side].placement))

const view = computed(() => {
  const [, , vw, vh] = mock.value.viewBox
  const [px, py, pw, ph] = mock.value.printArea
  const k = pw / MASTER.w // mockup units per master px
  let win
  if (props.zoom === 'garment') win = { x: 0, y: 0, w: vw, h: vh }
  else {
    const b = box.value
    const bw = Math.max(b.w * k * 1.3, pw * 0.55)
    const bh = Math.max(b.h * k * 1.3, ph * 0.55)
    const cx = px + (b.x + b.w / 2) * k
    const cy = py + (b.y + b.h / 2) * k
    win = { x: cx - bw / 2, y: cy - bh / 2, w: bw, h: bh }
  }
  const { w: cw, h: ch } = size.value
  const s = cw && ch ? Math.min(cw / win.w, ch / win.h) : 1
  const ox = (cw - win.w * s) / 2 - win.x * s
  const oy = (ch - win.h * s) / 2 - win.y * s
  return {
    s,
    mock: { left: ox, top: oy, width: vw * s, height: vh * s },
    art: { left: ox + px * s, top: oy + py * s, width: pw * s, height: ph * s },
    pxPerMaster: (pw * s) / MASTER.w,
  }
})
const px = (v) => `${Math.round(v * 100) / 100}px`
const mockStyle = computed(() => {
  const m = view.value.mock
  return { left: px(m.left), top: px(m.top), width: px(m.width), height: px(m.height) }
})
const artStyle = computed(() => {
  const a = view.value.art
  return { left: px(a.left), top: px(a.top), width: px(a.width), height: px(a.height) }
})
/** Master px for a length given in screen px. */
const u = (screenPx) => screenPx / (view.value.pxPerMaster || 1)

// ── Drawing ─────────────────────────────────────────────────────────────────
const assets = shallowRef(new Map())
let raf = 0
let prepToken = 0

const layers = computed(() => props.config.sides[props.side].layers)
const assetSig = computed(() => {
  const arts = layers.value.filter((l) => l.kind !== 'text').map((l) => `${l.id}:${layerArt(l, props.env)?.svg.length}:${l.kind}:${l.decorId ?? ''}:${JSON.stringify(l.colors ?? '')}:${l.gear}:${l.flip}`)
  return JSON.stringify([arts, textSpecs(props.config, props.env, [props.side]), JSON.stringify(props.env.avatarConfig)])
})

function draw() {
  raf = 0
  const el = canvas.value
  if (!el) return
  const a = view.value.art
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const w = Math.max(1, Math.round(a.width * dpr))
  const h = Math.max(1, Math.round(a.height * dpr))
  if (el.width !== w || el.height !== h) {
    el.width = w
    el.height = h
  }
  drawSide(el.getContext('2d'), props.config, props.side, props.env, assets.value, { scale: w / MASTER.w })
}
function schedule() {
  if (!raf) raf = requestAnimationFrame(draw)
}
async function prepare() {
  const token = ++prepToken
  try {
    const a = await prepareShirt(props.config, props.env, [props.side])
    if (token !== prepToken) return
    assets.value = a
    geomTick.value += 1
  } catch { /* keep the previous assets */ }
  schedule()
}

const geomTick = ref(0) // bumps when fonts/assets arrive so geometry recomputes
watch(assetSig, prepare, { immediate: true })
watch([() => props.config, () => props.side, view], schedule, { deep: true })

onMounted(() => {
  ro = new ResizeObserver(([entry]) => {
    const r = entry.contentRect
    size.value = { w: r.width, h: r.height }
  })
  ro.observe(root.value)
  // Web fonts can finish after first paint: redraw once they are in.
  document.fonts?.ready.then(() => { geomTick.value += 1; schedule() })
})
onBeforeUnmount(() => {
  ro?.disconnect()
  if (raf) cancelAnimationFrame(raf)
  prepToken += 1
})

// ── Garment "flap" on colour change ─────────────────────────────────────────
const flap = ref(false)
watch(
  () => [props.config.garment.color, props.config.garment.type],
  () => {
    if (prefersReducedMotion()) return
    flap.value = false
    requestAnimationFrame(() => { flap.value = true })
  },
)

// ── Selection geometry ──────────────────────────────────────────────────────
const geometry = computed(() => {
  geomTick.value // dependency
  return layers.value.filter((l) => !l.hidden).map((l) => ({ layer: l, g: layerGeometry(l, props.config, props.side, props.env) }))
})
const selected = computed(() => geometry.value.find((x) => x.layer.id === props.selectedId) ?? null)
const hoverId = ref(null)
const hovered = computed(() => (hoverId.value && hoverId.value !== props.selectedId ? geometry.value.find((x) => x.layer.id === hoverId.value) : null))

const frameOf = (item) => {
  if (!item) return null
  const pad = u(6)
  const { cx, cy, w, h, rotate } = item.g
  return { cx, cy, rotate, x: -w / 2 - pad, y: -h / 2 - pad, w: w + pad * 2, h: h + pad * 2 }
}
const selFrame = computed(() => frameOf(selected.value))
const hoverFrame = computed(() => frameOf(hovered.value))
const corners = computed(() => {
  const f = selFrame.value
  if (!f) return []
  return [[f.x, f.y], [f.x + f.w, f.y], [f.x + f.w, f.y + f.h], [f.x, f.y + f.h]]
})

// ── Pointer interaction ─────────────────────────────────────────────────────
const overlay = ref(null)
const guides = ref({ v: false, h: false })
let gesture = null

function toMaster(e) {
  const r = overlay.value.getBoundingClientRect()
  return { x: ((e.clientX - r.left) / r.width) * MASTER.w, y: ((e.clientY - r.top) / r.height) * MASTER.h }
}
function hit(pt) {
  const list = geometry.value
  for (let i = list.length - 1; i >= 0; i--) {
    const { g } = list[i]
    const a = (-g.rotate * Math.PI) / 180
    const dx = pt.x - g.cx
    const dy = pt.y - g.cy
    const lx = dx * Math.cos(a) - dy * Math.sin(a)
    const ly = dx * Math.sin(a) + dy * Math.cos(a)
    const slack = u(8)
    if (Math.abs(lx) <= g.w / 2 + slack && Math.abs(ly) <= g.h / 2 + slack) return list[i]
  }
  return null
}

function onPointerDown(e) {
  if (e.button > 0) return
  const pt = toMaster(e)
  const mode = e.target?.dataset?.handle
  if (mode && selected.value) {
    const { layer, g } = selected.value
    gesture = {
      mode, id: layer.id, moved: false,
      cx: g.cx, cy: g.cy,
      startDist: Math.max(1, Math.hypot(pt.x - g.cx, pt.y - g.cy)),
      startAngle: Math.atan2(pt.y - g.cy, pt.x - g.cx),
      startW: layer.w, startSize: layer.size, startRotate: layer.rotate ?? 0,
    }
  } else {
    const item = hit(pt)
    emit('select', item ? item.layer.id : null)
    if (!item) return
    gesture = { mode: 'move', id: item.layer.id, moved: false, start: pt, x0: item.layer.x, y0: item.layer.y }
  }
  overlay.value.setPointerCapture?.(e.pointerId)
  e.preventDefault()
}

const SNAP = 0.012
function onPointerMove(e) {
  const pt = toMaster(e)
  if (!gesture) {
    if (e.pointerType === 'mouse') hoverId.value = hit(pt)?.layer.id ?? null
    return
  }
  const b = box.value
  if (gesture.mode === 'move') {
    const dx = pt.x - gesture.start.x
    const dy = pt.y - gesture.start.y
    if (!gesture.moved && Math.hypot(dx, dy) < u(3)) return
    gesture.moved = true
    let x = gesture.x0 + dx / b.w
    let y = gesture.y0 + dy / b.h
    const snapV = !e.altKey && Math.abs(x - 0.5) < SNAP
    const snapH = !e.altKey && Math.abs(y - 0.5) < SNAP
    if (snapV) x = 0.5
    if (snapH) y = 0.5
    guides.value = { v: snapV, h: snapH }
    emit('update', gesture.id, { x: round(clamp(x, -0.3, 1.3), 4), y: round(clamp(y, -0.3, 1.3), 4) })
  } else if (gesture.mode === 'scale') {
    gesture.moved = true
    const f = Math.hypot(pt.x - gesture.cx, pt.y - gesture.cy) / gesture.startDist
    if (gesture.startSize !== undefined && gesture.startW === undefined) {
      emit('update', gesture.id, { size: Math.round(clamp(gesture.startSize * f, MIN_TEXT, MAX_TEXT)) })
    } else emit('update', gesture.id, { w: round(clamp(gesture.startW * f, 0.04, 1.6), 4) })
  } else if (gesture.mode === 'rotate') {
    gesture.moved = true
    const delta = ((Math.atan2(pt.y - gesture.cy, pt.x - gesture.cx) - gesture.startAngle) * 180) / Math.PI
    let r = gesture.startRotate + delta
    r = ((((r + 180) % 360) + 360) % 360) - 180
    if (e.shiftKey) r = Math.round(r / 15) * 15
    else for (const stop of [-90, -45, 0, 45, 90, 180, -180]) if (Math.abs(r - stop) < 3) r = stop
    emit('update', gesture.id, { rotate: Math.round(r) })
  }
}
function endGesture(e) {
  if (!gesture) return
  const g = gesture
  gesture = null
  guides.value = { v: false, h: false }
  overlay.value?.releasePointerCapture?.(e.pointerId)
  if (g.moved) emit('commit', g.mode === 'move' ? 'move layer' : g.mode === 'scale' ? 'resize layer' : 'rotate layer')
}
function onKeydown(e) {
  if (e.key === 'Escape' && gesture) {
    gesture = null
    guides.value = { v: false, h: false }
    emit('cancel')
  }
}
const clamp = (v, a, b) => Math.min(b, Math.max(a, v))
const round = (v, d) => Math.round(v * 10 ** d) / 10 ** d

const safe = computed(() => {
  const b = box.value
  return { x: b.x + SAFE_MARGIN, y: b.y + SAFE_MARGIN, w: b.w - SAFE_MARGIN * 2, h: b.h - SAFE_MARGIN * 2 }
})
const cursor = computed(() => (hoverId.value || gesture ? 'move' : 'default'))
</script>

<template>
  <div ref="root" class="shirt-stage" role="img" :aria-label="label" @keydown="onKeydown">
    <img
      :src="mockSrc"
      alt=""
      draggable="false"
      :class="['shirt-stage__mock', flap ? 'shirt-stage__mock--flap' : '']"
      :style="mockStyle"
      @animationend="flap = false"
    />
    <canvas ref="canvas" class="shirt-stage__art" :style="artStyle" aria-hidden="true" />
    <svg
      ref="overlay"
      class="shirt-stage__overlay"
      :style="{ ...artStyle, cursor }"
      :viewBox="`0 0 ${MASTER.w} ${MASTER.h}`"
      aria-hidden="true"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="endGesture"
      @pointercancel="endGesture"
      @pointerleave="hoverId = null"
    >
      <!-- art box + safe area -->
      <rect :x="box.x" :y="box.y" :width="box.w" :height="box.h" fill="none" stroke="#fff" :stroke-width="u(1.5)" :stroke-dasharray="`${u(6)} ${u(5)}`" opacity="0.75" style="mix-blend-mode: difference" />
      <rect
        v-if="showSafe"
        :x="safe.x" :y="safe.y" :width="safe.w" :height="safe.h"
        fill="none" stroke="#fff" :stroke-width="u(1)" :stroke-dasharray="`${u(2)} ${u(4)}`" opacity="0.5" style="mix-blend-mode: difference"
      />
      <!-- snap guides -->
      <line v-if="guides.v" :x1="box.x + box.w / 2" :y1="box.y" :x2="box.x + box.w / 2" :y2="box.y + box.h" stroke="#D2335F" :stroke-width="u(1.5)" />
      <line v-if="guides.h" :x1="box.x" :y1="box.y + box.h / 2" :x2="box.x + box.w" :y2="box.y + box.h / 2" stroke="#D2335F" :stroke-width="u(1.5)" />
      <!-- hover -->
      <g v-if="hoverFrame" :transform="`translate(${hoverFrame.cx} ${hoverFrame.cy}) rotate(${hoverFrame.rotate})`">
        <rect :x="hoverFrame.x" :y="hoverFrame.y" :width="hoverFrame.w" :height="hoverFrame.h" fill="none" stroke="#D2335F" :stroke-width="u(1)" opacity="0.7" />
      </g>
      <!-- selection -->
      <g v-if="selFrame" :transform="`translate(${selFrame.cx} ${selFrame.cy}) rotate(${selFrame.rotate})`">
        <rect :x="selFrame.x" :y="selFrame.y" :width="selFrame.w" :height="selFrame.h" fill="none" stroke="#fff" :stroke-width="u(4)" opacity="0.9" />
        <rect :x="selFrame.x" :y="selFrame.y" :width="selFrame.w" :height="selFrame.h" fill="none" stroke="#D2335F" :stroke-width="u(2)" />
        <template v-if="handles">
          <line :x1="0" :y1="selFrame.y" :x2="0" :y2="selFrame.y - u(26)" stroke="#D2335F" :stroke-width="u(2)" />
          <circle data-handle="rotate" :cx="0" :cy="selFrame.y - u(26)" :r="u(7)" fill="#fff" stroke="#D2335F" :stroke-width="u(2)" style="cursor: grab" />
          <circle :cx="0" :cy="selFrame.y - u(26)" :r="u(16)" fill="transparent" data-handle="rotate" style="cursor: grab" />
          <template v-for="(c, i) in corners" :key="i">
            <rect
              :x="c[0] - u(6)" :y="c[1] - u(6)" :width="u(12)" :height="u(12)" :rx="u(2)"
              fill="#fff" stroke="#D2335F" :stroke-width="u(2)"
            />
            <rect
              data-handle="scale"
              :x="c[0] - u(14)" :y="c[1] - u(14)" :width="u(28)" :height="u(28)" fill="transparent"
              :style="{ cursor: i % 2 === 0 ? 'nwse-resize' : 'nesw-resize' }"
            />
          </template>
        </template>
      </g>
    </svg>
  </div>
</template>

<style scoped>
.shirt-stage {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  user-select: none;
  -webkit-user-select: none;
}
.shirt-stage__mock,
.shirt-stage__art,
.shirt-stage__overlay { position: absolute; max-width: none; }
.shirt-stage__mock { pointer-events: none; transform-origin: 50% 0; filter: drop-shadow(0 10px 0 rgb(0 0 0 / 0.18)); }
.shirt-stage__art { pointer-events: none; }
.shirt-stage__overlay { touch-action: none; overflow: visible; }
.shirt-stage__mock--flap { animation: shirt-flap 200ms cubic-bezier(0.65, 0, 0.35, 1); }
@keyframes shirt-flap {
  0% { transform: scaleY(1); opacity: 0.6; }
  50% { transform: scaleY(0.98); }
  100% { transform: scaleY(1); opacity: 1; }
}
@media (prefers-reduced-motion: reduce) { .shirt-stage__mock--flap { animation: none; } }
</style>
