<!--
  App shell. Chrome per route (router meta.chrome):
    'app' (default)  jungle top bar, phone tab bar, desktop footer
    'studio'         no global nav; the studio view renders its own bar
    'print'          no global nav; print views render a slim data-print-hide toolbar
  The design-system page draws its own full-bleed chrome.
-->
<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { RouterView, useRoute, useRouter } from 'vue-router'
import { UiToast, restoreMotionPreference } from './components/ui/index.js'
import AppTopBar from './components/layout/AppTopBar.vue'
import AppTabBar from './components/layout/AppTabBar.vue'
import AppFooter from './components/layout/AppFooter.vue'
import { useAppData } from './components/layout/useAppData.js'
import { pageTitle } from './components/layout/usePageTitle.js'

const route = useRoute()
const router = useRouter()
const data = useAppData()

// Kick off data loading during setup so views mount straight into their loading state.
data.load()

const chrome = computed(() => {
  if (route.name === 'design-system') return 'bare'
  return route.meta.chrome ?? 'app'
})
const showNav = computed(() => chrome.value === 'app')

// ── Route announcements + focus management ──────────────────────────────
const announcement = ref('')
let firstNavigation = true
router.beforeEach((to, from) => {
  if (to.path !== from.path) pageTitle.value = ''
})
router.afterEach((to, from) => {
  if (firstNavigation) { firstNavigation = false; return }
  if (to.path === from.path) return
  // Give the view a tick (and a possible title override) before announcing.
  setTimeout(() => { announcement.value = pageTitle.value || to.meta.title || 'Dino Selector' }, 350)
})

function focusHeading() {
  const h1 = document.querySelector('#main h1')
  if (h1) {
    if (!h1.hasAttribute('tabindex')) h1.setAttribute('tabindex', '-1')
    h1.focus({ preventScroll: true })
  }
}
function onAfterEnter() {
  if (firstPaint) { firstPaint = false; return }
  nextTick(focusHeading)
}
let firstPaint = true

function skipToContent() {
  const main = document.getElementById('main')
  const h1 = main?.querySelector('h1')
  ;(h1 ?? main)?.focus()
}

onMounted(() => {
  restoreMotionPreference()
})

// Retry quietly when the tab regains connectivity after a failed load.
watch(() => data.state.status, (s) => {
  if (s === 'error') window.addEventListener('online', () => data.retry(), { once: true })
})
</script>

<template>
  <div :class="['min-h-dvh flex flex-col bg-bg text-ink font-sans', showNav ? 'has-tabbar' : '']">
    <button type="button" class="skip-link" data-print-hide @click="skipToContent">Skip to content</button>

    <AppTopBar v-if="showNav" />

    <main id="main" tabindex="-1" class="flex-1 outline-none">
      <RouterView v-slot="{ Component, route: r }">
        <Transition name="page" mode="out-in" @after-enter="onAfterEnter">
          <!-- Wrapper so views with fragment roots still transition -->
          <div :key="r.path" class="route-view"><component :is="Component" /></div>
        </Transition>
      </RouterView>
    </main>

    <AppFooter v-if="showNav" />
    <AppTabBar v-if="showNav" />

    <div class="sr-only" aria-live="polite" aria-atomic="true">{{ announcement }}</div>
    <UiToast />
  </div>
</template>

<style>
.skip-link {
  position: fixed;
  left: 12px;
  top: 10px;
  z-index: 90;
  padding: 0.6rem 1rem;
  border-radius: 999px;
  background: rgb(var(--c-primary));
  color: rgb(var(--c-on-primary));
  border: 1.5px solid rgb(30 36 32);
  font-weight: 700;
  transform: translateY(-160%);
  transition: transform var(--dur-fast) var(--ease-out);
}
.skip-link:focus-visible { transform: none; }

/* Room for the fixed phone tab bar */
@media (max-width: 767.98px) {
  .has-tabbar main { padding-bottom: calc(var(--tabbar-h) + env(safe-area-inset-bottom) + 24px); }
}

.page-enter-active { transition: opacity var(--dur-base) var(--ease-out), transform var(--dur-base) var(--ease-out); }
.page-leave-active { transition: opacity var(--dur-fast) ease-in; }
.page-enter-from { opacity: 0; transform: translateY(6px); }
.page-leave-to { opacity: 0; }
</style>
