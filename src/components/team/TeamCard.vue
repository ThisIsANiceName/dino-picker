<!--
  TeamCard: one teammate on the Team wall. Links to the profile; a teammate
  without a dino links to the quiz preselected for them.
-->
<script setup>
import { computed } from 'vue'
import { UiBadge, UiCard } from '../ui/index.js'
import PersonAvatar from '../person/PersonAvatar.vue'
import { dinoName } from '../dinopedia/dinoUtils.js'

const props = defineProps({
  person: { type: Object, required: true },
  dino: { type: Object, default: null },
  tilt: { type: Number, default: 0 },
  slap: { type: Boolean, default: false },
})

const to = computed(() => (props.dino || props.person.dinoName ? `/people/${props.person.id}` : `/quiz?for=${encodeURIComponent(props.person.id)}`))
const archetype = computed(() => props.dino?.personality?.archetype ?? '')
const label = computed(() => {
  const d = props.dino ? dinoName(props.dino) : props.person.dinoName ? props.person.dinoName : 'no dino yet'
  return `${props.person.name}, ${d}${archetype.value ? `, ${archetype.value}` : ''}`
})
</script>

<template>
  <UiCard
    :to="to"
    padding="none"
    :tilt="tilt"
    :aria-label="label"
    :class="['team-card group h-full', slap ? 'animate-sticker-slap' : '']"
    :style="{ '--tilt': `${tilt}deg` }"
  >
    <div class="p-2.5 pb-0">
      <div class="team-card__art relative rounded-[13px] overflow-hidden border-[1.5px] border-ink">
        <PersonAvatar :person="person" :dino="dino" :size="320" class="team-card__avatar" />
        <UiBadge v-if="!person.dinoName" variant="accent" size="sm" class="absolute left-2 top-2">Needs a dino</UiBadge>
      </div>
    </div>
    <div class="px-3.5 pt-3 pb-4 min-w-0">
      <h3 class="font-display text-lg sm:text-xl leading-tight line-clamp-2 break-words" :title="person.name">{{ person.name }}</h3>
      <p class="mt-0.5 text-sm font-semibold text-ink-muted truncate">
        <template v-if="dino">{{ dinoName(dino) }}</template>
        <template v-else-if="person.dinoName">{{ person.dinoName }}</template>
        <template v-else>Take the quiz to hatch one</template>
      </p>
      <p v-if="archetype" class="mt-2.5">
        <span class="inline-block max-w-full truncate align-top rounded-full bg-surface-sunken border border-line px-2.5 py-1 text-xs font-semibold text-ink-muted">{{ archetype }}</span>
      </p>
    </div>
  </UiCard>
</template>

<style scoped>
.team-card:hover .team-card__avatar,
.team-card:focus-visible .team-card__avatar {
  animation: card-bob 3.2s var(--ease-in-out) 1;
}
@keyframes card-bob {
  0%, 100% { transform: translateY(0); }
  25% { transform: translateY(-5px); }
  50% { transform: translateY(0); }
}
</style>
