<!--
  One question per screen. Props: question, index, total, selected (option id or ''), canBack.
  Emits: answer(optionId), back, quit.
  Keys: 1-4 or A-D answer, Backspace goes back, arrows move between options (radiogroup).
-->
<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { UiButton, UiIcon, UiProgress } from '../ui/index.js'

const props = defineProps({
  question: { type: Object, required: true },
  index: { type: Number, required: true },
  total: { type: Number, required: true },
  selected: { type: String, default: '' },
  canBack: { type: Boolean, default: false },
})
const emit = defineEmits(['answer', 'back', 'quit'])

const group = ref(null)
const pressed = ref('') // option id mid-press (footprint stamp)
let timer = null

const LETTERS = ['A', 'B', 'C', 'D']

// The new question is inserted after the old one has faded out; focus its heading then so
// screen readers read the question, and Tab lands on the first answer.
function onEnter(el) {
  el.querySelector('h2')?.focus({ preventScroll: true })
}
watch(() => props.question.id, () => { pressed.value = '' })
onBeforeUnmount(() => clearTimeout(timer))

function choose(id) {
  if (pressed.value) return
  pressed.value = id
  // Let the press and footprint land before moving on.
  timer = setTimeout(() => emit('answer', id), 250)
}

const radios = () => [...(group.value?.querySelectorAll('[role="radio"]') ?? [])]
function onGroupKey(e) {
  const list = radios()
  const i = list.indexOf(document.activeElement)
  if (i === -1) return
  let next = -1
  if (e.key === 'ArrowDown' || e.key === 'ArrowRight') next = (i + 1) % list.length
  else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') next = (i - 1 + list.length) % list.length
  else if (e.key === 'Home') next = 0
  else if (e.key === 'End') next = list.length - 1
  if (next !== -1) { e.preventDefault(); list[next].focus() }
}

function onWindowKey(e) {
  if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return
  const t = e.target
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return
  const k = e.key.toLowerCase()
  const n = '1234'.indexOf(k) !== -1 && k.length === 1 ? '1234'.indexOf(k) : 'abcd'.indexOf(k) !== -1 && k.length === 1 ? 'abcd'.indexOf(k) : -1
  if (n !== -1 && props.question.options[n]) { e.preventDefault(); choose(props.question.options[n].id); return }
  if (e.key === 'Backspace' && props.canBack) { e.preventDefault(); emit('back') }
}
onMounted(() => window.addEventListener('keydown', onWindowKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onWindowKey))

const tabbable = computed(() => props.selected || props.question.options[0].id)
</script>

<template>
  <section class="max-w-2xl mx-auto px-4 sm:px-6 py-6 md:py-10" :aria-label="`Question ${index + 1} of ${total}`">
    <div class="flex items-center justify-between gap-3 mb-3">
      <UiButton variant="ghost" size="sm" icon="x" @click="emit('quit')">Quit</UiButton>
      <p class="text-sm font-semibold text-ink-muted tabular" aria-hidden="true">Question {{ index + 1 }} of {{ total }}</p>
    </div>
    <UiProgress variant="steps" :value="index + 1" :max="total" label="Quiz progress" hide-label />

    <Transition name="q" mode="out-in" appear @enter="onEnter">
      <div :key="question.id" class="mt-8">
        <h2
          tabindex="-1"
          :id="`q-${question.id}`"
          class="font-display text-display-xs sm:text-display-sm outline-none leading-tight"
        >
          {{ question.text }}
        </h2>

        <div
          ref="group"
          role="radiogroup"
          :aria-labelledby="`q-${question.id}`"
          class="mt-6 grid gap-3"
          @keydown="onGroupKey"
        >
          <button
            v-for="(o, i) in question.options"
            :key="o.id"
            type="button"
            role="radio"
            :aria-checked="selected === o.id || pressed === o.id"
            :tabindex="o.id === tabbable ? 0 : -1"
            :class="['q-option', (selected === o.id || pressed === o.id) ? 'is-picked' : '', pressed === o.id ? 'is-pressed' : '']"
            :style="{ '--i': i }"
            @click="choose(o.id)"
          >
            <span class="q-letter" aria-hidden="true">{{ LETTERS[i] }}</span>
            <span class="flex-1 text-left text-base sm:text-lg font-medium leading-snug">{{ o.label }}</span>
            <svg v-if="pressed === o.id" class="q-foot" viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
              <ellipse cx="12" cy="15.5" rx="5" ry="5.5" fill="currentColor" />
              <circle cx="5.5" cy="8.5" r="2" fill="currentColor" /><circle cx="10" cy="5" r="2" fill="currentColor" />
              <circle cx="14.5" cy="5" r="2" fill="currentColor" /><circle cx="18.5" cy="8.5" r="2" fill="currentColor" />
            </svg>
            <span v-else-if="selected === o.id" class="text-primary-strong" aria-hidden="true"><UiIcon name="check" :size="20" /></span>
          </button>
        </div>
      </div>
    </Transition>

    <div class="mt-6 flex items-center justify-between gap-3 min-h-[44px]">
      <UiButton v-if="canBack" variant="ghost" icon="undo" @click="emit('back')">Back</UiButton>
      <span v-else />
      <p class="hidden md:block text-sm text-ink-subtle">Press 1 to 4 to answer, Backspace to go back</p>
    </div>
  </section>
</template>

<style scoped>
.q-enter-active { transition: opacity 220ms var(--ease-out), transform 220ms var(--ease-out); }
.q-leave-active { transition: opacity 120ms ease-in; }
.q-enter-from { opacity: 0; transform: translateX(14px); }
.q-leave-to { opacity: 0; }

.q-option {
  position: relative;
  display: flex;
  align-items: center;
  gap: 0.875rem;
  min-height: 56px;
  padding: 0.75rem 1rem;
  text-align: left;
  color: rgb(var(--c-ink));
  background: rgb(var(--c-surface));
  border: 1.5px solid rgb(var(--c-ink));
  border-radius: 18px;
  box-shadow: 3px 3px 0 rgb(var(--c-shadow));
  cursor: pointer;
  animation: q-in 320ms var(--ease-spring) both;
  animation-delay: calc(var(--i) * 55ms + 60ms);
  transition: transform 120ms var(--ease-out), box-shadow 120ms var(--ease-out), background-color 120ms;
}
.q-option:hover { background: rgb(var(--c-surface-raised)); transform: translate(-1px, -1px); box-shadow: 4px 4px 0 rgb(var(--c-shadow)); }
.q-option:active, .q-option.is-pressed { transform: translate(3px, 3px); box-shadow: 0 0 0 rgb(var(--c-shadow)); }
.q-option.is-picked { background: rgb(var(--c-primary-soft)); }
.q-option:focus-visible { outline: 3px solid rgb(var(--c-focus)); outline-offset: 3px; }
.q-letter {
  flex: none;
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: 999px;
  border: 1.5px solid rgb(var(--c-ink));
  background: rgb(var(--c-surface-sunken));
  font-weight: 700;
  font-size: 0.9rem;
}
.q-option.is-picked .q-letter { background: rgb(var(--c-primary)); }
.q-foot { flex: none; color: rgb(var(--c-ink) / 0.55); animation: q-stamp 140ms var(--ease-out) both; }
@keyframes q-in { from { opacity: 0; transform: translateY(10px) scale(0.98); } to { opacity: 1; transform: none; } }
@keyframes q-stamp { from { opacity: 0; transform: scale(1.8) rotate(-12deg); } to { opacity: 1; transform: scale(1) rotate(-8deg); } }
</style>
