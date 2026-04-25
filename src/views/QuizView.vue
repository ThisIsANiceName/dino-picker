<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { usePersonStore } from '../stores/personStore.js'
import QuizQuestion from '../components/QuizQuestion.vue'
import AvatarFallback from '../components/AvatarFallback.vue'
import { useQuiz } from '../composables/useDinoQuiz.js'

const router = useRouter()
const personStore = usePersonStore()

const { questions, computeResult } = useQuiz()

const currentIndex = ref(0)
const answers = ref([])
const result = ref(null)
const assignTarget = ref('')
const assignSuccess = ref(false)

const currentQuestion = computed(() => questions[currentIndex.value])

function onAnswer(option) {
  answers.value.push(option)
  if (currentIndex.value < questions.length - 1) {
    currentIndex.value++
  } else {
    result.value = computeResult(answers.value)
  }
}

function retake() {
  currentIndex.value = 0
  answers.value = []
  result.value = null
  assignTarget.value = ''
  assignSuccess.value = false
}

function assignToMe() {
  if (!assignTarget.value || !result.value) return
  personStore.assignDino(assignTarget.value, result.value.name)
  assignSuccess.value = true
}

const FALLBACK_SVG = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 200 200'%3E%3Crect width='200' height='200' fill='%233d2c14'/%3E%3Ctext x='50%25' y='55%25' dominant-baseline='middle' text-anchor='middle' font-size='100'%3E🦕%3C/text%3E%3C/svg%3E`
const imgError = ref(false)
</script>

<template>
  <div class="max-w-2xl mx-auto">
    <!-- Quiz in progress -->
    <Transition name="slide" mode="out-in">
      <div v-if="!result" :key="currentIndex">
        <QuizQuestion
          :question="currentQuestion"
          :index="currentIndex"
          :total="questions.length"
          @answer="onAnswer"
        />
      </div>

      <!-- Result screen -->
      <div v-else key="result" class="space-y-6 text-center">
        <h1 class="font-display text-3xl text-fossil-50 leading-snug">
          Your spirit dinosaur is…
          <span class="text-amber-400 capitalize block">{{ result.name }}!</span>
        </h1>

        <!-- Dino image -->
        <div class="rounded-2xl overflow-hidden bg-earth-800 border border-earth-700 aspect-video max-w-md mx-auto">
          <img
            v-if="result.image && !imgError"
            :src="result.image"
            :alt="result.name"
            class="w-full h-full object-cover"
            @error="imgError = true"
          />
          <img v-else :src="FALLBACK_SVG" :alt="result.name" class="w-full h-full object-contain p-8 opacity-30" />
        </div>

        <!-- Stats ribbon -->
        <div class="flex flex-wrap justify-center gap-3 text-sm">
          <span v-if="result.diet" class="px-3 py-1 rounded-full bg-earth-800 border border-earth-600 capitalize">{{ result.diet }}</span>
          <span v-if="result.period" class="px-3 py-1 rounded-full bg-earth-800 border border-earth-600 capitalize">{{ result.period }}</span>
          <span v-if="result.region" class="px-3 py-1 rounded-full bg-earth-800 border border-earth-600 capitalize">{{ result.region }}</span>
        </div>

        <!-- Description excerpt -->
        <p v-if="result.description" class="text-fossil-200 text-sm leading-relaxed max-w-lg mx-auto line-clamp-4">
          {{ result.description }}
        </p>

        <!-- Assign to person -->
        <div class="bg-earth-800 border border-earth-700 rounded-xl p-4 max-w-sm mx-auto space-y-3 text-left">
          <label for="assign-person" class="block text-sm text-fossil-200 font-medium">Assign to a person</label>
          <div v-if="assignSuccess" class="text-sm text-green-400" role="status">
            ✓ Assigned to {{ personStore.persons.find(p => p.id === assignTarget)?.name }}!
          </div>
          <div v-else class="flex gap-2">
            <select
              id="assign-person"
              v-model="assignTarget"
              class="flex-1 bg-earth-900 border border-earth-600 rounded-lg px-3 py-2 text-sm text-fossil-50 focus:outline-none focus:border-amber-500"
              aria-label="Select person to assign dino to"
            >
              <option value="" disabled>Select person…</option>
              <option v-for="p in personStore.persons" :key="p.id" :value="p.id">{{ p.name }}</option>
            </select>
            <button
              class="px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-earth-950 text-sm font-semibold transition-colors disabled:opacity-40"
              :disabled="!assignTarget"
              aria-label="Assign dino to selected person"
              @click="assignToMe"
            >
              Assign
            </button>
          </div>
        </div>

        <!-- CTAs -->
        <div class="flex flex-wrap justify-center gap-3 pt-2">
          <button
            class="px-5 py-2.5 rounded-lg bg-earth-800 border border-earth-600 hover:border-amber-500 text-fossil-200 text-sm font-medium transition-colors"
            @click="retake"
          >
            Retake Quiz
          </button>
          <RouterLink
            to="/"
            class="px-5 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-earth-950 text-sm font-semibold transition-colors"
          >
            Back to Roster
          </RouterLink>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.slide-enter-active,
.slide-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.slide-enter-from {
  opacity: 0;
  transform: translateX(30px);
}
.slide-leave-to {
  opacity: 0;
  transform: translateX(-30px);
}
</style>
