<!--
  AppTopBar: sticky jungle bar. Desktop: logo, main nav pills, "Add teammate".
  Phones: compact bar with logo and the current page title (nav lives in AppTabBar).
-->
<script setup>
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { UiButton } from '../ui/index.js'
import { SPOTS } from './spots.js'
import { pageTitle } from './usePageTitle.js'

const route = useRoute()
const LINKS = [
  { to: '/', label: 'Team', key: 'team' },
  { to: '/quiz', label: 'Quiz', key: 'quiz' },
  { to: '/dinopedia', label: 'Dinopedia', key: 'dinopedia' },
  { to: '/insights', label: 'Insights', key: 'insights' },
]
const active = computed(() => route.meta.nav)
const title = computed(() => pageTitle.value || route.meta.title || 'Dino Selector')
</script>

<template>
  <header class="theme-jungle sticky top-0 z-nav bg-bg/95 backdrop-blur border-b-[1.5px] border-jungle-950" data-print-hide>
    <div class="mx-auto max-w-[1240px] h-14 md:h-16 px-4 sm:px-6 flex items-center gap-3 md:gap-6">
      <RouterLink to="/" class="group flex items-center gap-2.5 shrink-0 rounded-full" aria-label="Dino Selector, back to the team">
        <img :src="SPOTS.logoMark" alt="" class="w-9 h-9 transition-transform duration-base ease-spring group-hover:-rotate-6" width="36" height="36" />
        <span class="font-display text-xl leading-none hidden md:inline">Dino Selector</span>
      </RouterLink>
      <span class="md:hidden font-display text-lg leading-tight truncate min-w-0" aria-hidden="true">{{ title }}</span>

      <nav aria-label="Main" class="hidden md:flex items-center gap-1 text-[0.9375rem] font-semibold">
        <RouterLink
          v-for="l in LINKS"
          :key="l.key"
          :to="l.to"
          :aria-current="active === l.key ? 'page' : undefined"
          :class="[
            'px-3.5 h-9 inline-flex items-center rounded-full transition-colors duration-fast',
            active === l.key ? 'bg-ink text-ink-inverse' : 'text-ink-muted hover:text-ink hover:bg-white/[0.06]',
          ]"
        >{{ l.label }}</RouterLink>
      </nav>

      <div class="ml-auto hidden md:flex items-center gap-2">
        <UiButton size="sm" icon="plus" to="/people/new">Add teammate</UiButton>
      </div>
    </div>
  </header>
</template>
