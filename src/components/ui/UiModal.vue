<!--
  UiModal: accessible dialog (teleported to body, focus trap, Esc closes,
  restores focus, scroll lock, aria-modal + labelled by its title).

  Props
    modelValue    Boolean  open state (v-model)
    title         String   required; visible heading and accessible name
    description   String   optional sub-line, wired to aria-describedby
    size          'sm' (400) | 'md' (560, default) | 'lg' (760) | 'xl' (1000)
    dismissible   Boolean  default true. Esc / backdrop / close button allowed
    role          'dialog' (default) | 'alertdialog' (destructive confirms)

  Slots: default (body), footer (actions, right-aligned), title (custom heading content)
  Emits: update:modelValue, close
  Tip: put data-autofocus on the element that should receive focus first.
-->
<script>
let uid = 0 // module scope: shared across instances (not reset per component)
</script>

<script setup>
import { ref, watch, nextTick } from 'vue'
import UiIconButton from './UiIconButton.vue'
import { useFocusTrap } from './useFocusTrap.js'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  size: { type: String, default: 'md' },
  dismissible: { type: Boolean, default: true },
  role: { type: String, default: 'dialog' },
})
const emit = defineEmits(['update:modelValue', 'close'])

const id = `ui-modal-${++uid}`
const panel = ref(null)
const { activate, deactivate } = useFocusTrap()
const SIZES = { sm: 'max-w-[400px]', md: 'max-w-[560px]', lg: 'max-w-[760px]', xl: 'max-w-[1000px]' }

function close() {
  if (!props.dismissible) return
  emit('update:modelValue', false)
  emit('close')
}

watch(
  () => props.modelValue,
  async (open) => {
    if (open) {
      await nextTick()
      if (panel.value) activate(panel.value)
    } else deactivate()
  },
  { immediate: true },
)
</script>

<template>
  <Teleport to="body">
    <Transition name="ui-modal">
      <div
        v-if="modelValue"
        class="fixed inset-0 z-modal flex items-end sm:items-center justify-center p-0 sm:p-6"
        @keydown.esc.stop="close"
      >
        <div class="absolute inset-0 bg-jungle-950/60 backdrop-blur-[2px]" aria-hidden="true" @click="close" />
        <div
          ref="panel"
          :role="role"
          aria-modal="true"
          :aria-labelledby="`${id}-title`"
          :aria-describedby="description ? `${id}-desc` : undefined"
          tabindex="-1"
          :class="[
            'ui-modal__panel relative w-full flex flex-col max-h-[92dvh] bg-surface text-ink',
            'border-[1.5px] border-ink rounded-t-xl sm:rounded-xl shadow-lift',
            SIZES[size] ?? SIZES.md,
          ]"
        >
          <header class="flex items-start gap-4 px-6 pt-5 pb-3">
            <div class="min-w-0 flex-1">
              <h2 :id="`${id}-title`" class="font-display text-display-xs text-ink">
                <slot name="title">{{ title }}</slot>
              </h2>
              <p v-if="description" :id="`${id}-desc`" class="mt-1 text-sm text-ink-muted">{{ description }}</p>
            </div>
            <UiIconButton v-if="dismissible" icon="x" label="Close" class="-mr-2 -mt-1" @click="close" />
          </header>
          <div class="px-6 pb-5 overflow-y-auto overscroll-contain"><slot /></div>
          <footer
            v-if="$slots.footer"
            class="flex flex-wrap items-center justify-end gap-3 px-6 py-4 border-t border-line bg-surface-sunken rounded-b-none sm:rounded-b-xl safe-bottom"
          >
            <slot name="footer" />
          </footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.ui-modal-enter-active, .ui-modal-leave-active { transition: opacity var(--dur-base) var(--ease-out); }
.ui-modal-enter-active .ui-modal__panel { animation: modal-in var(--dur-base) var(--ease-out) both; }
.ui-modal-leave-active .ui-modal__panel { transition: transform var(--dur-fast) ease-in, opacity var(--dur-fast) ease-in; }
.ui-modal-enter-from, .ui-modal-leave-to { opacity: 0; }
.ui-modal-leave-to .ui-modal__panel { transform: translateY(8px) scale(0.98); opacity: 0; }
@keyframes modal-in {
  from { opacity: 0; transform: translateY(14px) scale(0.97); }
  to { opacity: 1; transform: none; }
}
</style>
