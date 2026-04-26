<script setup>
import { onMounted } from 'vue'
import { RouterView, RouterLink, useRoute } from 'vue-router'
import { useDinoStore } from './stores/dinoStore.js'
import { usePersonStore } from './stores/personStore.js'

const dinoStore = useDinoStore()
const personStore = usePersonStore()
const route = useRoute()

onMounted(() => {
  dinoStore.fetchDinos()
  personStore.fetchPersons()
})
</script>

<template>
  <div class="min-h-screen bg-earth-950 text-fossil-50 font-body">
    <!-- Top nav -->
    <header class="sticky top-0 z-40 bg-earth-900/90 backdrop-blur border-b border-earth-700">
      <nav class="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <RouterLink
          to="/"
          class="font-display text-xl text-amber-500 hover:text-amber-400 transition-colors"
          aria-label="Dino Selector — home"
        >
          🦕 Dino Selector
        </RouterLink>

        <div class="flex items-center gap-4">
          <RouterLink
            to="/"
            class="text-sm text-fossil-200 hover:text-fossil-50 transition-colors"
            :class="{ 'text-amber-400 font-semibold': route.path === '/' }"
            aria-label="Roster"
          >
            Roster
          </RouterLink>
          <RouterLink
            to="/quiz"
            class="text-sm text-fossil-200 hover:text-fossil-50 transition-colors"
            :class="{ 'text-amber-400 font-semibold': route.path === '/quiz' }"
            aria-label="Take the dino quiz"
          >
            Quiz
          </RouterLink>
          <RouterLink
            to="/add"
            class="px-3 py-1.5 rounded-md bg-amber-600 hover:bg-amber-500 text-earth-950 text-sm font-semibold transition-colors"
            aria-label="Add a new person"
          >
            + Add Person
          </RouterLink>
        </div>
      </nav>
    </header>

    <!-- First-run seeding banner -->
    <div
      v-if="dinoStore.seeding && dinoStore.dinos.length === 0"
      role="status"
      class="bg-amber-950 border-b border-amber-800 px-4 py-3 text-center text-sm text-amber-300"
    >
      🦕 Building dinosaur database for the first time — this takes about a minute. Refresh when ready.
    </div>

    <!-- Error banner for API failure -->
    <div
      v-else-if="dinoStore.error"
      role="alert"
      class="bg-red-950 border-b border-red-800 px-4 py-3 text-center text-sm text-red-300"
    >
      🦴 The dinosaurs are hiding — API unavailable.
      <button
        class="ml-3 underline hover:text-red-100 transition-colors"
        aria-label="Retry loading dinosaurs"
        @click="dinoStore.fetchDinos(true)"
      >
        Retry
      </button>
    </div>

    <main class="max-w-5xl mx-auto px-4 py-6">
      <RouterView v-slot="{ Component }">
        <Transition name="fade" mode="out-in">
          <component :is="Component" />
        </Transition>
      </RouterView>
    </main>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
