<!--
  CompatList: this person vs each teammate. Labels only, never scores.
-->
<script setup>
import { computed } from 'vue'
import { UiIcon } from '../ui/index.js'
import PersonAvatar from './PersonAvatar.vue'
import { compatibility } from '../layout/contracts.js'
import { useAppData } from '../layout/useAppData.js'
import { usePersonStore } from '../../stores/personStore.js'
import { dinoName, firstName } from '../dinopedia/dinoUtils.js'
import { COMPAT_STYLE } from '../insights/compatStyle.js'

const props = defineProps({ person: { type: Object, required: true }, dino: { type: Object, default: null } })
const personStore = usePersonStore()
const data = useAppData()

const ORDER = { kindred: 0, balance: 1, spicy: 2, eras: 3 }
const rows = computed(() => {
  if (!props.dino?.traits) return []
  return personStore.persons
    .filter((p) => p.id !== props.person.id)
    .map((p) => {
      const d = data.dinoFor(p)
      return { p, d, r: d ? compatibility(props.dino, d) : null }
    })
    .sort((a, b) => (a.r ? ORDER[a.r.key] : 9) - (b.r ? ORDER[b.r.key] : 9) || a.p.name.localeCompare(b.p.name))
})
const others = computed(() => personStore.persons.filter((p) => p.id !== props.person.id).length)
</script>

<template>
  <div>
    <p v-if="!dino?.traits" class="text-ink-muted max-w-[56ch]">
      Compatibility reads dino personalities, and {{ dino ? `${dinoName(dino)} doesn't have one on file` : `${firstName(person.name)} has no dino yet` }}.
      Pick a dino from the Dinopedia list to see how {{ firstName(person.name) }} fits with the team.
    </p>
    <p v-else-if="!others" class="text-ink-muted">No teammates to compare with yet. <RouterLink to="/people/new" class="link font-semibold">Add one</RouterLink>.</p>
    <ul v-else class="divide-y divide-line rounded-lg border-[1.5px] border-ink bg-surface overflow-hidden">
      <li v-for="{ p, d, r } in rows" :key="p.id">
        <RouterLink :to="`/people/${p.id}`" class="group flex items-center gap-3 sm:gap-4 px-3 sm:px-4 py-3 hover:bg-surface-sunken transition-colors">
          <div class="w-12 h-12 sm:w-14 sm:h-14 shrink-0 rounded-md overflow-hidden border-[1.5px] border-ink">
            <PersonAvatar :person="p" :dino="d" :size="112" alt="" />
          </div>
          <div class="min-w-0 flex-1">
            <span v-if="r" :class="['sm:hidden mb-1 inline-flex items-center gap-1 h-6 px-2 rounded-full border text-2xs font-semibold', COMPAT_STYLE[r.key].pill]">
              <UiIcon :name="COMPAT_STYLE[r.key].icon" :size="12" /> {{ r.label }}
            </span>
            <p class="font-semibold truncate">{{ p.name }} <span class="font-normal text-ink-subtle">· {{ d ? dinoName(d) : 'no dino yet' }}</span></p>
            <p class="text-sm text-ink-muted line-clamp-2">{{ r ? r.reasons[0] : d ? 'Off-catalog dino, so no reading for this pair.' : 'Still in the egg.' }}</p>
          </div>
          <span v-if="r" :class="['hidden sm:inline-flex shrink-0 items-center gap-1.5 h-7 px-2.5 rounded-full border-[1.5px] text-xs font-semibold whitespace-nowrap', COMPAT_STYLE[r.key].pill]">
            <UiIcon :name="COMPAT_STYLE[r.key].icon" :size="14" /> {{ r.label }}
          </span>
          <UiIcon name="chevron-right" :size="18" class="shrink-0 text-ink-subtle group-hover:text-ink hidden sm:block" />
        </RouterLink>
      </li>
    </ul>
  </div>
</template>
