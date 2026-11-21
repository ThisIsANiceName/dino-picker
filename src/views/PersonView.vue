<!-- PersonView: a teammate's profile. -->
<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { UiButton, UiCard, UiEmptyState, UiIcon, UiSkeleton, UiTabs } from '../components/ui/index.js'
import PersonAvatar from '../components/person/PersonAvatar.vue'
import PersonalityBlock from '../components/person/PersonalityBlock.vue'
import TraitBars from '../components/person/TraitBars.vue'
import NoteEditor from '../components/person/NoteEditor.vue'
import CompatList from '../components/person/CompatList.vue'
import DinoPickerModal from '../components/person/DinoPickerModal.vue'
import { useChangeDino } from '../components/person/useChangeDino.js'
import { traitProfile } from '../components/layout/contracts.js'
import DinoFacts from '../components/dinopedia/DinoFacts.vue'
import DinoIllustration from '../components/dinopedia/DinoIllustration.vue'
import ErrorState from '../components/layout/ErrorState.vue'
import { SPOTS } from '../components/layout/spots.js'
import { useAppData } from '../components/layout/useAppData.js'
import { usePageTitle } from '../components/layout/usePageTitle.js'
import { dinoLink, dinoName, firstName, possessive } from '../components/dinopedia/dinoUtils.js'
import { usePersonStore } from '../stores/personStore.js'

const route = useRoute()
const router = useRouter()
const personStore = usePersonStore()
const data = useAppData()
const changeDino = useChangeDino()

const person = computed(() => personStore.getPersonById(route.params.id))
const dino = computed(() => data.dinoFor(person.value))
const first = computed(() => firstName(person.value?.name))
const p = computed(() => dino.value?.personality ?? null)
const picking = ref(false)

usePageTitle(() => person.value?.name ?? '')

const ALL_TABS = [
  { id: 'about', label: 'About' },
  { id: 'traits', label: 'Traits' },
  { id: 'compat', label: 'Compatibility' },
]
// Dinos without a trait file (custom, enriched) get no Traits tab.
const TABS = computed(() => (traitProfile(dino.value) ? ALL_TABS : ALL_TABS.filter((t) => t.id !== 'traits')))
const tab = computed({
  get: () => (TABS.value.some((t) => t.id === route.query.tab) ? route.query.tab : 'about'),
  set: (v) => router.replace({ query: { ...route.query, tab: v === 'about' ? undefined : v } }),
})
const visited = reactive({ about: true, traits: false, compat: false })
watch(tab, (t) => { visited[t] = true }, { immediate: true })

const quizDate = computed(() => {
  const t = person.value?.quiz?.takenAt
  return t ? new Date(t).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : ''
})
</script>

