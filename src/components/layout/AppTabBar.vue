<!-- AppTabBar: fixed bottom navigation on phones (below md). -->
<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { UiIcon } from '../ui/index.js'

const route = useRoute()
const TABS = [
  { to: '/', label: 'Team', icon: 'users', key: 'team' },
  { to: '/quiz', label: 'Quiz', icon: 'egg', key: 'quiz' },
  { to: '/people/new', label: 'Add teammate', icon: 'plus', key: 'add', centre: true },
  { to: '/dinopedia', label: 'Dinopedia', icon: 'book', key: 'dinopedia' },
  { to: '/insights', label: 'Insights', icon: 'chart', key: 'insights' },
]
const active = computed(() => route.meta.nav)
</script>

<template>
  <nav aria-label="Main" class="theme-jungle md:hidden fixed bottom-0 inset-x-0 z-nav bg-bg border-t-[1.5px] border-jungle-950 safe-bottom" data-print-hide>
    <ul class="grid grid-cols-5 h-16">
      <li v-for="t in TABS" :key="t.key">
        <RouterLink
          :to="t.to"
          :aria-current="active === t.key ? 'page' : undefined"
          :class="[
            'tab h-full flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold rounded-none',
            active === t.key && !t.centre ? 'text-primary' : 'text-ink-muted',
          ]"
        >
          <span
            v-if="t.centre"
            :class="[
              'w-12 h-12 -mt-6 rounded-full bg-primary text-on-primary border-[1.5px] border-jungle-950 shadow-sticker-sm grid place-items-center',
              'transition-transform duration-base ease-spring active:scale-95',
              active === t.key ? 'ring-2 ring-primary ring-offset-2 ring-offset-bg' : '',
            ]"
          ><UiIcon name="plus" :size="24" :stroke="2.5" /></span>
          <span v-else :class="['relative grid place-items-center w-12 h-7 rounded-full transition-colors duration-fast', active === t.key ? 'bg-white/10' : '']">
            <UiIcon :name="t.icon" :size="22" />
          </span>
          <span :class="t.centre ? 'sr-only' : ''">{{ t.label }}</span>
        </RouterLink>
      </li>
    </ul>
  </nav>
</template>

<style scoped>
.tab:focus-visible { outline-offset: -4px; border-radius: 14px; }
</style>
