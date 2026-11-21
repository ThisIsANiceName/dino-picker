<!--
  UiBottomSheet: mobile bottom sheet. Two modes:

  1. modal (default): overlay sheet, like UiModal (focus trap, Esc, backdrop, aria-modal).
     Use for pickers/menus on phones.
  2. docked (`docked` prop): a non-modal, always-present sheet pinned to the bottom of
     the viewport with snap states. This is the studio control panel on phones:
     the preview stays visible above it. Drag the grip or press it (Enter/Space)
     to cycle 'peek' -> 'half' -> 'full'.

  Props
    modelValue  Boolean  open state (modal mode only, v-model)
    title       String   required; heading (visually hidden in docked mode) + accessible name
    docked      Boolean  docked non-modal mode
    snap        'peek' | 'half' | 'full'   docked height (v-model:snap). peek=96px, half=50dvh, full=88dvh

  Slots: default (content), header (replaces title row; in docked mode put UiTabs here), footer
  Emits: update:modelValue, update:snap, close
-->
<script>
let uid = 0 // module scope: shared across instances (not reset per component)
</script>

<script setup>
import { ref, watch, nextTick, computed } from 'vue'
import { useFocusTrap } from './useFocusTrap.js'
import UiIconButton from './UiIconButton.vue'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, required: true },
  docked: { type: Boolean, default: false },
  snap: { type: String, default: 'half' },
})
const emit = defineEmits(['update:modelValue', 'update:snap', 'close'])
const id = `ui-sheet-${++uid}`
const panel = ref(null)
const { activate, deactivate } = useFocusTrap()

const ORDER = ['peek', 'half', 'full']
const HEIGHT = { peek: '96px', half: '50dvh', full: '88dvh' }
const dragY = ref(0)
let startY = null

function close() {
  emit('update:modelValue', false)
  emit('close')
}
function cycle() {
  const i = ORDER.indexOf(props.snap)
  emit('update:snap', ORDER[(i + 1) % ORDER.length])
}
function onPointerDown(e) {
  startY = e.clientY
  e.target.setPointerCapture?.(e.pointerId)
}
function onPointerMove(e) {
  if (startY === null) return
  dragY.value = e.clientY - startY
}
function onPointerUp() {
  if (startY === null) return
  const dy = dragY.value
  startY = null
  dragY.value = 0
  const i = ORDER.indexOf(props.snap)
  if (props.docked) {
    if (dy < -40) emit('update:snap', ORDER[Math.min(i + 1, 2)])
    else if (dy > 40) emit('update:snap', ORDER[Math.max(i - 1, 0)])
    else if (Math.abs(dy) < 4) cycle()
  } else if (dy > 80) close()
}

const dockedStyle = computed(() => ({
  height: HEIGHT[props.snap] ?? HEIGHT.half,
  transform: dragY.value ? `translateY(${Math.max(dragY.value, -60)}px)` : undefined,
}))

watch(
  () => props.modelValue,
  async (open) => {
    if (props.docked) return
    if (open) {
      await nextTick()
      if (panel.value) activate(panel.value)
    } else deactivate()
  },
  { immediate: true },
)
</script>

<template>
  <!-- Docked, non-modal -->
  <section
    v-if="docked"
    :aria-labelledby="`${id}-title`"
    class="ui-sheet--docked fixed inset-x-0 bottom-0 z-sheet flex flex-col bg-surface text-ink border-t-[1.5px] border-ink rounded-t-xl shadow-lift"
    :style="dockedStyle"
  >
    <button
      type="button"
      class="mx-auto mt-1.5 mb-1 h-6 w-16 flex items-center justify-center touch-none cursor-grab"
      :aria-label="`Resize ${title} panel (currently ${snap})`"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @keydown.enter.prevent="cycle"
      @keydown.space.prevent="cycle"
    >
      <span class="block w-10 h-1.5 rounded-full bg-line-strong" aria-hidden="true" />
    </button>
    <h2 :id="`${id}-title`" class="sr-only">{{ title }}</h2>
    <div v-if="$slots.header" class="px-3 pb-2"><slot name="header" /></div>
    <div class="flex-1 overflow-y-auto overscroll-contain px-4 pb-4"><slot /></div>
    <div v-if="$slots.footer" class="px-4 py-3 border-t border-line safe-bottom"><slot name="footer" /></div>
  </section>

  <!-- Modal -->
  <Teleport v-else to="body">
    <Transition name="ui-sheet">
      <div v-if="modelValue" class="fixed inset-0 z-sheet flex items-end" @keydown.esc.stop="close">
        <div class="absolute inset-0 bg-jungle-950/55" aria-hidden="true" @click="close" />
        <div
          ref="panel"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="`${id}-title`"
          tabindex="-1"
          class="ui-sheet__panel relative w-full max-h-[90dvh] flex flex-col bg-surface text-ink border-t-[1.5px] border-ink rounded-t-xl shadow-lift"
          :style="dragY > 0 ? { transform: `translateY(${dragY}px)` } : undefined"
        >
          <div
            class="mx-auto mt-2 h-5 w-16 flex items-center justify-center touch-none"
            aria-hidden="true"
            @pointerdown="onPointerDown"
            @pointermove="onPointerMove"
            @pointerup="onPointerUp"
            @pointercancel="onPointerUp"
          >
            <span class="block w-10 h-1.5 rounded-full bg-line-strong" />
          </div>
          <h2 v-if="$slots.header" :id="`${id}-title`" class="sr-only">{{ title }}</h2>
          <slot name="header">
            <div class="flex items-center justify-between px-5 pb-2">
              <h2 :id="`${id}-title`" class="font-display text-display-xs">{{ title }}</h2>
              <UiIconButton icon="x" label="Close" @click="close" />
            </div>
          </slot>
          <div class="flex-1 overflow-y-auto overscroll-contain px-5 pb-5"><slot /></div>
          <div v-if="$slots.footer" class="px-5 py-3 border-t border-line safe-bottom"><slot name="footer" /></div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.ui-sheet--docked { transition: height var(--dur-slow) var(--ease-out); }
.ui-sheet-enter-active, .ui-sheet-leave-active { transition: opacity var(--dur-base) var(--ease-out); }
.ui-sheet-enter-active .ui-sheet__panel { animation: sheet-up 300ms var(--ease-out) both; }
.ui-sheet-leave-active .ui-sheet__panel { transition: transform var(--dur-base) ease-in; }
.ui-sheet-enter-from, .ui-sheet-leave-to { opacity: 0; }
.ui-sheet-leave-to .ui-sheet__panel { transform: translateY(100%); }
@keyframes sheet-up { from { transform: translateY(100%); } to { transform: none; } }
</style>
