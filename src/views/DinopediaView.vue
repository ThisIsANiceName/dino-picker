<!-- DinopediaView: browse, search and filter every dino. Filters sync to the query string. -->
<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { UiBottomSheet, UiButton, UiChip, UiEmptyState, UiField, UiInput, UiModal, UiSelect, UiSkeleton, prefersReducedMotion } from '../components/ui/index.js'
import DinoTile from '../components/dinopedia/DinoTile.vue'
import CustomDinoForm from '../components/dinopedia/CustomDinoForm.vue'
import ErrorState from '../components/layout/ErrorState.vue'
import { SPOTS } from '../components/layout/spots.js'
import { useAppData } from '../components/layout/useAppData.js'
import { SORTS, countBy, matches, sortDinos } from '../components/dinopedia/dinoFilters.js'
import { BODY_TYPES, DIETS, PERIODS, SIZES, bodyTypeLabel, cap, dinoLink, firstName, sizeOf } from '../components/dinopedia/dinoUtils.js'
import { useDinoStore } from '../stores/dinoStore.js'
import { usePersonStore } from '../stores/personStore.js'

const route = useRoute()
const router = useRouter()
const dinoStore = useDinoStore()
const personStore = usePersonStore()
const data = useAppData()

const PAGE = 48
const list = (v) => (typeof v === 'string' && v ? v.split(',') : [])

// ── State <-> query string ───────────────────────────────────────────────
const q = ref(typeof route.query.q === 'string' ? route.query.q : '')
const periods = ref(list(route.query.period))
const diets = ref(list(route.query.diet))
const body = ref(typeof route.query.body === 'string' ? route.query.body : '')
const size = ref(typeof route.query.size === 'string' ? route.query.size : '')
const sort = ref(SORTS.some((s) => s.value === route.query.sort) ? route.query.sort : 'popular')
const limit = ref(PAGE)
const sheetOpen = ref(false)
const adding = ref(false)

const filters = computed(() => ({ q: q.value.trim(), periods: periods.value, diets: diets.value, body: body.value, size: size.value }))
let qTimer
watch([filters, sort], () => {
  limit.value = PAGE
  clearTimeout(qTimer)
  qTimer = setTimeout(() => {
    const f = filters.value
    router.replace({ query: {
      q: f.q || undefined,
      period: f.periods.join(',') || undefined,
      diet: f.diets.join(',') || undefined,
      body: f.body || undefined,
      size: f.size || undefined,
      sort: sort.value !== 'popular' ? sort.value : undefined,
    } })
  }, 250)
}, { deep: true })

// ── Data ────────────────────────────────────────────────────────────────
const owners = computed(() => {
  const m = new Map()
  for (const p of personStore.persons) {
    if (!p.dinoName) continue
    if (!m.has(p.dinoName)) m.set(p.dinoName, [])
    m.get(p.dinoName).push(firstName(p.name))
  }
  return m
})
const popularity = computed(() => new Map([...owners.value].map(([k, v]) => [k, v.length])))
const results = computed(() => sortDinos(dinoStore.dinos.filter((d) => matches(d, filters.value)), sort.value, popularity.value))
const visible = computed(() => results.value.slice(0, limit.value))

const periodCounts = computed(() => countBy(dinoStore.dinos, filters.value, 'periods', (d) => d.period))
const dietCounts = computed(() => countBy(dinoStore.dinos, filters.value, 'diets', (d) => d.diet))
const bodyCounts = computed(() => countBy(dinoStore.dinos, filters.value, 'body', (d) => d.bodyType))
const sizeCounts = computed(() => countBy(dinoStore.dinos, filters.value, 'size', (d) => sizeOf(d)))
const dietOptions = computed(() => DIETS.filter((d) => dinoStore.dinos.some((x) => x.diet === d)))
const bodyOptions = computed(() => [{ value: '', label: 'Any body type' }, ...BODY_TYPES.map((b) => ({ value: b.value, label: `${b.label} (${bodyCounts.value[b.value] ?? 0})` }))])
const sizeOptions = computed(() => [{ value: '', label: 'Any size' }, ...SIZES.map((s) => ({ value: s.value, label: `${s.label} (${sizeCounts.value[s.value] ?? 0})` }))])

