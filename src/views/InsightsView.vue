<!-- InsightsView: team composition, pairings, print views. -->
<script setup>
import { computed, ref } from 'vue'
import { UiButton, UiCard, UiEmptyState, UiIconButton, UiSkeleton } from '../components/ui/index.js'
import DietMix from '../components/insights/DietMix.vue'
import EraTimeline from '../components/insights/EraTimeline.vue'
import BodyTypeGrid from '../components/insights/BodyTypeGrid.vue'
import PairingsMatrix from '../components/insights/PairingsMatrix.vue'
import { teamStats, listText } from '../components/insights/stats.js'
import ErrorState from '../components/layout/ErrorState.vue'
import MotionToggle from '../components/layout/MotionToggle.vue'
import TeamNameModal from '../components/layout/TeamNameModal.vue'
import { SPOTS } from '../components/layout/spots.js'
import { teamPairs } from '../components/layout/contracts.js'
import { useAppData } from '../components/layout/useAppData.js'
import { dinoName, firstName, fmtMetres, fmtWeight } from '../components/dinopedia/dinoUtils.js'
import { usePersonStore } from '../stores/personStore.js'
import { useTeamStore } from '../stores/teamStore.js'

const personStore = usePersonStore()
const team = useTeamStore()
const data = useAppData()
const renaming = ref(false)

const rows = computed(() => [...personStore.persons]
  .sort((a, b) => a.name.localeCompare(b.name))
  .map((person) => ({ person, dino: data.dinoFor(person) })))
const stats = computed(() => teamStats(rows.value))
const pairs = computed(() => teamPairs(personStore.persons, (n) => data.dinoFor(n)))
const pairPeople = computed(() => rows.value.filter((r) => r.dino?.traits))
const skipped = computed(() => rows.value.filter((r) => !r.dino?.traits))

const summary = computed(() => {
  const s = stats.value
  const parts = [s.dietLine]
  if (s.eggs) parts.push(`${s.eggs} still in the egg`)
  return parts.filter(Boolean).join(', ')
})
const BLUE_WHALE = 25
const herd = computed(() => {
  const s = stats.value
  const out = []
  if (s.totalLength) out.push({ label: 'Nose to tail', value: fmtMetres(Math.round(s.totalLength)), note: s.totalLength >= BLUE_WHALE ? `About ${Math.round(s.totalLength / BLUE_WHALE * 10) / 10} blue whales` : 'Shorter than one blue whale' })
  if (s.totalWeight) out.push({ label: 'Combined weight', value: fmtWeight(s.totalWeight), note: `About ${Math.max(1, Math.round(s.totalWeight / 1500))} family cars` })
  if (s.fastest) out.push({ label: 'Fastest', value: `${s.fastest.dino.speedKmh} km/h`, note: `${firstName(s.fastest.person.name)}'s ${dinoName(s.fastest.dino)}` })
  if (s.oldest) out.push({ label: 'Oldest lineage', value: `${s.oldest.dino.myaFrom} mya`, note: `${firstName(s.oldest.person.name)}'s ${dinoName(s.oldest.dino)}` })
  return out
})
</script>

<template>
  <div class="mx-auto max-w-[1240px] px-4 sm:px-6 pt-8 sm:pt-12">
    <div v-if="data.loading.value" aria-busy="true">
      <h1 class="sr-only">Team insights</h1>
      <UiSkeleton width="18rem" height="2.6rem" />
      <div class="mt-8 grid md:grid-cols-3 gap-6"><UiSkeleton v-for="i in 3" :key="i" shape="card" /></div>
    </div>
    <ErrorState v-else-if="data.failed.value" @retry="data.retry()" />

    <template v-else-if="!rows.length">
      <h1 class="sr-only">Team insights</h1>
      <UiEmptyState title="Nothing to chart yet" text="Insights appear once a few teammates have dinos. Start with one." :image="SPOTS.emptyRoster">
        <template #action><UiButton icon="plus" to="/people/new">Add teammate</UiButton></template>
      </UiEmptyState>
    </template>

    <template v-else>
      <header class="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div class="min-w-0">
          <p class="flex items-center gap-1 text-sm font-semibold text-ink-subtle">
            {{ team.name }} · {{ team.year }}
            <UiIconButton icon="edit" label="Rename the team" size="sm" class="text-ink-muted" @click="renaming = true" />
          </p>
          <h1 tabindex="-1" class="mt-1 font-display text-display-md sm:text-display-lg">{{ stats.headline }}</h1>
          <p class="mt-2 text-ink-muted font-medium">{{ summary }}.</p>
        </div>
        <div class="flex flex-wrap gap-3">
          <UiButton icon="print" to="/insights/poster">Print poster</UiButton>
          <UiButton variant="secondary" icon="copy" to="/insights/name-cards">Name cards</UiButton>
          <UiButton variant="secondary" icon="shirt" to="/team-shirt/new">Team shirt</UiButton>
        </div>
      </header>

      <dl v-if="herd.length" class="mt-8 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div v-for="(h, i) in herd" :key="h.label" :class="['rounded-lg border-[1.5px] border-ink p-4 shadow-sticker-sm', ['bg-primary-soft', 'bg-fern-100', 'bg-lagoon-100', 'bg-magma-100'][i % 4]]">
          <dt class="text-sm font-semibold text-lichen-700">{{ h.label }}</dt>
          <dd class="mt-1 font-display text-display-xs sm:text-display-sm text-lichen-900 tabular">{{ h.value }}</dd>
          <dd class="mt-1 text-sm text-lichen-700 truncate">{{ h.note }}</dd>
        </div>
      </dl>

      <div class="mt-6 grid lg:grid-cols-[2fr_3fr] gap-6 items-start">
        <UiCard>
          <h2 class="font-display text-display-xs">Diet mix</h2>
          <p class="mt-1 mb-5 text-sm text-ink-muted">Who's eating what at the team lunch.</p>
          <DietMix :rows="stats.dietRows" :total="stats.withDino" />
        </UiCard>
        <UiCard class="lg:col-span-2 lg:order-last">
          <h2 class="font-display text-display-xs">Periods</h2>
          <p class="mt-1 mb-4 text-sm text-ink-muted">
            {{ listText(stats.periodRows.filter((p) => p.count).map((p) => `${p.count} ${p.label}`)) || 'No periods yet' }}.
          </p>
          <EraTimeline :rows="rows" />
        </UiCard>
        <UiCard>
          <h2 class="font-display text-display-xs">Body types</h2>
          <p class="mt-1 mb-5 text-sm text-ink-muted">{{ stats.bodyLine.length ? `${listText(stats.bodyLine)}.` : 'No shapes yet.' }}</p>
          <BodyTypeGrid :rows="stats.bodyRows" />
        </UiCard>
      </div>

      <UiCard class="mt-6" padding="lg">
        <h2 class="font-display text-display-xs">Pairings</h2>
        <p class="mt-1 mb-6 text-ink-muted max-w-[64ch]">Labels, not scores. Spicy pairs make for the best retros.</p>
        <PairingsMatrix v-if="pairs.length" :pairs="pairs" :people="pairPeople" />
        <p v-else class="text-ink-muted">Pairings need at least two teammates with catalog dinos.</p>
        <p v-if="skipped.length && pairs.length" class="mt-4 text-sm text-ink-subtle">
          Not included: {{ listText(skipped.map((r) => firstName(r.person.name))) }} (no dino yet, or a custom dino without a personality file).
        </p>
      </UiCard>

      <div class="md:hidden mt-8 flex justify-center"><MotionToggle /></div>
    </template>

    <TeamNameModal v-model="renaming" />
  </div>
</template>
