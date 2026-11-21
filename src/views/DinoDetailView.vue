<!-- DinoDetailView: one dino's entry, plus who on the team has it. -->
<script setup>
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { UiBadge, UiButton, UiCard, UiEmptyState, UiIcon, UiModal, UiSkeleton } from '../components/ui/index.js'
import DinoIllustration from '../components/dinopedia/DinoIllustration.vue'
import DinoFacts from '../components/dinopedia/DinoFacts.vue'
import CustomDinoForm from '../components/dinopedia/CustomDinoForm.vue'
import PersonAvatar from '../components/person/PersonAvatar.vue'
import PersonalityBlock from '../components/person/PersonalityBlock.vue'
import TraitBars from '../components/person/TraitBars.vue'
import { useChangeDino } from '../components/person/useChangeDino.js'
import ErrorState from '../components/layout/ErrorState.vue'
import { SPOTS } from '../components/layout/spots.js'
import { useAppData } from '../components/layout/useAppData.js'
import { usePageTitle } from '../components/layout/usePageTitle.js'
import { traitProfile } from '../components/layout/contracts.js'
import { dinoName, firstName } from '../components/dinopedia/dinoUtils.js'
import { usePersonStore } from '../stores/personStore.js'

const route = useRoute()
const personStore = usePersonStore()
const data = useAppData()
const changeDino = useChangeDino()

const dino = computed(() => data.dinoFor(decodeURIComponent(String(route.params.dinoId))))
usePageTitle(() => (dino.value ? dinoName(dino.value) : ''))

const owners = computed(() => personStore.persons.filter((p) => dino.value && p.dinoName === dino.value.name))
const others = computed(() => [...personStore.persons].sort((a, b) => a.name.localeCompare(b.name)))
const assigning = ref(false)
const editing = ref(false)
const hasTraits = computed(() => !!traitProfile(dino.value))

function assign(p) {
  assigning.value = false
  changeDino(p, dino.value)
}
</script>

