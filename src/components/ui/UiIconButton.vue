<!--
  UiIconButton: square/round icon-only button. Always needs an accessible label.

  Props
    icon     String   required UiIcon name
    label    String   required accessible name (aria-label); also shown as native title
    variant  'ghost' | 'secondary' | 'primary' | 'danger'   default 'ghost'
    size     'sm' (32px) | 'md' (40px) | 'lg' (48px)        default 'md'
    pressed  Boolean|null  toggle state -> aria-pressed (null = not a toggle)
    disabled Boolean
    to / href  render as RouterLink / <a>

  Emits: click
-->
<script setup>
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import UiIcon from './UiIcon.vue'

const props = defineProps({
  icon: { type: String, required: true },
  label: { type: String, required: true },
  variant: { type: String, default: 'ghost' },
  size: { type: String, default: 'md' },
  pressed: { type: Boolean, default: null },
  disabled: { type: Boolean, default: false },
  to: { type: [String, Object], default: null },
  href: { type: String, default: null },
})

const tag = computed(() => (props.to ? RouterLink : props.href ? 'a' : 'button'))
const SIZES = { sm: 'w-8 h-8', md: 'w-10 h-10', lg: 'w-12 h-12' }
const ICON = { sm: 16, md: 20, lg: 22 }
const VARIANTS = {
  ghost: 'text-ink border-transparent hover:bg-ink/[0.08]',
  secondary: 'bg-surface-raised text-ink border-ink shadow-sticker-sm',
  primary: 'bg-primary text-on-primary border-ink shadow-sticker-sm hover:bg-primary-hover',
  danger: 'text-danger border-transparent hover:bg-danger-soft',
}
</script>

<template>
  <component
    :is="tag"
    :to="to || undefined"
    v-bind="!to && href ? { href } : {}"
    :type="tag === 'button' ? 'button' : undefined"
    :disabled="tag === 'button' ? disabled : undefined"
    :aria-label="label"
    :title="label"
    :aria-pressed="pressed === null ? undefined : String(pressed)"
    :class="[
      'ui-icon-btn inline-flex items-center justify-center rounded-full border-[1.5px] shrink-0',
      'transition-[transform,background-color,box-shadow] duration-fast ease-out',
      'disabled:opacity-40 disabled:cursor-not-allowed',
      SIZES[size] ?? SIZES.md,
      VARIANTS[variant] ?? VARIANTS.ghost,
      pressed ? '!bg-ink !text-ink-inverse !border-ink' : '',
    ]"
  >
    <UiIcon :name="icon" :size="ICON[size]" />
  </component>
</template>

<style scoped>
.ui-icon-btn:not(:disabled):active { transform: translate(1px, 2px); box-shadow: none; }
</style>
