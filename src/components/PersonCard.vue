<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useDinoStore } from '../stores/dinoStore.js'
import AvatarFallback from './AvatarFallback.vue'

const props = defineProps({
  person: { type: Object, required: true },
})

const router = useRouter()
const dinoStore = useDinoStore()

const imgError = ref(false)

const dino = computed(() => {
  if (!props.person.dinoName) return null
  return dinoStore.getDinoByName(props.person.dinoName)
})

const DIET_CONFIG = {
  herbivore: { emoji: '🌿', classes: 'diet-badge-herbivore' },
  carnivore: { emoji: '🥩', classes: 'diet-badge-carnivore' },
  omnivore:  { emoji: '🍽️', classes: 'diet-badge-omnivore' },
}
</script>

<template>
  <article
    class="relative rounded-xl bg-earth-800 border border-earth-700 hover:border-amber-700 card-hover cursor-pointer overflow-hidden"
    :aria-label="`${person.name}${dino ? `, assigned ${dino.name}` : ''}`"
    @click="router.push(`/person/${person.id}`)"
  >
    <!-- Edit button (pencil icon) -->
    <button
      class="absolute top-2 right-2 z-10 w-8 h-8 rounded-full bg-earth-900/80 hover:bg-amber-600 flex items-center justify-center transition-colors"
      aria-label="Edit person"
      @click.stop="router.push(`/person/${person.id}/edit`)"
    >
      <svg class="w-4 h-4 text-fossil-200" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-1.414.586H9v-2a2 2 0 01.586-1.414z" />
      </svg>
    </button>

    <div class="p-4 flex flex-col items-center text-center gap-3">
      <!-- Avatar -->
      <div class="shrink-0">
        <img
          v-if="person.photoUrl && !imgError"
          :src="person.photoUrl"
          :alt="person.name"
          class="w-16 h-16 rounded-full object-cover border-2 border-earth-600"
          loading="lazy"
          @error="imgError = true"
        />
        <AvatarFallback v-else :name="person.name" size="lg" />
      </div>

      <!-- Name -->
      <h3 class="font-display text-fossil-50 font-semibold text-base leading-tight line-clamp-2">
        {{ person.name }}
      </h3>

      <!-- Dino assignment -->
      <div v-if="dino" class="w-full space-y-2">
        <div class="flex items-center gap-2 justify-center min-w-0">
          <img
            v-if="dino.image"
            :src="dino.image"
            :alt="dino.name"
            class="w-8 h-8 rounded-full object-cover border border-earth-600 shrink-0"
          />
          <div class="min-w-0">
            <p class="text-xs text-fossil-200 capitalize truncate">{{ dino.name }}</p>
            <span
              v-if="dino.diet"
              :class="['text-xs px-1.5 py-0.5 rounded font-medium', (DIET_CONFIG[dino.diet?.toLowerCase()] ?? {}).classes]"
            >
              {{ DIET_CONFIG[dino.diet?.toLowerCase()]?.emoji ?? '' }} {{ dino.diet }}
            </span>
          </div>
        </div>
        <p v-if="dino.description" class="text-xs text-earth-500 leading-relaxed line-clamp-2 text-left">
          {{ dino.description }}
        </p>
      </div>
      <p v-else class="text-xs text-earth-600 italic">No dino yet</p>
    </div>
  </article>
</template>
