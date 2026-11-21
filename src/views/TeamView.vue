<!-- TeamView: the roster wall (home). -->
<script setup>
import { computed, ref } from 'vue'
import { UiButton, UiEmptyState, UiIcon, UiIconButton, UiInput, UiSkeleton, prefersReducedMotion } from '../components/ui/index.js'
import TeamCard from '../components/team/TeamCard.vue'
import ErrorState from '../components/layout/ErrorState.vue'
import TeamNameModal from '../components/layout/TeamNameModal.vue'
import { SPOTS } from '../components/layout/spots.js'
import { useAppData } from '../components/layout/useAppData.js'
import { consumeAdded } from '../components/team/recent.js'
import { usePersonStore } from '../stores/personStore.js'
import { useTeamStore } from '../stores/teamStore.js'
import { dinoName, norm } from '../components/dinopedia/dinoUtils.js'

const personStore = usePersonStore()
const team = useTeamStore()
const data = useAppData()

const query = ref('')
const renaming = ref(false)
const slapId = prefersReducedMotion() ? null : consumeAdded()

const TILTS = [-2, 1.5, -1, 2, -1.5, 1, 0.5, -0.5]

const people = computed(() =>
  [...personStore.persons]
    .map((p) => ({ person: p, dino: data.dinoFor(p) }))
    .sort((a, b) => a.person.name.localeCompare(b.person.name, undefined, { sensitivity: 'base' })),
)
const showSearch = computed(() => people.value.length >= 7)
const filtered = computed(() => {
  const q = norm(query.value)
  if (!q) return people.value
  return people.value.filter(({ person, dino }) =>
    norm(person.name).includes(q) || norm(dino ? dinoName(dino) : person.dinoName).includes(q) || norm(dino?.personality?.archetype).includes(q),
  )
})

const DIET_PLURAL = { herbivore: 'herbivores', carnivore: 'carnivores', omnivore: 'omnivores', piscivore: 'fish eaters', insectivore: 'insect eaters' }
const DIET_SINGULAR = { herbivore: 'herbivore', carnivore: 'carnivore', omnivore: 'omnivore', piscivore: 'fish eater', insectivore: 'insect eater' }
const summary = computed(() => {
  const n = people.value.length
  const parts = [`${n} ${n === 1 ? 'teammate' : 'teammates'}`]
  const counts = {}
  for (const { dino } of people.value) if (dino?.diet) counts[dino.diet] = (counts[dino.diet] ?? 0) + 1
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]
  if (top) parts.push(`${top[1]} ${top[1] === 1 ? DIET_SINGULAR[top[0]] ?? top[0] : DIET_PLURAL[top[0]] ?? `${top[0]}s`}`)
  const eggs = people.value.filter(({ person }) => !person.dinoName).length
  if (eggs) parts.push(`${eggs} still in the egg`)
  return parts.join(', ')
})
</script>

<template>
  <div class="mx-auto max-w-[1240px] px-4 sm:px-6 pt-8 sm:pt-12">
    <!-- Loading -->
    <div v-if="data.loading.value" aria-busy="true" aria-label="Loading the team">
      <h1 class="sr-only">Team</h1>
      <UiSkeleton width="14rem" height="2.6rem" />
      <div class="mt-3"><UiSkeleton width="11rem" /></div>
      <div class="mt-10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
        <UiSkeleton v-for="i in 10" :key="i" shape="card" height="300px" />
      </div>
    </div>

    <ErrorState v-else-if="data.failed.value" @retry="data.retry()">
    </ErrorState>

    <!-- Empty -->
    <template v-else-if="!people.length">
      <h1 class="sr-only">{{ team.name }}</h1>
      <UiEmptyState
        title="No teammates yet"
        text="Add the first person and give them a spirit dinosaur."
        :image="SPOTS.emptyRoster"
      >
        <template #action>
          <UiButton icon="plus" size="lg" to="/people/new">Add teammate</UiButton>
          <UiButton variant="ghost" icon="book" size="lg" to="/dinopedia">Browse the Dinopedia</UiButton>
        </template>
      </UiEmptyState>
    </template>

    <!-- Wall -->
    <template v-else>
      <header class="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div class="min-w-0">
          <div class="flex items-center gap-1.5">
            <h1 tabindex="-1" class="font-display text-display-md sm:text-display-lg break-words min-w-0">{{ team.name }}</h1>
            <UiIconButton icon="edit" label="Rename the team" size="md" class="shrink-0 text-ink-muted mt-1" @click="renaming = true" />
          </div>
          <p class="mt-2 text-ink-muted font-medium">{{ summary }}</p>
        </div>
        <div v-if="showSearch" class="w-full sm:w-72">
          <label for="team-search" class="sr-only">Search teammates by name or dino</label>
          <UiInput id="team-search" v-model="query" type="search" placeholder="Search name or dino" clearable autocomplete="off" />
        </div>
      </header>

      <p v-if="query && !filtered.length" class="mt-10 text-ink-muted" role="status">
        Nobody called "{{ query }}" in this herd. <button type="button" class="link font-semibold" @click="query = ''">Clear search</button>
      </p>
      <p v-else-if="query" class="sr-only" role="status">{{ filtered.length }} teammates match</p>

      <ul class="mt-8 sm:mt-10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-4 gap-y-6 sm:gap-x-6 sm:gap-y-8" aria-label="Teammates">
        <li v-for="({ person, dino }, i) in filtered" :key="person.id">
          <TeamCard :person="person" :dino="dino" :tilt="TILTS[i % TILTS.length]" :slap="person.id === slapId" />
        </li>
        <li v-if="!query">
          <RouterLink
            to="/people/new"
            class="add-slot group h-full min-h-[220px] flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed border-line-strong bg-surface-sunken/70 text-ink-muted hover:text-ink hover:border-ink transition-colors duration-fast"
          >
            <span class="w-14 h-14 rounded-full border-[1.5px] border-current grid place-items-center transition-transform duration-base ease-spring group-hover:rotate-90">
              <UiIcon name="plus" :size="26" :stroke="2.25" />
            </span>
            <span class="font-semibold">Add teammate</span>
          </RouterLink>
        </li>
      </ul>
    </template>

    <TeamNameModal v-model="renaming" />
  </div>
</template>