<template>
  <div class="mx-auto max-w-[1240px] px-4 sm:px-6 pt-5 sm:pt-8">
    <RouterLink to="/dinopedia" class="inline-flex items-center gap-1 min-h-[44px] text-sm font-semibold text-ink-muted hover:text-ink">
      <UiIcon name="arrow-left" :size="16" /> Dinopedia
    </RouterLink>

    <div v-if="data.loading.value" aria-busy="true" class="mt-4 grid md:grid-cols-2 gap-10">
      <h1 class="sr-only">Loading dino</h1>
      <UiSkeleton shape="rect" height="420px" />
      <div class="space-y-4"><UiSkeleton width="70%" height="3rem" /><UiSkeleton :lines="4" /></div>
    </div>
    <ErrorState v-else-if="data.failed.value" @retry="data.retry()" />
    <UiEmptyState v-else-if="!dino" title="No dino by that name" text="It may have been renamed, or it never made it into the fossil record." :image="SPOTS.emptySearch">
      <template #action><UiButton to="/dinopedia" icon="book">Browse the Dinopedia</UiButton></template>
    </UiEmptyState>

    <template v-else>
      <section class="mt-3 grid md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] gap-8 md:gap-14 items-center">
        <div class="relative">
          <div class="rounded-xl border-[1.5px] border-ink shadow-sticker-lg overflow-hidden -rotate-1" :style="{ background: dino.palette?.belly ?? '#FFEBC2' }">
            <div class="bg-specimen/0"><DinoIllustration :dino="dino" class="w-full" /></div>
          </div>
          <button type="button" class="absolute right-3 bottom-3 inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-surface-raised/95 border-[1.5px] border-ink text-sm font-semibold shadow-sticker-sm hover:bg-surface" @click="editing = true">
            <UiIcon name="image" :size="16" /> {{ dino.source === 'catalog' ? (dino.image ? 'Change picture' : 'Use a picture') : 'Edit dino' }}
          </button>
        </div>

        <div class="min-w-0">
          <p v-if="dino.group" class="text-sm font-semibold text-ink-subtle">{{ dino.group }}</p>
          <h1 tabindex="-1" class="mt-1 font-display text-display-lg sm:text-display-xl break-words">{{ dinoName(dino) }}</h1>
          <p v-if="dino.pronunciation || dino.meaning" class="mt-3 text-lg text-ink-muted">
            <span v-if="dino.pronunciation" class="font-semibold text-ink">{{ dino.pronunciation }}</span>
            <template v-if="dino.pronunciation && dino.meaning"> · </template>
            <template v-if="dino.meaning">"{{ dino.meaning }}"</template>
          </p>
          <p v-if="dino.description" class="mt-4 text-lg leading-relaxed max-w-[60ch]">{{ dino.description }}</p>
          <p v-if="dino.epoch || dino.namedYear" class="mt-3 text-sm text-ink-muted">
            <template v-if="dino.epoch">{{ dino.epoch }}</template><template v-if="dino.epoch && dino.namedYear"> · </template><template v-if="dino.namedYear">Named in {{ dino.namedYear }}</template>
          </p>
          <div class="mt-6 flex flex-wrap gap-3">
            <UiButton icon="user" @click="assigning = true">Make this my dino</UiButton>
            <UiButton v-if="dino.wikipediaUrl" variant="ghost" :href="dino.wikipediaUrl" target="_blank" rel="noopener" icon-right="arrow-right">Read on Wikipedia</UiButton>
          </div>
        </div>
      </section>

      <div class="mt-12 grid lg:grid-cols-[1.25fr_1fr] gap-6 items-start">
        <div class="space-y-6">
          <UiCard padding="lg">
            <h2 class="font-display text-display-xs mb-5">Field notes</h2>
            <DinoFacts :dino="dino" layout="wide" />
          </UiCard>
          <UiCard v-if="hasTraits" padding="lg">
            <h2 class="font-display text-display-xs">Traits</h2>
            <p class="mt-1 mb-6 text-ink-muted">What the quiz matches on.</p>
            <TraitBars :dino="dino" />
          </UiCard>
        </div>
        <div class="space-y-6">
          <UiCard padding="lg">
            <PersonalityBlock :personality="dino.personality" :heading="dino.personality ? dino.personality.archetype : 'Personality'" />
            <p v-if="dino.personality?.tagline" class="mt-5 pt-4 border-t border-line italic text-ink-muted">"{{ dino.personality.tagline }}"</p>
          </UiCard>
          <UiCard padding="lg">
            <h2 class="font-display text-display-xs">Who in the team has this dino</h2>
            <ul v-if="owners.length" class="mt-4 space-y-2">
              <li v-for="p in owners" :key="p.id">
                <RouterLink :to="`/people/${p.id}`" class="flex items-center gap-3 rounded-md p-1.5 -m-1.5 hover:bg-surface-sunken">
                  <div class="w-12 h-12 rounded-md overflow-hidden border-[1.5px] border-ink shrink-0"><PersonAvatar :person="p" :dino="dino" :size="96" alt="" /></div>
                  <span class="font-semibold">{{ p.name }}</span>
                  <UiIcon name="chevron-right" :size="18" class="ml-auto text-ink-subtle" />
                </RouterLink>
              </li>
            </ul>
            <p v-else class="mt-2 text-ink-muted">Nobody yet. The first {{ dinoName(dino) }} on the team gets bragging rights.</p>
          </UiCard>
        </div>
      </div>

      <UiModal v-model="assigning" :title="`Who's the ${dinoName(dino)}?`" description="Their current dino is swapped. You can undo right after." size="md">
        <ul v-if="others.length" class="divide-y divide-line -mx-2">
          <li v-for="p in others" :key="p.id">
            <button type="button" class="w-full flex items-center gap-3 px-2 py-2.5 text-left rounded-md hover:bg-surface-sunken disabled:opacity-60" :disabled="p.dinoName === dino.name" @click="assign(p)">
              <div class="w-11 h-11 rounded-md overflow-hidden border-[1.5px] border-ink shrink-0"><PersonAvatar :person="p" :dino="data.dinoFor(p)" :size="88" alt="" /></div>
              <span class="min-w-0 flex-1">
                <span class="block font-semibold truncate">{{ p.name }}</span>
                <span class="block text-sm text-ink-muted truncate">{{ p.dinoName === dino.name ? `Already a ${dinoName(dino)}` : data.dinoFor(p) ? `Currently a ${dinoName(data.dinoFor(p))}` : 'No dino yet' }}</span>
              </span>
              <UiBadge v-if="p.dinoName === dino.name" variant="success" size="sm">Theirs</UiBadge>
            </button>
          </li>
        </ul>
        <p v-else class="text-ink-muted">No teammates yet. <RouterLink to="/people/new" class="link font-semibold">Add someone</RouterLink> first, then come back.</p>
        <template #footer>
          <UiButton variant="ghost" :to="{ path: '/people/new', query: { step: 'pick', dino: dino.name } }">Add a new teammate instead</UiButton>
        </template>
      </UiModal>

      <UiModal v-model="editing" :title="dino.source === 'catalog' ? `Picture for ${dinoName(dino)}` : `Edit ${dinoName(dino)}`" size="lg">
        <CustomDinoForm v-if="editing" :dino="dino" @saved="editing = false" @cancel="editing = false" />
      </UiModal>
    </template>
  </div>
</template>
