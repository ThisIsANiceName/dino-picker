<!--
  UiButton: pill button with sticker press physics.

  Props
    variant   'primary' | 'secondary' | 'ghost' | 'danger' | 'accent'   default 'primary'
    size      'sm' (36px) | 'md' (44px) | 'lg' (52px)                   default 'md'
    to        RouteLocation  renders a <RouterLink>
    href      String         renders an <a>
    type      String         native button type, default 'button'
    loading   Boolean        shows spinner, sets aria-busy, blocks clicks
    disabled  Boolean
    block     Boolean        full width
    icon      String         leading UiIcon name (or use #icon slot)
    iconRight String         trailing UiIcon name (or use #icon-right slot)

  Slots: default (label), icon, icon-right
  Emits: click (native, suppressed while loading/disabled)
-->
<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import UiIcon from './UiIcon.vue'

const props = defineProps({
  variant: { type: String, default: 'primary' },
  size: { type: String, default: 'md' },
  to: { type: [String, Object], default: null },
  href: { type: String, default: null },
  type: { type: String, default: 'button' },
  loading: { type: Boolean, default: false },
  disabled: { type: Boolean, default: false },
  block: { type: Boolean, default: false },
  icon: { type: String, default: '' },
  iconRight: { type: String, default: '' },
})

const tag = computed(() => (props.to ? RouterLink : props.href ? 'a' : 'button'))
const inactive = computed(() => props.disabled || props.loading)

const VARIANTS = {
  primary: 'bg-primary text-on-primary border-ink shadow-sticker hover:bg-primary-hover',
  accent: 'bg-accent text-on-accent border-ink shadow-sticker hover:brightness-110',
  secondary: 'bg-surface-raised text-ink border-ink shadow-sticker-sm hover:bg-surface',
  ghost: 'bg-transparent text-ink border-transparent hover:bg-ink/[0.07]',
  danger: 'bg-danger text-white border-ink shadow-sticker-sm hover:brightness-110',
}
const SIZES = {
  sm: 'h-9 px-3.5 text-sm gap-1.5',
  md: 'h-11 px-5 text-[0.9375rem] gap-2',
  lg: 'h-[52px] px-7 text-base gap-2.5',
}
const ICON_SIZE = { sm: 16, md: 18, lg: 20 }

const classes = computed(() => [
  'ui-btn relative inline-flex items-center justify-center select-none whitespace-nowrap rounded-full border-[1.5px] font-semibold',
  'transition-[transform,box-shadow,background-color,filter] duration-fast ease-out',
  VARIANTS[props.variant] ?? VARIANTS.primary,
  SIZES[props.size] ?? SIZES.md,
  props.block ? 'w-full' : '',
  inactive.value ? 'is-inactive' : '',
])

function onClick(e) {
  if (inactive.value) {
    e.preventDefault()
    e.stopImmediatePropagation()
  }
}
</script>

<template>
  <component
    :is="tag"
    :to="to || undefined"
    v-bind="!to && href ? { href } : {}"
    :type="tag === 'button' ? type : undefined"
    :disabled="tag === 'button' ? inactive : undefined"
    :aria-disabled="tag !== 'button' && inactive ? 'true' : undefined"
    :aria-busy="loading ? 'true' : undefined"
    :class="classes"
    @click="onClick"
  >
    <span :class="['inline-flex items-center gap-[inherit]', loading ? 'invisible' : '']">
      <slot name="icon"><UiIcon v-if="icon" :name="icon" :size="ICON_SIZE[size]" /></slot>
      <slot />
      <slot name="icon-right"><UiIcon v-if="iconRight" :name="iconRight" :size="ICON_SIZE[size]" /></slot>
    </span>
    <span v-if="loading" class="absolute inset-0 flex items-center justify-center" aria-hidden="true">
      <span class="ui-spinner" />
    </span>
  </component>
</template>

<style scoped>
.ui-btn:not(.is-inactive):active {
  transform: translate(2px, 3px);
  box-shadow: 0 0 0 0 rgb(var(--c-shadow));
}
.ui-btn.is-inactive {
  opacity: 0.5;
  cursor: not-allowed;
  box-shadow: none;
}
.ui-btn[aria-busy='true'] { opacity: 1; cursor: progress; }
.ui-spinner {
  width: 1.1em;
  height: 1.1em;
  border-radius: 9999px;
  border: 2.5px solid currentColor;
  border-right-color: transparent;
  animation: ui-spin 700ms linear infinite;
}
@keyframes ui-spin { to { transform: rotate(360deg); } }
@media (prefers-reduced-motion: reduce) {
  .ui-spinner { animation-duration: 1.4s !important; animation-iteration-count: infinite !important; }
}
</style>
