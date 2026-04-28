<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePersonStore } from '../stores/personStore.js'
import { useDinoStore } from '../stores/dinoStore.js'
import AvatarFallback from '../components/AvatarFallback.vue'
import DinoSearch from '../components/DinoSearch.vue'
import AddDinoForm from '../components/AddDinoForm.vue'

const route = useRoute()
const router = useRouter()
const personStore = usePersonStore()
const dinoStore = useDinoStore()

const person = computed(() => personStore.getPersonById(route.params.id))
const dino = computed(() => person.value?.dinoName ? dinoStore.getDinoByName(person.value.dinoName) : null)

const photoError = ref(false)
const dinoImgError = ref(false)
const pickerOpen = ref(false)
const pickerValue = ref(null)
const showEditDino = ref(false)

function openPicker() {
  pickerValue.value = person.value?.dinoName ?? null
  pickerOpen.value = true
}

function onDinoPicked(dinoName) {
  if (person.value) {
    personStore.assignDino(person.value.id, dinoName)
  }
}

const DIET_CONFIG = {
  herbivore: { label: '🌿 Herbivore', classes: 'diet-badge-herbivore' },
  carnivore: { label: '🥩 Carnivore', classes: 'diet-badge-carnivore' },
  omnivore:  { label: '🍽️ Omnivore',  classes: 'diet-badge-omnivore' },
}

const FALLBACK_SVG = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'%3E%3Crect width='200' height='200' fill='%233d2c14'/%3E%3Ctext x='50%25' y='55%25' dominant-baseline='middle' text-anchor='middle' font-size='100'%3E🦕%3C/text%3E%3C/svg%3E`
</script>

