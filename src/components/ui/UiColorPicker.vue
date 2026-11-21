<!--
  UiColorPicker: preset swatches (radiogroup, arrow keys) + native colour input
  + hex text field. Emits only valid uppercase #RRGGBB.

  Props
    modelValue  String   hex (v-model)
    label       String   required group label ("Body", "Hat colour", "Text colour")
    presets     Array<String | { hex: String, name: String }>   swatches shown first
    custom      Boolean  show native picker + hex field (default true)
    contrastWith String  optional hex; if set and contrast < 3:1 a warning line appears
                         (Shirt Studio: pass the garment colour)
    size        'sm' | 'md'  swatch size, default 'md'

  Emits
    update:modelValue (hex)  on every valid change (live preview)
    change (hex)             on commit: swatch click, native picker close, hex blur/Enter
                             (push to undo history on this one)
-->
<script>
let uid = 0 // module scope: shared across instances (not reset per component)
</script>

<script setup>
import { ref, computed, watch } from 'vue'
import UiColorSwatch from './UiColorSwatch.vue'
import UiIcon from './UiIcon.vue'
import { normalizeHex, contrastRatio, LOW_CONTRAST_THRESHOLD } from './color.js'

const props = defineProps({
  modelValue: { type: String, default: '#FFFFFF' },
  label: { type: String, required: true },
  presets: { type: Array, default: () => [] },
  custom: { type: Boolean, default: true },
  contrastWith: { type: String, default: '' },
  size: { type: String, default: 'md' },
})
const emit = defineEmits(['update:modelValue', 'change'])
const id = `ui-color-${++uid}`
const swatchEls = ref([])

const list = computed(() =>
  props.presets.map((p) => (typeof p === 'string' ? { hex: normalizeHex(p), name: p.toUpperCase() } : { ...p, hex: normalizeHex(p.hex) })),
)
const current = computed(() => normalizeHex(props.modelValue) ?? '#FFFFFF')
const selectedIndex = computed(() => list.value.findIndex((p) => p.hex === current.value))
const isCustom = computed(() => selectedIndex.value === -1)

const hexDraft = ref(current.value)
const hexError = ref(false)
watch(current, (v) => { hexDraft.value = v; hexError.value = false })

function pick(hex, commit = true) {
  const h = normalizeHex(hex)
  if (!h) return
  emit('update:modelValue', h)
  if (commit) emit('change', h)
}
function onHexInput(e) {
  hexDraft.value = e.target.value
  const h = normalizeHex(hexDraft.value)
  hexError.value = !h && hexDraft.value.replace('#', '').length >= 3
  if (h) pick(h, false)
}
function commitHex() {
  const h = normalizeHex(hexDraft.value)
  if (h) pick(h)
  else { hexDraft.value = current.value; hexError.value = false }
}
function onSwatchKey(e, i) {
  const n = list.value.length
  let next = null
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (i + 1) % n
  else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (i - 1 + n) % n
  if (next === null) return
  e.preventDefault()
  pick(list.value[next].hex)
  swatchEls.value[next]?.$el?.focus()
}

const ratio = computed(() => (props.contrastWith ? contrastRatio(current.value, props.contrastWith) : null))
const lowContrast = computed(() => ratio.value !== null && ratio.value < LOW_CONTRAST_THRESHOLD)
</script>

<template>
  <fieldset class="ui-color-picker min-w-0">
    <legend :id="`${id}-label`" class="text-sm font-semibold text-ink mb-2 flex items-center gap-2">
      {{ label }}
      <span class="font-normal text-ink-subtle tabular">{{ current }}</span>
    </legend>

    <div class="flex flex-wrap items-center gap-2.5">
      <div
        v-if="list.length"
        role="radiogroup"
        :aria-labelledby="`${id}-label`"
        class="flex flex-wrap gap-2.5 p-0.5"
      >
        <UiColorSwatch
          v-for="(p, i) in list"
          :key="p.hex + i"
          ref="swatchEls"
          :color="p.hex"
          :name="p.name"
          :size="size"
          :selected="i === selectedIndex"
          :tabindex="i === (selectedIndex === -1 ? 0 : selectedIndex) ? 0 : -1"
          @click="pick(p.hex)"
          @keydown="onSwatchKey($event, i)"
        />
      </div>

      <template v-if="custom">
        <label
          :class="[
            'ui-color-native relative inline-flex items-center justify-center rounded-full cursor-pointer shrink-0',
            'border-[1.5px] border-dashed border-ink/70',
            size === 'sm' ? 'w-7 h-7' : 'w-9 h-9',
            isCustom ? 'is-selected' : '',
          ]"
          :style="isCustom ? { background: current, borderStyle: 'solid' } : undefined"
          :title="'Custom colour'"
        >
          <UiIcon v-if="!isCustom" name="plus" :size="16" class="text-ink-muted" />
          <input
            type="color"
            class="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            :value="current"
            :aria-label="`${label}: custom colour`"
            @input="pick($event.target.value, false)"
            @change="pick($event.target.value)"
          />
        </label>
        <div class="relative">
          <input
            :id="`${id}-hex`"
            type="text"
            inputmode="text"
            autocomplete="off"
            spellcheck="false"
            maxlength="7"
            :value="hexDraft"
            :aria-label="`${label}: hex value`"
            :aria-invalid="String(hexError)"
            :aria-describedby="hexError ? `${id}-err` : undefined"
            class="ui-control !w-[6.5rem] !py-1.5 !px-2.5 !text-sm tabular uppercase"
            @input="onHexInput"
            @blur="commitHex"
            @keydown.enter.prevent="commitHex"
          />
        </div>
      </template>
    </div>

    <p v-if="hexError" :id="`${id}-err`" class="mt-1.5 text-xs text-danger font-medium">Use a hex code like #F5AE36.</p>
    <p v-if="lowContrast" class="mt-2 flex items-center gap-1.5 text-xs font-semibold text-warning" role="status">
      <UiIcon name="warning" :size="14" />
      Low contrast on this shirt ({{ ratio.toFixed(1) }}:1). It may disappear when printed.
    </p>
  </fieldset>
</template>

<style scoped>
.ui-color-native.is-selected { box-shadow: 0 0 0 3px rgb(var(--c-surface)), 0 0 0 5px rgb(var(--c-ink)); }
.ui-color-native:focus-within { box-shadow: 0 0 0 3px rgb(var(--c-surface)), 0 0 0 6px rgb(var(--c-focus)); }
</style>