const active = computed(() => [
  ...periods.value.map((v) => ({ key: `p-${v}`, label: cap(v), tone: v, clear: () => { periods.value = periods.value.filter((x) => x !== v) } })),
  ...diets.value.map((v) => ({ key: `d-${v}`, label: cap(v), tone: v, clear: () => { diets.value = diets.value.filter((x) => x !== v) } })),
  ...(body.value ? [{ key: 'b', label: bodyTypeLabel(body.value), clear: () => { body.value = '' } }] : []),
  ...(size.value ? [{ key: 's', label: SIZES.find((s) => s.value === size.value)?.label ?? size.value, clear: () => { size.value = '' } }] : []),
])
const filterCount = computed(() => active.value.length)
function clearAll() {
  periods.value = []; diets.value = []; body.value = ''; size.value = ''; q.value = ''
}
function toggle(name, v) {
  const r = name === 'periods' ? periods : diets
  r.value = r.value.includes(v) ? r.value.filter((x) => x !== v) : [...r.value, v]
}

// ── Stagger only on first load ──────────────────────────────────────────
const stagger = ref(!prefersReducedMotion())
onMounted(() => setTimeout(() => { stagger.value = false }, 1200))

// ── Auto "load more" when the sentinel scrolls into view ─────────────────
const sentinel = ref(null)
let io
onMounted(() => {
  io = new IntersectionObserver((entries) => {
    if (entries.some((e) => e.isIntersecting) && limit.value < results.value.length) limit.value += PAGE
  }, { rootMargin: '600px' })
  watch(sentinel, (el, old) => { if (old) io.unobserve(old); if (el) io.observe(el) }, { immediate: true })
})
onBeforeUnmount(() => io?.disconnect())

function onAdded(d) {
  adding.value = false
  nextTick(() => router.push(dinoLink(d)))
}
</script>

