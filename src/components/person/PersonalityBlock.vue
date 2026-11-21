<!-- PersonalityBlock: archetype strengths, quirk and team role. Empty-safe. -->
<script setup>
import { cap } from '../dinopedia/dinoUtils.js'
defineProps({ personality: { type: Object, default: null }, heading: { type: String, default: 'Personality' } })
</script>

<template>
  <div>
    <h2 class="font-display text-display-xs">{{ heading }}</h2>
    <template v-if="personality">
      <p v-if="heading !== personality.archetype" class="mt-1 text-ink-muted">{{ personality.archetype }}</p>
      <h3 class="mt-5 font-sans text-sm font-semibold text-ink-subtle">Strengths</h3>
      <ul class="mt-2 flex flex-wrap gap-2">
        <li v-for="(s, i) in personality.strengths" :key="s" :class="['inline-flex items-center h-8 px-3 rounded-full border-[1.5px] border-ink font-semibold text-sm', ['bg-fern-100', 'bg-resin-100', 'bg-lagoon-100'][i % 3]]">{{ cap(s) }}</li>
      </ul>
      <dl class="mt-5 space-y-4">
        <div v-if="personality.quirk">
          <dt class="text-sm font-semibold text-ink-subtle">Quirk</dt>
          <dd class="mt-0.5">{{ personality.quirk }}</dd>
        </div>
        <div v-if="personality.teamRole">
          <dt class="text-sm font-semibold text-ink-subtle">On the team</dt>
          <dd class="mt-0.5">{{ cap(personality.teamRole) }}</dd>
        </div>
      </dl>
    </template>
    <p v-else class="mt-2 text-ink-muted">
      This dino is off the record: no personality file yet. That just means you get to write your own in the note below.
    </p>
  </div>
</template>
