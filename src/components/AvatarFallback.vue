<script setup>
import { computed } from 'vue'

const props = defineProps({
  name: { type: String, default: '' },
  size: { type: String, default: 'md' }, // sm | md | lg
})

const initials = computed(() => {
  const parts = props.name.trim().split(/\s+/)
  if (parts.length === 0 || !parts[0]) return '?'
  if (parts.length === 1) return parts[0][0].toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
})

const sizeClasses = computed(() => ({
  sm: 'w-8 h-8 text-xs',
  md: 'w-12 h-12 text-sm',
  lg: 'w-20 h-20 text-2xl',
}[props.size] ?? 'w-12 h-12 text-sm'))
</script>

<template>
  <div
    :class="[sizeClasses, 'rounded-full bg-amber-800 text-fossil-50 font-display font-bold flex items-center justify-center select-none shrink-0']"
    :aria-label="`Avatar for ${name}`"
  >
    {{ initials }}
  </div>
</template>