<template>
  <div class="mx-auto max-w-[1240px] px-4 sm:px-6 pt-8 sm:pt-12">
    <header class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <h1 tabindex="-1" class="font-display text-display-md sm:text-display-lg">Dinopedia</h1>
        <p class="mt-2 text-ink-muted max-w-[56ch]">Every dino we know, from tiny feathered snackers to forty-metre long-necks. Some are not technically dinosaurs; they're still welcome.</p>
      </div>
      <div class="w-full lg:w-[420px]">
        <label for="dp-search" class="sr-only">Search dinos by name, group or region</label>
        <UiInput id="dp-search" v-model="q" type="search" placeholder="Search name, group, region" clearable autocomplete="off" />
      </div>
    </header>

    <!-- Desktop filters -->
    <div class="hidden md:block mt-6 space-y-3" role="group" aria-label="Filters">
      <div class="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-sm font-semibold text-ink-muted mr-1">Period</span>
          <UiChip v-for="p in PERIODS" :key="p.value" :model-value="periods.includes(p.value)" :tone="p.value" :count="periodCounts[p.value] ?? 0" @update:model-value="toggle('periods', p.value)">{{ p.label }}</UiChip>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <span class="text-sm font-semibold text-ink-muted mr-1">Diet</span>
          <UiChip v-for="d in dietOptions" :key="d" :model-value="diets.includes(d)" :tone="d" :count="dietCounts[d] ?? 0" @update:model-value="toggle('diets', d)">{{ cap(d) }}</UiChip>
        </div>
      </div>
      <div class="flex flex-wrap items-end gap-3">
        <div class="w-52"><label class="sr-only" for="dp-body">Body type</label><UiSelect id="dp-body" v-model="body" :options="bodyOptions" size="sm" /></div>
        <div class="w-44"><label class="sr-only" for="dp-size">Size</label><UiSelect id="dp-size" v-model="size" :options="sizeOptions" size="sm" /></div>
        <div class="w-44"><label class="sr-only" for="dp-sort">Sort</label><UiSelect id="dp-sort" v-model="sort" :options="SORTS.map((s) => ({ value: s.value, label: `Sort: ${s.label}` }))" size="sm" /></div>
        <p class="ml-auto text-sm text-ink-muted tabular" role="status" aria-live="polite">{{ results.length }} {{ results.length === 1 ? 'dino' : 'dinos' }}</p>
      </div>
    </div>

    <!-- Phone filter bar -->
    <div class="md:hidden mt-4 flex items-center gap-2">
      <UiButton variant="secondary" size="sm" icon="filter" @click="sheetOpen = true">Filters<template v-if="filterCount"> ({{ filterCount }})</template></UiButton>
      <div class="w-40"><label class="sr-only" for="dp-sort-m">Sort</label><UiSelect id="dp-sort-m" v-model="sort" :options="SORTS" size="sm" /></div>
      <p class="ml-auto text-sm text-ink-muted tabular whitespace-nowrap" aria-live="polite">{{ results.length }} {{ results.length === 1 ? "dino" : "dinos" }}</p>
    </div>

    <div v-if="active.length" class="mt-4 flex flex-wrap items-center gap-2">
      <UiChip v-for="a in active" :key="a.key" removable :tone="a.tone || ''" @remove="a.clear()">{{ a.label }}</UiChip>
      <button type="button" class="ml-1 text-sm font-semibold link min-h-[32px]" @click="clearAll">Clear all</button>
    </div>

    <!-- Results -->
    <div v-if="data.loading.value" aria-busy="true" class="mt-8 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
      <UiSkeleton v-for="i in 12" :key="i" shape="card" height="230px" />
    </div>
    <ErrorState v-else-if="data.failed.value" @retry="data.retry()" />
    <UiEmptyState v-else-if="!results.length" title="No dinos match those filters" text="Try fewer filters or a shorter search. Or add the one you were thinking of." :image="SPOTS.emptySearch">
      <template #action>
        <UiButton @click="clearAll">Clear filters</UiButton>
        <UiButton variant="ghost" icon="plus" @click="adding = true">Add a dino</UiButton>
      </template>
    </UiEmptyState>
    <template v-else>
      <ul class="mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4" aria-label="Dinos">
        <li v-for="(d, i) in visible" :key="d._id ?? d.name" :class="stagger && i < 12 ? 'dp-in' : ''" :style="stagger && i < 12 ? { animationDelay: `${i * 40}ms` } : undefined">
          <DinoTile :dino="d" :owners="owners.get(d.name) ?? []" />
        </li>
      </ul>
      <div ref="sentinel" class="h-px" aria-hidden="true" />
      <div class="mt-8 flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-ink-muted">
        <span class="tabular">Showing {{ visible.length }} of {{ results.length }}</span>
        <UiButton v-if="visible.length < results.length" variant="secondary" size="sm" @click="limit += PAGE">Show more</UiButton>
        <button type="button" class="inline-flex items-center gap-1.5 min-h-[44px] font-semibold text-ink-muted hover:text-ink" @click="adding = true">Missing a dino? Add it</button>
      </div>
    </template>

    <UiBottomSheet v-model="sheetOpen" title="Filters">
      <div class="space-y-6 pb-2">
        <fieldset>
          <legend class="text-sm font-semibold mb-2">Period</legend>
          <div class="flex flex-wrap gap-2">
            <UiChip v-for="p in PERIODS" :key="p.value" :model-value="periods.includes(p.value)" :tone="p.value" :count="periodCounts[p.value] ?? 0" @update:model-value="toggle('periods', p.value)">{{ p.label }}</UiChip>
          </div>
        </fieldset>
        <fieldset>
          <legend class="text-sm font-semibold mb-2">Diet</legend>
          <div class="flex flex-wrap gap-2">
            <UiChip v-for="d in dietOptions" :key="d" :model-value="diets.includes(d)" :tone="d" :count="dietCounts[d] ?? 0" @update:model-value="toggle('diets', d)">{{ cap(d) }}</UiChip>
          </div>
        </fieldset>
        <UiField label="Body type"><UiSelect v-model="body" :options="bodyOptions" /></UiField>
        <UiField label="Size"><UiSelect v-model="size" :options="sizeOptions" /></UiField>
      </div>
      <template #footer>
        <div class="flex items-center gap-3 w-full">
          <UiButton variant="ghost" @click="clearAll">Clear all</UiButton>
          <UiButton class="ml-auto" @click="sheetOpen = false">Show {{ results.length }} {{ results.length === 1 ? 'dino' : 'dinos' }}</UiButton>
        </div>
      </template>
    </UiBottomSheet>

    <UiModal v-model="adding" title="Add a dino" description="For the ones the fossil record forgot. It joins the Dinopedia for the whole team." size="lg">
      <CustomDinoForm v-if="adding" :initial-name="q" @saved="onAdded" @cancel="adding = false" />
    </UiModal>
  </div>
</template>

<style scoped>
.dp-in { animation: dp-in 420ms var(--ease-spring) both; }
@keyframes dp-in { from { opacity: 0; transform: translateY(10px) scale(0.97); } to { opacity: 1; transform: none; } }
</style>
