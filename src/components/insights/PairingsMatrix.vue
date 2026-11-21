<!--
  PairingsMatrix: every pair of teammates with a compatibility label.
  Desktop: lower-triangle matrix with avatars on both axes (cells reveal the reason in a
  tooltip and in a detail line below). Phones: a list.
-->
<script setup>
import { computed, ref } from 'vue'
import { UiIcon, UiTooltip } from '../ui/index.js'
import PersonAvatar from '../person/PersonAvatar.vue'
import { COMPAT_STYLE } from './compatStyle.js'
import { firstName } from '../dinopedia/dinoUtils.js'

const props = defineProps({
  pairs: { type: Array, required: true }, // [{ a, b, result }]
  people: { type: Array, required: true }, // [{ person, dino }] with traits, in display order
})

const key = (a, b) => [a, b].sort().join('|')
const byKey = computed(() => new Map(props.pairs.map((p) => [key(p.a.id, p.b.id), p])))
const cell = (a, b) => byKey.value.get(key(a.id, b.id)) ?? null
const selected = ref(props.pairs[0] ?? null)
const showAll = ref(false)
const listPairs = computed(() => (showAll.value ? props.pairs : props.pairs.slice(0, 10)))
const MATRIX_MAX = 14
const canMatrix = computed(() => props.people.length >= 2 && props.people.length <= MATRIX_MAX)

const counts = computed(() => {
  const c = { kindred: 0, balance: 0, spicy: 0, eras: 0 }
  for (const p of props.pairs) c[p.result.key]++
  return c
})
const LEGEND = [
  { key: 'kindred', label: 'Kindred spirits' },
  { key: 'balance', label: 'Great balance' },
  { key: 'spicy', label: 'Spicy combo' },
  { key: 'eras', label: 'Different eras' },
]
const tip = (p) => `${firstName(p.a.name)} + ${firstName(p.b.name)}: ${p.result.label}`
</script>

<template>
  <div>
    <ul class="flex flex-wrap gap-x-5 gap-y-2 mb-5 text-sm" aria-label="Legend">
      <li v-for="l in LEGEND" :key="l.key" class="inline-flex items-center gap-2">
        <span class="w-6 h-6 rounded-sm border border-ink/40 grid place-items-center" :style="{ background: COMPAT_STYLE[l.key].cell, color: COMPAT_STYLE[l.key].ink }"><UiIcon :name="COMPAT_STYLE[l.key].icon" :size="14" /></span>
        <span class="font-semibold">{{ l.label }}</span><span class="text-ink-subtle tabular">{{ counts[l.key] }}</span>
      </li>
    </ul>

    <!-- Matrix (md+) -->
    <div v-if="canMatrix" class="hidden md:flex md:flex-col lg:flex-row lg:items-start gap-6 lg:gap-10 pb-2">
      <div class="overflow-x-auto shrink-0">
      <table class="border-separate" style="border-spacing: 4px">
        <caption class="sr-only">Compatibility between each pair of teammates</caption>
        <tbody>
          <tr v-for="(r, i) in people" :key="r.person.id">
            <th scope="row" class="pr-2 text-right font-semibold text-sm whitespace-nowrap">
              <span class="inline-flex items-center gap-2">{{ firstName(r.person.name) }}
                <span class="inline-block w-9 h-9 rounded-md overflow-hidden border-[1.5px] border-ink align-middle"><PersonAvatar :person="r.person" :dino="r.dino" :size="72" alt="" /></span>
              </span>
            </th>
            <td v-for="(c, j) in people.slice(0, i)" :key="c.person.id" class="p-0">
              <UiTooltip v-if="cell(r.person, c.person)" :text="tip(cell(r.person, c.person))">
                <button
                  type="button"
                  class="w-11 h-11 rounded-md border-[1.5px] grid place-items-center transition-transform duration-fast hover:scale-110 hover:z-10"
                  :class="selected === cell(r.person, c.person) ? 'border-ink ring-2 ring-accent' : 'border-ink/30'"
                  :style="{ background: COMPAT_STYLE[cell(r.person, c.person).result.key].cell, color: COMPAT_STYLE[cell(r.person, c.person).result.key].ink }"
                  :aria-label="`${tip(cell(r.person, c.person))}. ${cell(r.person, c.person).result.reasons[0]}`"
                  @click="selected = cell(r.person, c.person)"
                  @focus="selected = cell(r.person, c.person)"
                  @mouseenter="selected = cell(r.person, c.person)"
                >
                  <UiIcon :name="COMPAT_STYLE[cell(r.person, c.person).result.key].icon" :size="18" />
                </button>
              </UiTooltip>
            </td>
          </tr>
          <tr>
            <th />
            <td v-for="c in people.slice(0, -1)" :key="c.person.id" class="align-top text-center p-0">
              <span class="inline-block w-9 h-9 rounded-md overflow-hidden border-[1.5px] border-ink"><PersonAvatar :person="c.person" :dino="c.dino" :size="72" alt="" /></span>
              <span class="block mt-1 text-2xs font-semibold max-w-[44px] truncate mx-auto">{{ firstName(c.person.name) }}</span>
            </td>
          </tr>
        </tbody>
      </table>
      </div>
      <div class="lg:flex-1 lg:sticky lg:top-24 min-h-[3.5rem] rounded-md bg-surface-sunken px-4 py-3 lg:px-5 lg:py-5" aria-live="polite">
        <template v-if="selected">
          <p class="font-display text-xl">{{ firstName(selected.a.name) }} + {{ firstName(selected.b.name) }}</p>
          <p :class="['mt-2 inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full border-[1.5px] text-xs font-semibold', COMPAT_STYLE[selected.result.key].pill]"><UiIcon :name="COMPAT_STYLE[selected.result.key].icon" :size="14" /> {{ selected.result.label }}</p>
          <p class="mt-2 text-sm text-ink-muted">{{ selected.result.blurb }}</p>
          <ul class="mt-3 space-y-1 text-sm list-disc pl-5"><li v-for="r in selected.result.reasons" :key="r">{{ r }}</li></ul>
        </template>
        <p v-else class="text-sm text-ink-muted py-2">Point at a square to see why a pair got its label.</p>
      </div>
    </div>

    <!-- List (phones, or big teams) -->
    <ul :class="['divide-y divide-line rounded-md border border-line bg-surface', canMatrix ? 'md:hidden' : '']">
      <li v-for="p in listPairs" :key="key(p.a.id, p.b.id)" class="flex items-start gap-3 px-3 py-3">
        <span class="mt-0.5 w-8 h-8 shrink-0 rounded-sm border border-ink/40 grid place-items-center" :style="{ background: COMPAT_STYLE[p.result.key].cell, color: COMPAT_STYLE[p.result.key].ink }" aria-hidden="true">
          <UiIcon :name="COMPAT_STYLE[p.result.key].icon" :size="16" />
        </span>
        <span class="min-w-0">
          <span class="block font-semibold">{{ firstName(p.a.name) }} + {{ firstName(p.b.name) }}: {{ p.result.label }}</span>
          <span class="block text-sm text-ink-muted">{{ p.result.reasons[0] }}</span>
        </span>
      </li>
    </ul>
    <button v-if="pairs.length > 10 && !showAll" type="button" :class="['mt-3 min-h-[44px] font-semibold link', canMatrix ? 'md:hidden' : '']" @click="showAll = true">
      Show all {{ pairs.length }} pairings
    </button>
  </div>
</template>
