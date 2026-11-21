<!--
  TileGrid: single-choice grid of picture tiles (accessories, scenes, frames, templates, decor).
  role="radiogroup"; arrow keys move and select, roving tabindex.

  Props
    modelValue  String|null  selected id (null selects the "none" tile)
    items       Array<{ id: String|null, label: String, src?: String (image URL / data URI), icon?: String }>
    label       String  required accessible group name ("Hat")
    size        Number  tile edge in px, default 72
    wide        Boolean tiles stretch to fill the row (templates)
    caption     Boolean show the label under the picture
    checker     Boolean checkerboard behind pictures (transparent art)

  Emits: update:modelValue (id|null)
-->
<script setup>
import { ref } from 'vue'
import { UiIcon } from '../ui/index.js'

const props = defineProps({
  modelValue: { type: [String, null], default: null },
  items: { type: Array, required: true },
  label: { type: String, required: true },
  size: { type: Number, default: 72 },
  wide: { type: Boolean, default: false },
  caption: { type: Boolean, default: false },
  checker: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue'])
const els = ref([])

function onKey(e, i) {
  const n = props.items.length
  let next = null
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (i + 1) % n
  else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (i - 1 + n) % n
  else if (e.key === 'Home') next = 0
  else if (e.key === 'End') next = n - 1
  if (next === null) return
  e.preventDefault()
  emit('update:modelValue', props.items[next].id)
  els.value[next]?.focus()
}
const isSelected = (item) => (item.id ?? null) === (props.modelValue ?? null)
const hasSelection = () => props.items.some(isSelected)
</script>

<template>
  <div
    role="radiogroup"
    :aria-label="label"
    class="tile-grid"
    :style="{ '--tile': `${size}px` }"
    :class="{ 'tile-grid--wide': wide }"
  >
    <button
      v-for="(item, i) in items"
      :key="item.id ?? '__none'"
      ref="els"
      type="button"
      role="radio"
      :aria-checked="String(isSelected(item))"
      :aria-label="item.label"
      :title="item.label"
      :tabindex="isSelected(item) || (!hasSelection() && i === 0) ? 0 : -1"
      :class="['tile', isSelected(item) ? 'tile--on' : '']"
      @click="emit('update:modelValue', item.id)"
      @keydown="onKey($event, i)"
    >
      <span :class="['tile__pic', checker && item.src ? 'tile__pic--checker' : '']">
        <img v-if="item.src" :src="item.src" alt="" draggable="false" loading="lazy" decoding="async" />
        <UiIcon v-else :name="item.icon ?? 'x'" :size="22" class="text-ink-subtle" />
      </span>
      <span v-if="caption" class="tile__cap">{{ item.label }}</span>
      <span v-if="isSelected(item)" class="tile__check" aria-hidden="true"><UiIcon name="check" :size="12" :stroke="3" /></span>
    </button>
  </div>
</template>

<style scoped>
.tile-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(var(--tile), 1fr));
  gap: 8px;
}
.tile-grid--wide { grid-template-columns: repeat(auto-fill, minmax(calc(var(--tile) + 24px), 1fr)); gap: 10px; }
.tile {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  min-width: 0;
  padding: 0;
  border-radius: 12px;
  border: 1.5px solid rgb(var(--c-line));
  background: rgb(var(--c-surface-raised));
  overflow: hidden;
  transition: border-color var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out);
}
.tile:hover { border-color: rgb(var(--c-ink-muted)); }
.tile:active { transform: translateY(1px); }
.tile--on {
  border-color: rgb(var(--c-ink));
  box-shadow: 2px 2px 0 0 rgb(var(--c-shadow)), inset 0 0 0 1.5px rgb(var(--c-ink));
}
.tile__pic {
  display: grid;
  place-items: center;
  aspect-ratio: 1 / 1;
  width: 100%;
  background: rgb(var(--c-surface-sunken));
}
.tile__pic--checker { background: #F3F4EC; }
.tile__pic img { display: block; width: 100%; height: 100%; object-fit: contain; }
.tile__cap {
  padding: 5px 6px 6px;
  font-size: 0.75rem;
  line-height: 1.15;
  font-weight: 600;
  text-align: center;
  color: rgb(var(--c-ink));
  border-top: 1px solid rgb(var(--c-line));
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.tile__check {
  position: absolute;
  top: 4px;
  right: 4px;
  display: grid;
  place-items: center;
  width: 18px;
  height: 18px;
  border-radius: 999px;
  background: rgb(var(--c-ink));
  color: rgb(var(--c-ink-inverse));
  box-shadow: 0 0 0 2px rgb(var(--c-surface-raised));
}
@media (prefers-reduced-motion: reduce) { .tile { transition: none; } }
</style>
