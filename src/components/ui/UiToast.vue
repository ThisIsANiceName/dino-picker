<!--
  UiToast: toast region. Mount ONCE in App.vue (<UiToast />) and drive it with
  useToast() from src/composables/useToast.js.

  Props
    position  'bottom' (default; bottom-centre on phones above the tab bar,
              bottom-right on desktop) | 'top'

  A11y: region is an aria-live="polite" status list; error toasts use role="alert".
  Hover or focus pauses auto-dismiss. Each toast has a close button and an optional action.
-->
<script setup>
import { useToast } from '../../composables/useToast.js'
import UiIcon from './UiIcon.vue'

defineProps({ position: { type: String, default: 'bottom' } })
const toast = useToast()

const TONE = {
  neutral: { icon: 'info', cls: 'bg-ink text-ink-inverse', iconCls: 'text-resin-300' },
  success: { icon: 'check', cls: 'bg-ink text-ink-inverse', iconCls: 'text-fern-300' },
  info: { icon: 'info', cls: 'bg-ink text-ink-inverse', iconCls: 'text-lagoon-200' },
  warning: { icon: 'warning', cls: 'bg-resin-300 text-lichen-900', iconCls: 'text-lichen-900' },
  error: { icon: 'warning', cls: 'bg-magma-600 text-white', iconCls: 'text-white' },
}
</script>

<template>
  <div
    data-print-hide
    :class="[
      'ui-toast-region fixed z-toast inset-x-3 flex flex-col gap-2 pointer-events-none',
      'sm:inset-x-auto sm:right-6 sm:w-[380px]',
      position === 'top'
        ? 'top-3 sm:top-20'
        : 'bottom-[calc(var(--tabbar-h)+12px+env(safe-area-inset-bottom))] sm:bottom-6',
    ]"
    aria-live="polite"
    aria-relevant="additions"
  >
    <TransitionGroup name="ui-toast">
      <div
        v-for="t in toast.state.items"
        :key="t.id"
        :role="t.tone === 'error' ? 'alert' : 'status'"
        :class="[
          'pointer-events-auto flex items-start gap-3 rounded-lg border-[1.5px] border-ink px-4 py-3 shadow-sticker',
          (TONE[t.tone] ?? TONE.neutral).cls,
        ]"
        @mouseenter="toast.pause(t.id)"
        @mouseleave="toast.resume(t.id)"
        @focusin="toast.pause(t.id)"
        @focusout="toast.resume(t.id)"
      >
        <UiIcon :name="(TONE[t.tone] ?? TONE.neutral).icon" :size="20" :class="['mt-0.5', (TONE[t.tone] ?? TONE.neutral).iconCls]" />
        <div class="min-w-0 flex-1">
          <p class="font-semibold leading-snug">{{ t.title }}</p>
          <p v-if="t.message" class="text-sm opacity-85 leading-snug mt-0.5">{{ t.message }}</p>
        </div>
        <button
          v-if="t.action"
          type="button"
          class="shrink-0 self-center rounded-full px-3 h-8 text-sm font-bold underline decoration-2 underline-offset-2 hover:bg-white/15"
          @click="t.action.onClick?.(); toast.dismiss(t.id)"
        >
          {{ t.action.label }}
        </button>
        <button
          type="button"
          class="shrink-0 -mr-1 w-7 h-7 inline-flex items-center justify-center rounded-full hover:bg-white/15"
          aria-label="Dismiss notification"
          @click="toast.dismiss(t.id)"
        >
          <UiIcon name="x" :size="16" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.ui-toast-enter-active { animation: toast-in 260ms var(--ease-spring) both; }
.ui-toast-leave-active { transition: opacity var(--dur-fast) ease-in, transform var(--dur-fast) ease-in; }
.ui-toast-leave-to { opacity: 0; transform: translateX(24px); }
.ui-toast-move { transition: transform var(--dur-base) var(--ease-out); }
@keyframes toast-in {
  from { opacity: 0; transform: translateY(12px) scale(0.96); }
  to { opacity: 1; transform: none; }
}
</style>