<template>
  <div v-if="person" class="max-w-2xl mx-auto space-y-8">
    <!-- Person hero -->
    <div class="flex items-center gap-5">
      <img
        v-if="person.photoUrl && !photoError"
        :src="person.photoUrl"
        :alt="person.name"
        class="w-20 h-20 rounded-full object-cover border-2 border-earth-600 shrink-0"
        @error="photoError = true"
      />
      <AvatarFallback v-else :name="person.name" size="lg" />

      <div class="min-w-0">
        <h1 class="font-display text-3xl text-fossil-50 leading-tight truncate">{{ person.name }}</h1>
        <p v-if="dino" class="text-sm text-earth-600 capitalize mt-0.5">Spirit dino: {{ dino.name }}</p>
        <p v-else class="text-sm text-earth-600 italic mt-0.5">No dino assigned yet</p>
      </div>
    </div>

    <!-- Action buttons -->
    <div class="flex gap-3">
      <button
        class="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-earth-950 text-sm font-semibold transition-colors"
        aria-label="Change dinosaur"
        @click="openPicker"
      >
        {{ dino ? 'Change Dino' : '🦕 Pick a Dino' }}
      </button>
      <button
        v-if="dino"
        class="px-4 py-2 rounded-lg bg-earth-800 border border-earth-600 hover:border-amber-500 text-fossil-200 text-sm font-medium transition-colors"
        :aria-label="`Edit ${dino.name}`"
        @click="showEditDino = true"
      >
        Edit Dino
      </button>
      <RouterLink
        :to="`/person/${person.id}/edit`"
        class="px-4 py-2 rounded-lg bg-earth-800 border border-earth-600 hover:border-amber-500 text-fossil-200 text-sm font-medium transition-colors"
      >
        Edit Profile
      </RouterLink>
      <RouterLink
        to="/"
        class="ml-auto px-4 py-2 rounded-lg bg-earth-800 border border-earth-600 hover:border-earth-500 text-fossil-200 text-sm font-medium transition-colors"
      >
        ← Roster
      </RouterLink>
    </div>

    <!-- Dino info card -->
    <div v-if="dino" class="rounded-2xl bg-earth-800 border border-earth-700 overflow-hidden">
      <!-- Dino image -->
      <div class="aspect-video bg-earth-900">
        <img
          v-if="!dinoImgError"
          :src="dino.image"
          :alt="dino.name"
          class="w-full h-full object-cover"
          @error="dinoImgError = true"
        />
        <img
          v-else
          :src="FALLBACK_SVG"
          :alt="`${dino.name} silhouette`"
          class="w-full h-full object-contain p-8 opacity-30"
        />
      </div>

      <div class="p-5 space-y-4">
        <!-- Name + badges -->
        <div class="flex flex-wrap items-center gap-2">
          <h2 class="font-display text-2xl text-fossil-50 capitalize">{{ dino.name }}</h2>
          <a
            v-if="dino.wikipediaUrl"
            :href="dino.wikipediaUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex items-center gap-1 text-xs text-earth-500 hover:text-amber-400 transition-colors border border-earth-600 hover:border-amber-600 rounded px-1.5 py-0.5"
            :aria-label="`Read about ${dino.name} on Wikipedia`"
          >
            <svg class="w-3 h-3" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 18a8 8 0 110-16 8 8 0 010 16zm-1-11h2v6h-2zm0-3h2v2h-2z"/>
            </svg>
            Wikipedia
          </a>
          <span
            v-if="dino.diet"
            :class="['text-xs px-2 py-0.5 rounded font-medium', (DIET_CONFIG[dino.diet?.toLowerCase()] ?? {}).classes]"
          >
            {{ DIET_CONFIG[dino.diet?.toLowerCase()]?.label ?? dino.diet }}
          </span>
          <span v-if="dino.period" class="text-xs px-2 py-0.5 rounded font-medium period-badge capitalize">
            {{ dino.period }}
          </span>
        </div>

        <!-- Stats ribbon -->
        <dl class="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div v-if="dino.region" class="space-y-0.5">
            <dt class="text-xs text-earth-600 uppercase tracking-wide">Region</dt>
            <dd class="text-sm text-fossil-100 capitalize">{{ dino.region }}</dd>
          </div>
          <div v-if="dino.weight" class="space-y-0.5">
            <dt class="text-xs text-earth-600 uppercase tracking-wide">Weight</dt>
            <dd class="text-sm text-fossil-100">{{ dino.weight }}</dd>
          </div>
          <div v-if="dino.length" class="space-y-0.5">
            <dt class="text-xs text-earth-600 uppercase tracking-wide">Length</dt>
            <dd class="text-sm text-fossil-100">{{ dino.length }}</dd>
          </div>
          <div v-if="dino.existed" class="space-y-0.5 col-span-2 sm:col-span-3">
            <dt class="text-xs text-earth-600 uppercase tracking-wide">Existed</dt>
            <dd class="text-sm text-fossil-100">{{ dino.existed }}</dd>
          </div>
        </dl>

        <!-- Description -->
        <p v-if="dino.description" class="text-sm text-fossil-200 leading-relaxed">
          {{ dino.description }}
        </p>
      </div>
    </div>

    <!-- No dino placeholder -->
    <div v-else class="rounded-2xl bg-earth-800 border border-dashed border-earth-700 p-10 text-center space-y-3">
      <span class="text-5xl" aria-hidden="true">🦴</span>
      <p class="text-earth-600 text-sm">No dinosaur assigned yet.</p>
      <button
        class="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-earth-950 text-sm font-semibold transition-colors"
        @click="openPicker"
      >
        Pick a Dinosaur
      </button>
    </div>

    <DinoSearch
      v-model="pickerValue"
      :open="pickerOpen"
      @close="pickerOpen = false"
      @update:modelValue="onDinoPicked"
    />

    <!-- Edit dino modal -->
    <Teleport v-if="dino && showEditDino" to="body">
      <div
        class="fixed inset-0 z-50 flex items-center justify-center"
        role="dialog"
        aria-modal="true"
        :aria-label="`Edit ${dino.name}`"
      >
        <div
          class="absolute inset-0 bg-black/60 backdrop-blur-sm"
          aria-hidden="true"
          @click="showEditDino = false"
        />
        <div class="relative z-10 w-full max-w-md mx-4 bg-earth-900 border border-earth-700 rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
          <AddDinoForm
            :dino="dino"
            @saved="showEditDino = false"
            @cancel="showEditDino = false"
          />
        </div>
      </div>
    </Teleport>
  </div>

  <!-- Person not found -->
  <div v-else class="text-center py-24 space-y-4">
    <p class="text-earth-600">Person not found.</p>
    <RouterLink to="/" class="text-amber-500 hover:text-amber-400 underline text-sm">Back to Roster</RouterLink>
  </div>
</template>
