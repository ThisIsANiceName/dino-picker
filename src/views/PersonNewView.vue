<!-- PersonNewView: name first, then take the quiz or pick a dino. -->
<script setup>
import { safeSession } from '../lib/safeStorage.js'
import { computed, nextTick, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { UiButton, UiCard, UiField, UiIcon, UiInput, UiSkeleton } from '../components/ui/index.js'
import DinoPicker from '../components/person/DinoPicker.vue'
import DinoIllustration from '../components/dinopedia/DinoIllustration.vue'
import ErrorState from '../components/layout/ErrorState.vue'
import { SPOTS } from '../components/layout/spots.js'
import { useAppData } from '../components/layout/useAppData.js'
import { markAdded } from '../components/team/recent.js'
import { dinoName, firstName } from '../components/dinopedia/dinoUtils.js'
import { usePersonStore } from '../stores/personStore.js'
import { useToast } from '../composables/useToast.js'

const route = useRoute()
const router = useRouter()
const personStore = usePersonStore()
const data = useAppData()
const toast = useToast()

const name = ref(safeSession.get('dino:new-name') ?? '')
const nameError = ref('')
const picked = ref(typeof route.query.dino === 'string' ? route.query.dino : '')
const saving = ref(false)
const nameInput = ref(null)

const step = computed(() => {
  const s = route.query.step
  if (!name.value.trim()) return 'name'
  return s === 'choose' || s === 'pick' ? s : 'name'
})
const first = computed(() => firstName(name.value) || 'them')
const pickedDino = computed(() => data.dinoFor(picked.value))

watch(name, (v) => safeSession.set('dino:new-name', v))

function go(s) {
  router.push({ query: { ...route.query, step: s } })
}
function submitName() {
  const n = name.value.trim()
  if (!n) { nameError.value = 'Add a name first.'; nextTick(() => nameInput.value?.focus()); return }
  if (n.length > 50) { nameError.value = 'Keep it under 50 characters.'; return }
  nameError.value = ''
  go(picked.value ? 'pick' : 'choose')
}

async function create(dinoNameValue, then) {
  if (saving.value) return
  saving.value = true
  try {
    const p = await personStore.addPerson({ name: name.value.trim(), dinoName: dinoNameValue || null })
    safeSession.remove('dino:new-name')
    markAdded(p.id)
    toast.success(`Added ${firstName(p.name)}`, dinoNameValue ? `Welcome to the herd, ${dinoName(data.dinoFor(dinoNameValue)) || dinoNameValue}.` : '')
    if (then === 'quiz') router.push(`/quiz?for=${encodeURIComponent(p.id)}`)
    else if (then === 'team') router.push('/')
    else router.push(`/people/${p.id}`)
  } catch (err) {
    toast.error("Couldn't add teammate", err.message === 'Failed to fetch' ? "Couldn't reach the server. Try again." : err.message)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="mx-auto px-4 sm:px-6 pt-8 sm:pt-12" :class="step === 'pick' ? 'max-w-[1240px]' : 'max-w-[760px]'">
    <div v-if="data.loading.value" aria-busy="true" class="space-y-4">
      <h1 class="sr-only">Add teammate</h1>
      <UiSkeleton width="16rem" height="2.4rem" />
      <UiSkeleton shape="rect" height="160px" />
    </div>
    <ErrorState v-else-if="data.failed.value" @retry="data.retry()" />

    <!-- Step 1: name -->
    <section v-else-if="step === 'name'" class="max-w-[560px]">
      <p class="text-sm font-semibold text-ink-subtle">Step 1 of 2</p>
      <h1 tabindex="-1" class="mt-1 font-display text-display-md sm:text-display-lg">Who's joining the herd?</h1>
      <p class="mt-3 text-ink-muted">Start with a name. The dino comes next.</p>
      <form class="mt-8" novalidate @submit.prevent="submitName">
        <UiField label="Name" :error="nameError" :count="name.length" :max="50" required>
          <UiInput ref="nameInput" v-model="name" maxlength="50" placeholder="Like Mira Okafor" autocomplete="off" autofocus size="md" class="!text-lg !py-3" />
        </UiField>
        <div class="mt-6 flex flex-wrap items-center gap-3">
          <UiButton type="submit" size="lg" icon-right="arrow-right">Continue</UiButton>
          <UiButton variant="ghost" to="/">Cancel</UiButton>
        </div>
      </form>
    </section>

    <!-- Step 2: choose path -->
    <section v-else-if="step === 'choose'">
      <button type="button" class="inline-flex items-center gap-1 min-h-[44px] text-sm font-semibold text-ink-muted hover:text-ink" @click="go('name')">
        <UiIcon name="arrow-left" :size="16" /> Change name
      </button>
      <p class="mt-2 text-sm font-semibold text-ink-subtle">Step 2 of 2</p>
      <h1 tabindex="-1" class="mt-1 font-display text-display-md sm:text-display-lg break-words">Which dino is {{ first }}?</h1>
      <p class="mt-3 text-ink-muted">Let the quiz decide, or pick one straight away.</p>

      <div class="mt-8 grid sm:grid-cols-2 gap-5">
        <UiCard as="button" interactive padding="none" class="text-left w-full" :tilt="-1" :aria-disabled="saving" @click="create(null, 'quiz')">
          <div class="theme-jungle bg-bg rounded-t-[16px] border-b-[1.5px] border-ink p-5 grid place-items-center h-40">
            <img :src="SPOTS.quizHero" alt="" class="h-[120px] w-auto max-w-full object-contain" />
          </div>
          <div class="p-5">
            <h2 class="font-display text-display-xs">Take the quiz</h2>
            <p class="mt-1.5 text-ink-muted">12 questions, about 3 minutes. For fun, not science.</p>
            <p class="mt-4 inline-flex items-center gap-1.5 font-semibold">Start the quiz <UiIcon name="arrow-right" :size="16" /></p>
          </div>
        </UiCard>
        <UiCard as="button" interactive padding="none" class="text-left w-full" :tilt="1" @click="go('pick')">
          <div class="bg-specimen rounded-t-[16px] border-b-[1.5px] border-ink p-4 h-40 flex items-end justify-center gap-1 overflow-hidden" aria-hidden="true">
            <template v-for="n in ['triceratops', 'velociraptor', 'stegosaurus']" :key="n">
              <div v-if="data.dinoFor(n)" class="w-1/3 max-w-[120px]"><DinoIllustration :dino="data.dinoFor(n)" decorative /></div>
            </template>
          </div>
          <div class="p-5">
            <h2 class="font-display text-display-xs">Pick one myself</h2>
            <p class="mt-1.5 text-ink-muted">Browse {{ data.dinoIndex.value.size }} dinos, or add one that's missing.</p>
            <p class="mt-4 inline-flex items-center gap-1.5 font-semibold">Choose a dino <UiIcon name="arrow-right" :size="16" /></p>
          </div>
        </UiCard>
      </div>
      <p class="mt-8 text-sm text-ink-muted">
        Not sure yet? <button type="button" class="link font-semibold" :disabled="saving" @click="create(null, 'team')">Add {{ first }} without a dino</button>
      </p>
    </section>

    <!-- Step 2b: pick -->
    <section v-else class="pb-28">
      <button type="button" class="inline-flex items-center gap-1 min-h-[44px] text-sm font-semibold text-ink-muted hover:text-ink" @click="go('choose')">
        <UiIcon name="arrow-left" :size="16" /> Back
      </button>
      <h1 tabindex="-1" class="mt-1 font-display text-display-md break-words">Pick a dino for {{ first }}</h1>
      <p class="mt-2 mb-6 text-ink-muted">Tap one to choose it. You can always change it later.</p>
      <DinoPicker v-model="picked" autofocus />

      <div class="pick-bar fixed inset-x-0 z-[35] px-4 sm:px-6">
        <div class="mx-auto max-w-[760px] flex items-center gap-3 rounded-xl border-[1.5px] border-ink bg-surface shadow-sticker-lg p-2.5 pl-3">
          <div class="w-12 h-12 shrink-0 rounded-md border-[1.5px] border-ink overflow-hidden" :style="{ background: pickedDino?.palette?.belly ?? 'rgb(var(--c-surface-sunken))' }">
            <DinoIllustration v-if="pickedDino" :key="pickedDino.name" :dino="pickedDino" decorative class="animate-pop-in" />
            <img v-else :src="SPOTS.eggWhole" alt="" class="w-full h-full p-1.5" />
          </div>
          <p class="min-w-0 flex-1 text-sm leading-snug" aria-live="polite">
            <span class="block font-semibold truncate">{{ name }}</span>
            <span class="block text-ink-muted truncate">{{ pickedDino ? dinoName(pickedDino) : 'No dino picked yet' }}</span>
          </p>
          <UiButton :disabled="!pickedDino" :loading="saving" icon="check" @click="create(picked, 'profile')">
            Add {{ first }}
          </UiButton>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.pick-bar { bottom: 16px; }
@media (max-width: 767.98px) {
  .pick-bar { bottom: calc(var(--tabbar-h) + env(safe-area-inset-bottom) + 10px); }
}
</style>
