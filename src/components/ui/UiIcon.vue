<!--
  UiIcon: inline SVG stroke icon (24x24 grid, 2px round strokes, currentColor).

  Props
    name   String  required. One of ICON_NAMES (exported from ./icons.js).
    size   Number|String  default 20. Pixel size (width = height).
    stroke Number  default 2. Stroke width in grid units.
    label  String  optional. If set, the icon is announced (role="img" + aria-label);
                   otherwise it is decorative (aria-hidden="true").

  Usage: <UiIcon name="shuffle" />  <UiIcon name="warning" label="Low contrast" />
-->
<script setup>
import { computed } from 'vue'
import { ICONS } from './icons.js'

const props = defineProps({
  name: { type: String, required: true },
  size: { type: [Number, String], default: 20 },
  stroke: { type: Number, default: 2 },
  label: { type: String, default: '' },
})

const body = computed(() => ICONS[props.name] ?? ICONS.info)
</script>

<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    :width="size"
    :height="size"
    fill="none"
    stroke="currentColor"
    :stroke-width="stroke"
    stroke-linecap="round"
    stroke-linejoin="round"
    class="shrink-0"
    :role="label ? 'img' : undefined"
    :aria-label="label || undefined"
    :aria-hidden="label ? undefined : 'true'"
    focusable="false"
    v-html="body"
  />
</template>
