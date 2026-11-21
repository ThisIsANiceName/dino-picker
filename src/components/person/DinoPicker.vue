<!--
  DinoPicker: choose a dino. Search, filter chips, popular first, illustration
  thumbnails, and an escape hatch to add a dino that is not listed.

  Props: modelValue (String: dino genus name or ''), autofocus (Boolean), compact (Boolean: fewer columns)
  Emits: update:modelValue (name), pick (dino)
-->
<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { UiChip, UiIcon, UiInput } from '../ui/index.js'
import DinoIllustration from '../dinopedia/DinoIllustration.vue'
import CustomDinoForm from '../dinopedia/CustomDinoForm.vue'
import { matches, sortDinos } from '../dinopedia/dinoFilters.js'
import { DIETS, PERIODS, cap, dinoName } from '../dinopedia/dinoUtils.js'
import { useDinoStore } from '../../stores/dinoStore.js'
import { usePersonStore } from '../../stores/personStore.js'

const props = defineProps({
  modelValue: { type: String, default: '' },
  autofocus: { type: Boolean, default: false },
  compact: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue', 'pick'])

const dinoStore = useDinoStore()
const personStore = usePersonStore()

const q = ref('')
const diets = ref([])
const periods = ref([])
const limit = ref(24)
const adding = ref(false)
const search = ref(null)

const popularity = computed(() => {
  const m = new Map()
  for (const p of personStore.persons) if (p.dinoName) m.set(p.dinoName, (m.get(p.dinoName) ?? 0) + 1)
  return m
})
const filters = computed(() => ({ q: q.value, diets: diets.value, periods: periods.value }))
const results = computed(() => sortDinos(dinoStore.dinos.filter((d) => matches(d, filters.value)), 'popular', popularity.value))
const visible = computed(() => results.value.slice(0, limit.value))
const dietOptions = computed(() => DIETS.filter((d) => dinoStore.dinos.some((x) => x.diet === d)))

watch(filters, () => { limit.value = 24 }, { deep: true })

function toggle(name, v) {
  const list = name === 'periods' ? periods : diets
  const i = list.value.indexOf(v)
  if (i === -1) list.value = [...list.value, v]
  else list.value = list.value.filter((x) => x !== v)
}
function choose(d) {
  emit('update:modelValue', d.name)
  emit('pick', d)
}
function onCustomSaved(d) {
  adding.value = false
  q.value = ''
  choose(d)
}
function clear() {
  q.value = ''
  diets.value = []
  periods.value = []
}
onMounted(() => {
  // Skip autofocus on phones: it pops the keyboard and scrolls the heading away.
  if (props.autofocus && window.matchMedia('(min-width: 768px)').matches) nextTick(() => search.value?.focus())
})
</script>

<template>
  <div class="dino-picker">
    <div v-if="adding">
      <div class="flex items-center gap-2 mb-4">
        <button type="button" class="inline-flex items-center gap-1 text-sm font-semibold text-ink-muted hover:text-ink min-h-[44px]" @click="adding = false">
          <UiIcon name="arrow-left" :size="16" /> Back to the list
        </button>
      </div>
      <h3 class="font-display text-display-xs mb-4">Add a dino that is not listed</h3>
      <CustomDinoForm :initial-name="q" @saved="onCustomSaved" @cancel="adding = false" />
    </div>

    <template v-else>
      <label :for="`picker-search`" class="sr-only">Search dinos by name, group or region</label>
      <UiInput id="picker-search" ref="search" v-model="q" type="search" placeholder="Search name, group or region" clearable autocomplete="off" />

      <div class="mt-3 flex flex-wrap gap-2" role="group" aria-label="Filter dinos">
        <UiChip v-for="d in dietOptions" :key="d" :model-value="diets.includes(d)" :tone="d" @update:model-value="toggle('diets', d)">{{ cap(d) }}</UiChip>
        <span class="w-px self-stretch bg-line mx-0.5 hidden sm:block" aria-hidden="true" />
        <UiChip v-for="p in PERIODS" :key="p.value" :model-value="periods.includes(p.value)" :tone="p.value" @update:model-value="toggle('periods', p.value)">{{ p.label }}</UiChip>
      </div>

      <p class="mt-4 mb-3 text-sm text-ink-subtle" role="status">
        <template v-if="results.length">{{ results.length }} {{ results.length === 1 ? 'dino' : 'dinos' }}<template v-if="!q && !diets.length && !periods.length">, popular first</template></template>
        <template v-else>No dinos match. <button type="button" class="link font-semibold text-ink" @click="clear">Clear filters</button> or add it below.</template>
      </p>

      <ul :class="['grid gap-3', compact ? 'grid-cols-3 sm:grid-cols-4' : 'grid-cols-3 sm:grid-cols-4 lg:grid-cols-6']" aria-label="Dinos">
        <li v-for="d in visible" :key="d._id ?? d.name">
          <button
            type="button"
            :aria-pressed="String(modelValue === d.name)"
            :class="[
              'picker-tile group relative w-full h-full text-left rounded-md border-[1.5px] bg-surface overflow-hidden transition-[transform,box-shadow] duration-fast',
              modelValue === d.name ? 'border-ink shadow-sticker ring-[3px] ring-accent ring-offset-2 ring-offset-surface' : 'border-ink/70 hover:border-ink hover:-translate-y-0.5 hover:shadow-sticker-sm',
            ]"
            @click="choose(d)"
          >
            <span class="block border-b-[1.5px] border-ink/70" :style="{ background: d.palette?.belly ?? '#FFEBC2' }">
              <DinoIllustration :dino="d" decorative class="transition-transform duration-base ease-spring group-hover:scale-105" />
            </span>
            <span class="block px-2 py-1.5">
              <span class="flex items-center gap-1 text-sm font-semibold leading-tight">
                <span class="truncate">{{ dinoName(d) }}</span>
                <span v-if="popularity.get(d.name)" class="ml-auto shrink-0 text-ink-subtle" :title="`${popularity.get(d.name)} on the team`"><UiIcon name="users" :size="14" /><span class="sr-only">, on the team</span></span>
              </span>
              <span class="flex items-center gap-1 text-2xs text-ink-subtle mt-0.5 truncate">
                <span v-if="d.diet" :class="['w-1.5 h-1.5 rounded-full shrink-0', `bg-diet-${d.diet}`]" aria-hidden="true" />
                {{ cap(d.diet) || 'Unknown diet' }}
              </span>
            </span>
            <span v-if="modelValue === d.name" class="absolute right-1.5 top-1.5 w-6 h-6 rounded-full bg-accent text-on-accent grid place-items-center border-[1.5px] border-ink animate-pop-in">
              <UiIcon name="check" :size="14" :stroke="3" />
            </span>
          </button>
        </li>
      </ul>

      <div class="mt-4 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
        <button v-if="results.length > limit" type="button" class="inline-flex items-center gap-1.5 min-h-[44px] font-semibold link" @click="limit += 48">
          Show more ({{ results.length - limit }} left)
        </button>
        <span v-else />
        <button type="button" class="inline-flex items-center gap-1.5 min-h-[44px] text-sm font-semibold text-ink-muted hover:text-ink" @click="adding = true">
          <UiIcon name="plus" :size="16" /> Can't find yours? Add a dino that's not listed
        </button>
      </div>
    </template>
  </div>
</template>
