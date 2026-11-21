<!--
  UiTooltip: simple text tooltip on hover AND keyboard focus (CSS-positioned,
  no portal). The trigger gets aria-describedby; Esc hides it.
  Use for icon-button hints and keyboard shortcut reveals, never for essential info.

  Props
    text       String  required tooltip text
    shortcut   String  optional key hint rendered as <kbd> (e.g. "Ctrl Z")
    placement  'top' (default) | 'bottom' | 'left' | 'right'
    delay      Number  ms before showing on hover, default 350 (focus shows immediately)

  Slot: default (single trigger element; it must be focusable, e.g. UiIconButton)
-->
<script>
let uid = 0 // module scope: shared across instances (not reset per component)
</script>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  text: { type: String, required: true },
  shortcut: { type: String, default: '' },
  placement: { type: String, default: 'top' },
  delay: { type: Number, default: 350 },
})
const id = `ui-tip-${++uid}`
const open = ref(false)
const wrap = ref(null)
onMounted(() => wrap.value?.firstElementChild?.setAttribute('aria-describedby', id))
let t = null

function show(immediate = false) {
  clearTimeout(t)
  if (immediate) open.value = true
  else t = setTimeout(() => (open.value = true), props.delay)
}
function hide() {
  clearTimeout(t)
  open.value = false
}
onBeforeUnmount(() => clearTimeout(t))

const POS = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
}
</script>

<template>
  <span
    ref="wrap"
    class="relative inline-flex"
    @mouseenter="show()"
    @mouseleave="hide"
    @focusin="show(true)"
    @focusout="hide"
    @keydown.esc="hide"
  >
    <slot />
    <span
      :id="id"
      role="tooltip"
      :class="[
        'pointer-events-none absolute z-tooltip whitespace-nowrap rounded-sm bg-ink text-ink-inverse px-2.5 py-1.5 text-xs font-semibold',
        'transition-[opacity,transform] duration-fast ease-out',
        POS[placement] ?? POS.top,
        open ? 'opacity-100' : 'opacity-0 invisible',
      ]"
    >
      {{ text }}
      <kbd v-if="shortcut" class="ml-1.5 rounded-xs bg-white/15 px-1 py-px font-sans text-2xs">{{ shortcut }}</kbd>
    </span>
  </span>
</template>
