<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { usePersonStore } from '../stores/personStore.js'
import { useDinoStore } from '../stores/dinoStore.js'
import AvatarFallback from '../components/AvatarFallback.vue'
import DinoSearch from '../components/DinoSearch.vue'

const route = useRoute()
const router = useRouter()
const personStore = usePersonStore()
const dinoStore = useDinoStore()

const person = computed(() => personStore.getPersonById(route.params.id))

const name = ref('')
const photoUrl = ref('')
const selectedDinoName = ref(null)
const photoError = ref(false)
const pickerOpen = ref(false)
const errors = ref({})

onMounted(() => {
  if (!person.value) { router.replace('/'); return }
  name.value = person.value.name
  photoUrl.value = person.value.photoUrl ?? ''
  selectedDinoName.value = person.value.dinoName ?? null
})

const selectedDino = computed(() =>
  selectedDinoName.value ? dinoStore.getDinoByName(selectedDinoName.value) : null
)

function validate() {
  errors.value = {}
  if (!name.value.trim()) errors.value.name = 'Name is required.'
  if (name.value.trim().length > 50) errors.value.name = 'Name must be 50 characters or fewer.'
  return Object.keys(errors.value).length === 0
}

function save() {
  if (!validate()) return
  personStore.updatePerson(person.value.id, {
    name: name.value.trim(),
    photoUrl: photoUrl.value.trim(),
    dinoName: selectedDinoName.value,
  })
  router.push(`/person/${person.value.id}`)
}

function removePerson() {
  if (!confirm(`Remove ${person.value?.name} from the roster?`)) return
  personStore.removePerson(person.value.id)
  router.push('/')
}
</script>

<template>
  <div v-if="person" class="max-w-lg mx-auto space-y-6">
    <h1 class="font-display text-2xl text-fossil-50">Edit Person</h1>

    <form class="space-y-5" novalidate @submit.prevent="save">
      <!-- Name -->
      <div class="space-y-1">
        <label for="edit-name" class="block text-sm text-fossil-200 font-medium">
          Name <span class="text-red-400" aria-hidden="true">*</span>
        </label>
        <input
          id="edit-name"
          v-model="name"
          type="text"
          maxlength="50"
          class="w-full bg-earth-800 border rounded-lg px-3 py-2 text-sm text-fossil-50 focus:outline-none focus:border-amber-500"
          :class="errors.name ? 'border-red-500' : 'border-earth-600'"
          aria-required="true"
        />
        <p v-if="errors.name" class="text-xs text-red-400" role="alert">{{ errors.name }}</p>
      </div>

      <!-- Photo URL -->
      <div class="space-y-1">
        <label for="edit-photo" class="block text-sm text-fossil-200 font-medium">Photo URL</label>
        <input
          id="edit-photo"
          v-model="photoUrl"
          type="url"
          placeholder="https://example.com/photo.jpg"
          class="w-full bg-earth-800 border border-earth-600 rounded-lg px-3 py-2 text-sm text-fossil-50 placeholder-earth-600 focus:outline-none focus:border-amber-500"
          @input="photoError = false"
        />
        <div class="flex items-center gap-3 pt-1">
          <img
            v-if="photoUrl && !photoError"
            :src="photoUrl"
            alt="Photo preview"
            class="w-12 h-12 rounded-full object-cover border-2 border-earth-600"
            @error="photoError = true"
          />
          <AvatarFallback v-else :name="name" size="md" />
          <span class="text-xs text-earth-600">{{ photoUrl && !photoError ? 'Preview' : 'Initials fallback' }}</span>
        </div>
      </div>

      <!-- Dino picker -->
      <div class="space-y-1">
        <span class="block text-sm text-fossil-200 font-medium">Dinosaur</span>
        <div class="flex items-center gap-3">
          <div v-if="selectedDino" class="flex items-center gap-2 px-3 py-2 bg-earth-800 border border-amber-600 rounded-lg flex-1 min-w-0">
            <img
              v-if="selectedDino.image"
              :src="selectedDino.image"
              :alt="selectedDino.name"
              class="w-8 h-8 rounded-full object-cover shrink-0"
            />
            <span class="text-sm text-fossil-50 capitalize truncate">{{ selectedDino.name }}</span>
            <button
              type="button"
              class="ml-auto text-earth-600 hover:text-red-400 transition-colors shrink-0"
              aria-label="Remove dinosaur selection"
              @click="selectedDinoName = null"
            >✕</button>
          </div>
          <button
            type="button"
            class="flex-1 px-3 py-2 bg-earth-800 border border-earth-600 hover:border-amber-500 rounded-lg text-sm text-earth-500 hover:text-fossil-200 transition-colors"
            aria-label="Open dinosaur picker"
            @click="pickerOpen = true"
          >
            {{ selectedDino ? 'Change Dino' : '🦕 Pick a Dinosaur…' }}
          </button>
        </div>
        <p v-if="selectedDino?.description" class="text-xs text-earth-500 leading-relaxed line-clamp-3 pt-1">
          {{ selectedDino.description }}
        </p>
      </div>

      <!-- Actions -->
      <div class="flex gap-3 pt-2">
        <button
          type="submit"
          class="flex-1 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-earth-950 font-semibold transition-colors"
        >
          Save Changes
        </button>
        <RouterLink
          :to="`/person/${person.id}`"
          class="flex-1 py-2.5 rounded-lg bg-earth-800 border border-earth-600 hover:border-earth-500 text-fossil-200 font-medium text-center transition-colors"
        >
          Cancel
        </RouterLink>
      </div>
    </form>

    <!-- Danger zone -->
    <div class="pt-4 border-t border-earth-800">
      <button
        type="button"
        class="text-xs text-red-600 hover:text-red-400 underline transition-colors"
        @click="removePerson"
      >
        Remove this person from the roster
      </button>
    </div>

    <DinoSearch
      v-model="selectedDinoName"
      :open="pickerOpen"
      @close="pickerOpen = false"
    />
  </div>
</template>