<template>
  <div class="mx-auto max-w-[1240px] px-4 sm:px-6 pt-5 sm:pt-8">
    <RouterLink to="/" class="inline-flex items-center gap-1 min-h-[44px] text-sm font-semibold text-ink-muted hover:text-ink">
      <UiIcon name="arrow-left" :size="16" /> Team
    </RouterLink>

    <!-- Loading -->
    <div v-if="data.loading.value" aria-busy="true" class="mt-4 grid md:grid-cols-[300px_1fr] gap-8 items-center">
      <h1 class="sr-only">Loading profile</h1>
      <UiSkeleton shape="rect" height="300px" class="max-w-[300px] mx-auto w-full" />
      <div class="space-y-4"><UiSkeleton width="60%" height="3rem" /><UiSkeleton width="40%" /><UiSkeleton :lines="2" /></div>
    </div>

    <ErrorState v-else-if="data.failed.value" @retry="data.retry()" />

    <UiEmptyState v-else-if="!person" title="No teammate here" text="They may have been removed, or the link is from another team." :image="SPOTS.emptySearch">
      <template #action><UiButton to="/" icon="arrow-left">Back to the team</UiButton></template>
    </UiEmptyState>

    <template v-else>
      <!-- Hero -->
      <section class="mt-3 grid md:grid-cols-[minmax(240px,320px)_1fr] gap-7 md:gap-12 items-center">
        <div class="mx-auto md:mx-0 w-[min(72vw,300px)] md:w-full">
          <div class="profile-sticker sticker overflow-hidden" style="--tilt:-2deg">
            <PersonAvatar :person="person" :dino="dino" :size="480" />
          </div>
        </div>

        <div class="min-w-0 text-center md:text-left">
          <div class="flex items-start justify-center md:justify-between gap-4">
            <h1 tabindex="-1" class="font-display text-display-md sm:text-display-lg break-words min-w-0">{{ person.name }}</h1>
            <UiButton variant="secondary" size="sm" icon="edit" :to="`/people/${person.id}/edit`" class="hidden md:inline-flex mt-2 shrink-0">Edit</UiButton>
          </div>

          <template v-if="dino">
            <p class="mt-3 text-lg font-semibold">
              <RouterLink :to="dinoLink(dino)" class="link">{{ dinoName(dino) }}</RouterLink>
              <template v-if="p"><span class="text-ink-subtle font-normal"> · </span><span class="text-ink-muted">{{ p.archetype }}</span></template>
            </p>
            <p v-if="p?.tagline" class="mt-2 text-ink-muted text-lg max-w-[48ch] mx-auto md:mx-0">{{ p.tagline }}</p>
            <p v-else-if="dino.description" class="mt-2 text-ink-muted max-w-[52ch] mx-auto md:mx-0 line-clamp-3">{{ dino.description }}</p>

            <div class="mt-6 grid grid-cols-2 sm:flex sm:flex-wrap gap-3 sm:justify-center md:justify-start">
              <UiButton icon="palette" :to="`/people/${person.id}/avatar`">Edit avatar</UiButton>
              <UiButton variant="secondary" icon="shirt" :to="`/people/${person.id}/shirts`">Design a shirt</UiButton>
              <UiButton variant="secondary" icon="egg" :to="`/quiz?for=${person.id}`">{{ person.quiz ? 'Retake quiz' : 'Take the quiz' }}</UiButton>
              <UiButton variant="secondary" icon="shuffle" class="sm:!hidden" @click="picking = true">Change dino</UiButton>
            </div>
            <div class="mt-4 flex flex-wrap items-center justify-center md:justify-start gap-x-5 gap-y-1 text-sm">
              <button type="button" class="hidden sm:inline-flex items-center gap-1.5 min-h-[44px] font-semibold link" @click="picking = true">Change dino</button>
              <RouterLink :to="`/people/${person.id}/edit`" class="md:hidden inline-flex items-center gap-1.5 min-h-[44px] font-semibold link">Edit details</RouterLink>
              <span v-if="quizDate" class="text-ink-subtle">Quiz taken {{ quizDate }}</span>
            </div>
          </template>

          <template v-else>
            <p class="mt-3 text-lg text-ink-muted">No dino yet. Take the quiz or pick one yourself.</p>
            <div class="mt-6 flex flex-wrap gap-3 justify-center md:justify-start">
              <UiButton icon="egg" size="lg" :to="`/quiz?for=${person.id}`">Take the quiz</UiButton>
              <UiButton variant="secondary" size="lg" icon="book" @click="picking = true">Pick one myself</UiButton>
            </div>
            <RouterLink :to="`/people/${person.id}/edit`" class="md:hidden mt-4 inline-flex items-center min-h-[44px] text-sm font-semibold link">Edit details</RouterLink>
          </template>
        </div>
      </section>

      <!-- Sections -->
      <div v-if="dino" class="profile-tabs mt-10 sm:mt-14">
        <UiTabs v-model="tab" :tabs="TABS" :label="`About ${first}`" id-prefix="profile">
          <template #panel-about>
            <div class="pt-6 grid lg:grid-cols-[1.1fr_1fr] gap-6 items-start">
              <UiCard padding="none" class="overflow-hidden">
                <div class="grid sm:grid-cols-[180px_1fr]">
                  <div class="border-b-[1.5px] sm:border-b-0 sm:border-r-[1.5px] border-ink" :style="{ background: dino.palette?.belly ?? '#FFEBC2' }">
                    <DinoIllustration :dino="dino" class="max-w-[220px] sm:max-w-none mx-auto sm:sticky sm:top-28 sm:mt-6" />
                  </div>
                  <div class="p-5 min-w-0">
                    <h2 class="font-display text-display-xs">{{ dinoName(dino) }}</h2>
                    <p v-if="dino.pronunciation" class="mt-0.5 text-sm text-ink-muted">
                      <span class="font-semibold">{{ dino.pronunciation }}</span><template v-if="dino.meaning"> · "{{ dino.meaning }}"</template>
                    </p>
                    <div class="mt-4"><DinoFacts :dino="dino" /></div>
                    <RouterLink :to="dinoLink(dino)" class="mt-5 inline-flex items-center gap-1 text-sm font-semibold link">Full Dinopedia entry</RouterLink>
                  </div>
                </div>
              </UiCard>
              <div class="space-y-6">
                <UiCard><PersonalityBlock :personality="p" /></UiCard>
                <NoteEditor :person="person" />
              </div>
            </div>
          </template>
          <template #panel-traits>
            <div class="pt-6">
              <UiCard v-if="visited.traits" padding="lg">
                <h2 class="font-display text-display-xs">{{ possessive(person.name) }} traits</h2>
                <p class="mt-1 mb-7 text-ink-muted">Read from the {{ dinoName(dino) }}'s field notes. For fun, not science.</p>
                <TraitBars :dino="dino" :quiz-traits="person.quiz?.traits ?? null">
                  <template #empty>
                    <p class="text-ink-muted">The {{ dinoName(dino) }} has no trait file. Pick a dino from the Dinopedia list to see traits.</p>
                  </template>
                </TraitBars>
              </UiCard>
            </div>
          </template>
          <template #panel-compat>
            <div class="pt-6 max-w-[860px]">
              <h2 class="font-display text-display-xs">{{ first }} and the team</h2>
              <p class="mt-1 mb-5 text-ink-muted">Labels, not scores. Every pairing has its upside.</p>
              <CompatList v-if="visited.compat" :person="person" :dino="dino" />
            </div>
          </template>
        </UiTabs>
      </div>
      <div v-else class="mt-12 max-w-[760px]">
        <NoteEditor :person="person" />
      </div>

      <DinoPickerModal v-model="picking" :title="`Pick a dino for ${first}`" :current="person.dinoName ?? ''" @pick="changeDino(person, $event)" />
    </template>
  </div>
</template>

<style scoped>
.profile-sticker { transition: transform 220ms var(--ease-spring), box-shadow 220ms var(--ease-out); }
.profile-sticker:hover { transform: rotate(0deg) translateY(-6px); box-shadow: 0 0 0 4px rgb(var(--c-keyline)), 6px 10px 0 4px rgb(var(--c-shadow) / 0.9); }
.profile-tabs :deep([role='tablist']) {
  position: sticky;
  top: 56px;
  z-index: 20;
  background: rgb(var(--c-bg) / 0.96);
  backdrop-filter: blur(6px);
}
@media (min-width: 768px) {
  .profile-tabs :deep([role='tablist']) { top: 64px; }
}
</style>
