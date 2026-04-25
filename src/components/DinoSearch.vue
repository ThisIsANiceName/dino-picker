<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useDinoStore } from '../stores/dinoStore.js'
import DinoCard from './DinoCard.vue'

const props = defineProps({
  modelValue: { type: String, default: null }, // currently selected dino name
  open: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'close'])

const dinoStore = useDinoStore()

const query = ref('')
const dietFilter = ref('')
const periodFilter = ref('')
const drawerRef = ref(null)
const searchInputRef = ref(null)

const DIET_OPTIONS = ['', 'herbivore', 'carnivore', 'omnivore']
const PERIOD_OPTIONS = ['', 'triassic', 'jurassic', 'cretaceous']

const results = computed(() => {
  const q = query.value.trim().toLowerCase()
  return dinoStore.dinos.filter((d) => {
    const matchesQuery = !q || d.name.includes(q)
    const matchesDiet = !dietFilter.value || d.diet === dietFilter.value
    const matchesPeriod = !periodFilter.value || d.period === periodFilter.value
    return matchesQuery && matchesDiet && matchesPeriod
  })
})

function selectDino(dino) {
  emit('update:modelValue', dino.name)
  emit('close')
}

function close() {
  emit('close')
}

// Focus trap + keyboard close
function onKeydown(e) {
  if (e.key === 'Escape') close()
}

watch(
  () => props.open,
  async (isOpen) => {
    if (isOpen) {
      await nextTick()
      searchInputRef.value?.focus()
    }
  }
)

onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Teleport to="body">
    <Transition name="drawer">
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
        role="dialog"
        aria-modal="true"
        aria-label="Dinosaur picker"
      >
        <!-- Backdrop -->
        <div
          class="absolute inset-0 bg-black/60 backdrop-blur-sm"
          aria-hidden="true"
          @click="close"
        />

        <!-- Drawer / modal panel -->
        <div
          ref="drawerRef"
          class="relative z-10 w-full sm:max-w-2xl bg-earth-900 border border-earth-700 rounded-t-2xl sm:rounded-2xl flex flex-col max-h-[90vh]"
        >
          <!-- Header -->
          <div class="flex items-center justify-between px-4 pt-4 pb-2 border-b border-earth-700 shrink-0">
            <h2 class="font-display text-fossil-50 text-lg">Pick a Dinosaur</h2>
            <button
              class="w-8 h-8 rounded-full hover:bg-earth-700 flex items-center justify-center transition-colors text-fossil-200"
              aria-label="Close picker"
              @click="close"
            >
              ✕
            </button>
          </div>

          <!-- Search + filters -->
          <div class="px-4 py-3 space-y-2 shrink-0 border-b border-earth-700">
            <input
              ref="searchInputRef"
              v-model="query"
              type="search"
              placeholder="Search dinosaurs…"
              class="w-full bg-earth-800 border border-earth-600 rounded-lg px-3 py-2 text-sm text-fossil-50 placeholder-earth-600 focus:outline-none focus:border-amber-500"
              aria-label="Search dinosaurs"
            />

            <div class="flex flex-wrap gap-2">
              <!-- Diet filter -->
              <div class="flex items-center gap-1">
                <span class="text-xs text-earth-600 shrink-0">Diet:</span>
                <button
                  v-for="d in DIET_OPTIONS"
                  :key="`diet-${d}`"
                  :class="[
                    'text-xs px-2 py-0.5 rounded-full border transition-colors capitalize',
                    dietFilter === d
                      ? 'bg-amber-600 border-amber-500 text-earth-950 font-semibold'
                      : 'border-earth-600 text-earth-400 hover:border-amber-600',
                  ]"
                  :aria-pressed="dietFilter === d"
                  :aria-label="d ? `Filter by ${d}` : 'All diets'"
                  @click="dietFilter = d"
                >
                  {{ d || 'All' }}
                </button>
              </div>

              <!-- Period filter -->
              <div class="flex items-center gap-1">
                <span class="text-xs text-earth-600 shrink-0">Period:</span>
                <button
                  v-for="p in PERIOD_OPTIONS"
                  :key="`period-${p}`"
                  :class="[
                    'text-xs px-2 py-0.5 rounded-full border transition-colors capitalize',
                    periodFilter === p
                      ? 'bg-amber-600 border-amber-500 text-earth-950 font-semibold'
                      : 'border-earth-600 text-earth-400 hover:border-amber-600',
                  ]"
                  :aria-pressed="periodFilter === p"
                  :aria-label="p ? `Filter by ${p}` : 'All periods'"
                  @click="periodFilter = p"
                >
                  {{ p || 'All' }}
                </button>
              </div>
            </div>
          </div>

          <!-- Results grid -->
          <div class="overflow-y-auto p-4 flex-1">
            <!-- Loading -->
            <div v-if="dinoStore.loading" class="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div
                v-for="n in 6"
                :key="n"
                class="rounded-xl bg-earth-800 animate-pulse aspect-video"
              />
            </div>

            <!-- Empty -->
            <p v-else-if="results.length === 0" class="text-center text-earth-600 py-8 text-sm">
              No dinosaurs match your search.
            </p>

            <!-- Grid -->
            <div v-else class="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <DinoCard
                v-for="dino in results"
                :key="dino._id ?? dino.name"
                :dino="dino"
                :selected="modelValue === dino.name"
                :clickable="true"
                @select="selectDino"
              />
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.drawer-enter-active,
.drawer-leave-active {
  transition: opacity 0.2s ease;
}
.drawer-enter-active .relative,
.drawer-leave-active .relative {
  transition: transform 0.25s ease;
}
.drawer-enter-from,
.drawer-leave-to {
  opacity: 0;
}
@media (max-width: 639px) {
  .drawer-enter-from .relative,
  .drawer-leave-to .relative {
    transform: translateY(100%);
  }
}
</style>
