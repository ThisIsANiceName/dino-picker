<script setup>
import { useRouter } from 'vue-router'
import { usePersonStore } from '../stores/personStore.js'
import PersonCard from '../components/PersonCard.vue'

const personStore = usePersonStore()
const router = useRouter()
</script>

<template>
  <div>
    <!-- Header row -->
    <div class="flex items-center justify-between mb-6">
      <h1 class="font-display text-2xl text-fossil-50">Roster</h1>
      <RouterLink
        to="/add"
        class="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-earth-950 text-sm font-semibold transition-colors"
        aria-label="Add a new person"
      >
        + Add Person
      </RouterLink>
    </div>

    <!-- Empty state -->
    <div v-if="personStore.persons.length === 0" class="flex flex-col items-center justify-center py-24 gap-4 text-center">
      <span class="text-7xl select-none" aria-hidden="true">🦕</span>
      <h2 class="font-display text-fossil-50 text-xl">No explorers yet</h2>
      <p class="text-earth-600 text-sm max-w-xs">
        Add your first person and assign them their spirit dinosaur.
      </p>
      <RouterLink
        to="/add"
        class="mt-2 px-5 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-earth-950 font-semibold transition-colors"
      >
        + Add Your First Person
      </RouterLink>
    </div>

    <!-- Roster grid -->
    <div v-else class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      <PersonCard
        v-for="person in personStore.persons"
        :key="person.id"
        :person="person"
      />
    </div>
  </div>
</template>
