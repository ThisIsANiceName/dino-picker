<!--
  UiCard: content container.

  Props
    variant     'paper' (ink outline + hard shadow, default) | 'flat' (hairline, no shadow)
                | 'sunken' (inset panel) | 'sticker' (die-cut white keyline, optional tilt)
                | 'jungle' (dark scope)
    padding     'none' | 'sm' | 'md' | 'lg'   default 'md'
    as          String  root tag, default 'div' (use 'article', 'section', 'li'...)
    to          RouteLocation  makes the whole card a RouterLink (interactive)
    interactive Boolean hover lift + press physics (implied by `to`)
    tilt        Number  degrees of rotation for 'sticker' (e.g. -2, 1.5). Default 0.

  Slots: default, header, footer
-->
<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'

const props = defineProps({
  variant: { type: String, default: 'paper' },
  padding: { type: String, default: 'md' },
  as: { type: String, default: 'div' },
  to: { type: [String, Object], default: null },
  interactive: { type: Boolean, default: false },
  tilt: { type: Number, default: 0 },
})

const tag = computed(() => (props.to ? RouterLink : props.as))
const isInteractive = computed(() => props.interactive || !!props.to)

const VARIANTS = {
  paper: 'bg-surface border-[1.5px] border-ink rounded-lg shadow-sticker',
  flat: 'bg-surface border border-line rounded-lg',
  sunken: 'bg-surface-sunken rounded-lg shadow-inset',
  sticker: 'bg-surface-raised rounded-xl shadow-diecut',
  jungle: 'theme-jungle bg-surface border-[1.5px] border-jungle-950 rounded-lg shadow-sticker',
}
const PAD = { none: '', sm: 'p-3', md: 'p-5', lg: 'p-7' }
</script>

<template>
  <component
    :is="tag"
    :to="to || undefined"
    :class="[
      'ui-card relative block text-ink',
      VARIANTS[variant] ?? VARIANTS.paper,
      isInteractive ? 'is-interactive cursor-pointer' : '',
    ]"
    :style="tilt ? { '--tilt': `${tilt}deg`, transform: `rotate(${tilt}deg)` } : undefined"
  >
    <div v-if="$slots.header" :class="['border-b border-line', PAD[padding] ?? PAD.md]">
      <slot name="header" />
    </div>
    <div :class="PAD[padding] ?? PAD.md"><slot /></div>
    <div v-if="$slots.footer" :class="['border-t border-line', PAD[padding] ?? PAD.md]">
      <slot name="footer" />
    </div>
  </component>
</template>

<style scoped>
.ui-card.is-interactive {
  transition: transform var(--dur-base) var(--ease-spring), box-shadow var(--dur-base) var(--ease-out);
}
.ui-card.is-interactive:hover {
  transform: translate(-2px, -3px) rotate(var(--tilt, 0deg));
  box-shadow: 5px 7px 0 0 rgb(var(--c-shadow));
}
.ui-card.is-interactive:active {
  transform: translate(1px, 2px) rotate(var(--tilt, 0deg));
  box-shadow: 1px 1px 0 0 rgb(var(--c-shadow));
}
</style>
