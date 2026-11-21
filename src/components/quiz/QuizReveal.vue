<!--
  Quiz reveal on the jungle stage: egg hatch -> top match, trait bars (you vs dino),
  why you matched, runners-up and actions. Presentational: the view owns saving/downloading.

  Props
    picks       [{ dino, score, matched, why }]  top 3, best first (index 0 is the best match)
    chosenId    id of the displayed dino (a runner-up can be chosen instead)
    you         userProfile(answers)
    animate     play the egg hatch (false when resuming after a reload)
    forId       preselected person id for "apply"
    persons     Person[]
    appliedFor  person id the displayed dino was just applied to ('' if none)
    saving, downloading   Boolean
  Emits: choose(dinoId), apply(personId), download, retake
-->
<script setup>
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { UiBadge, UiButton, UiCard, UiField, UiIcon, UiSelect, UiStatBar } from '../ui/index.js'
import { prefersReducedMotion } from '../ui/motion.js'
import { TRAIT_AXES, dinoKey, dinoLabel, traitProfile } from '../../lib/quiz/index.js'
import QuizDino from './QuizDino.vue'

const props = defineProps({
  picks: { type: Array, required: true },
  chosenId: { type: String, default: '' },
  you: { type: Object, required: true },
  animate: { type: Boolean, default: true },
  forId: { type: String, default: '' },
  persons: { type: Array, default: () => [] },
  appliedFor: { type: String, default: '' },
  saving: { type: Boolean, default: false },
  downloading: { type: Boolean, default: false },
})
const emit = defineEmits(['choose', 'apply', 'download', 'retake'])

const chosen = computed(() => props.picks.find((p) => dinoKey(p.dino) === props.chosenId) ?? props.picks[0])
const others = computed(() => props.picks.filter((p) => p !== chosen.value))
const dino = computed(() => chosen.value.dino)
const name = computed(() => dinoLabel(dino.value))
const profile = computed(() => traitProfile(dino.value))
const article = computed(() => (/^[aeio]/i.test(name.value) ? 'an' : 'a'))

// ── Hatch choreography: wobble 2 x 600ms, crack 450ms, pop ──────────────────────────────
const phase = ref('egg') // egg | crack | done
const fade = ref(false)  // reduced motion: simple fade
let timers = []
function play() {
  timers.forEach(clearTimeout)
  if (!props.animate || prefersReducedMotion()) {
    fade.value = true
    phase.value = 'done'
    return
  }
  phase.value = 'egg'
  timers = [setTimeout(() => (phase.value = 'crack'), 1200), setTimeout(() => (phase.value = 'done'), 1620)]
}

const title = ref(null)
const live = ref('')
watch(phase, async (p) => {
  if (p !== 'done') { live.value = 'Hatching your result.'; return }
  await nextTick()
  live.value = `Your match: ${name.value}, ${dino.value.personality?.archetype ?? ''}. ${dino.value.personality?.tagline ?? ''}`
  title.value?.focus({ preventScroll: false })
}, { immediate: true })
onMounted(play)
onBeforeUnmount(() => timers.forEach(clearTimeout))

// ── Confetti (14 pieces, deterministic) ─────────────────────────────────────────────────
const confetti = computed(() => {
  const p = dino.value.palette ?? {}
  const colors = ['#F5AE36', '#D2335F', p.body, p.accent, '#FFFFFF', p.belly].filter(Boolean)
  return Array.from({ length: 14 }, (_, i) => ({
    left: 6 + ((i * 37) % 88),
    delay: (i * 53) % 280,
    drift: `${((i % 5) - 2) * 14}px`,
    color: colors[i % colors.length],
    shape: i % 3,
  }))
})
const showConfetti = computed(() => phase.value === 'done' && !fade.value && props.animate)

// ── Apply ───────────────────────────────────────────────────────────────────────────────
const target = ref(props.forId)
watch(() => props.forId, (v) => { if (v) target.value = v })
const personOptions = computed(() => [
  { value: '', label: 'Pick a teammate', disabled: true },
  ...[...props.persons].sort((a, b) => a.name.localeCompare(b.name)).map((p) => ({ value: p.id, label: p.name })),
])
const targetPerson = computed(() => props.persons.find((p) => p.id === target.value) ?? null)
const firstName = (p) => p?.name.split(/\s+/)[0] ?? ''
const appliedPerson = computed(() => props.persons.find((p) => p.id === props.appliedFor) ?? null)
const eyebrow = computed(() => {
  const p = props.persons.find((x) => x.id === props.forId)
  return p ? `${firstName(p)}'s dino` : 'Your dino'
})

function tintBg(d) {
  const belly = d.palette?.belly ?? '#FFEBC2'
  return { background: `color-mix(in srgb, ${belly} 62%, #ffffff)` }
}
</script>

<template>
  <div class="theme-jungle bg-bg text-ink reveal-bleed">
    <div class="sr-only" aria-live="polite" aria-atomic="true">{{ live }}</div>

    <!-- Egg -->
    <div v-if="phase !== 'done'" class="min-h-[70dvh] grid place-items-center px-4">
      <div class="text-center">
        <div class="relative w-36 h-48 sm:w-44 sm:h-56 mx-auto">
          <svg viewBox="0 0 112 144" :class="['absolute inset-0 w-full h-full origin-bottom', phase === 'egg' ? 'animate-egg-wobble' : '']" aria-hidden="true">
            <g :class="phase === 'crack' ? 'animate-shell-left' : ''" style="transform-origin: 30% 60%">
              <path d="M56 6C30 6 8 52 8 86c0 30 21 52 48 52V6z" fill="#FFF7E6" stroke="#071D1B" stroke-width="3" />
              <circle cx="30" cy="70" r="6" fill="#97C8B8" /><circle cx="22" cy="100" r="4" fill="#97C8B8" />
            </g>
            <g :class="phase === 'crack' ? 'animate-shell-right' : ''" style="transform-origin: 70% 60%">
              <path d="M56 6c26 0 48 46 48 80 0 30-21 52-48 52V6z" fill="#FFF7E6" stroke="#071D1B" stroke-width="3" />
              <circle cx="80" cy="56" r="7" fill="#97C8B8" /><circle cx="86" cy="96" r="5" fill="#97C8B8" />
            </g>
            <path d="M30 78l12 8 10-10 10 10 10-8 12 8" fill="none" stroke="#071D1B" stroke-width="3" stroke-linejoin="round" />
          </svg>
        </div>
        <p class="mt-6 font-display text-display-xs text-ink-muted" aria-hidden="true">Something is hatching…</p>
      </div>
    </div>

    <!-- Result -->
    <div v-else :class="['max-w-6xl mx-auto px-4 sm:px-6 py-5 md:py-12', fade ? 'animate-fade-in' : '']">
      <div class="grid lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] gap-5 sm:gap-8 lg:gap-14 items-start">
        <!-- Hero sticker -->
        <div class="relative mx-auto w-full max-w-[10.5rem] sm:max-w-[22rem] lg:max-w-none">
          <div
            :key="dinoKey(dino)"
            :class="['sticker relative aspect-square p-[9%] mx-auto', fade ? '' : 'animate-hatch-pop']"
            :style="{ ...tintBg(dino), '--tilt': '-2deg', borderRadius: '9999px' }"
          >
            <QuizDino :dino="dino" :label="`Illustration of ${name}`" />
          </div>
          <template v-if="showConfetti">
            <span
              v-for="(c, i) in confetti" :key="i"
              class="absolute top-0 w-2.5 h-2.5 animate-confetti-fall pointer-events-none"
              :class="c.shape === 0 ? 'rounded-full' : c.shape === 1 ? 'rounded-[2px]' : 'rounded-[1px] h-1 w-3'"
              :style="{ left: `${c.left}%`, background: c.color, '--drift': c.drift, animationDelay: `${c.delay}ms` }"
              aria-hidden="true"
            />
          </template>
        </div>

        <!-- Headline and actions -->
        <div class="reveal-in" style="--d: 160ms">
          <p class="text-ink-subtle font-semibold">{{ eyebrow }}</p>
          <h1 ref="title" tabindex="-1" class="mt-1 font-display text-display-md sm:text-display-lg outline-none">
            You're {{ article }} {{ name }}
          </h1>
          <div class="mt-3 flex flex-wrap items-center gap-2">
            <span class="inline-flex items-center px-3 py-1 rounded-full bg-primary text-on-primary border-[1.5px] border-jungle-950 text-sm font-bold">{{ dino.personality?.archetype }}</span>
            <UiBadge variant="diet" :value="dino.diet" dot />
            <UiBadge variant="period" :value="dino.period" dot />
          </div>
          <p class="mt-4 text-xl text-ink leading-snug max-w-xl">{{ dino.personality?.tagline }}</p>
          <ul class="mt-4 flex flex-wrap gap-2" aria-label="Strengths">
            <li v-for="s in dino.personality?.strengths ?? []" :key="s" class="px-3 py-1.5 rounded-full bg-surface-raised border border-line-strong text-sm font-semibold">{{ s }}</li>
          </ul>

          <!-- Apply -->
          <div class="mt-7 rounded-lg bg-surface-sunken p-4 sm:p-5 max-w-xl">
            <template v-if="persons.length">
              <div v-if="appliedPerson" class="flex flex-wrap items-center gap-3">
                <span class="inline-flex items-center gap-2 font-semibold text-success">
                  <UiIcon name="check" :size="20" /> {{ firstName(appliedPerson) }} is now {{ article }} {{ name }}
                </span>
                <UiButton size="sm" variant="secondary" :to="`/people/${appliedPerson.id}`">View profile</UiButton>
              </div>
              <div v-else class="flex flex-col sm:flex-row sm:items-end gap-3">
                <div class="flex-1">
                  <UiField label="Give this dino to">
                    <UiSelect v-model="target" :options="personOptions" />
                  </UiField>
                </div>
                <UiButton size="lg" :disabled="!target" :loading="saving" @click="emit('apply', target)">
                  {{ targetPerson ? `Apply to ${firstName(targetPerson)}` : 'Apply' }}
                </UiButton>
              </div>
            </template>
            <p v-else class="text-ink-muted">
              No teammates yet. <RouterLink class="link" to="/people/new">Add one</RouterLink> to keep this result.
            </p>
          </div>

          <div class="mt-4 flex flex-wrap gap-3">
            <UiButton variant="secondary" icon="download" :loading="downloading" @click="emit('download')">Save result card</UiButton>
            <UiButton variant="secondary" icon="book" :to="`/dinopedia/${dinoKey(dino)}`">Open in Dinopedia</UiButton>
            <UiButton variant="ghost" icon="undo" @click="emit('retake')">Retake quiz</UiButton>
          </div>
        </div>
      </div>

      <!-- Details -->
      <div class="mt-12 grid lg:grid-cols-2 gap-6 items-start reveal-in" style="--d: 320ms">
        <div class="space-y-6">
          <UiCard variant="paper" as="section" aria-labelledby="why-title">
            <h2 id="why-title" class="font-display text-display-xs">Why you matched</h2>
            <ul class="mt-4 space-y-3">
              <li v-for="w in chosen.why" :key="w" class="flex gap-3 items-start">
                <span class="mt-0.5 grid place-items-center w-6 h-6 rounded-full bg-primary text-on-primary shrink-0"><UiIcon name="check" :size="14" :stroke="3" /></span>
                <span class="text-base">{{ w }}</span>
              </li>
            </ul>
            <p v-if="dino.personality?.quirk" class="mt-5 pt-4 border-t border-line text-ink-muted"><span class="font-semibold text-ink">The quirk:</span> {{ dino.personality.quirk }}</p>
          </UiCard>

          <section aria-labelledby="runner-title">
            <h2 id="runner-title" class="font-display text-display-xs">Close behind</h2>
            <div class="mt-4 space-y-3">
              <UiCard v-for="p in others" :key="dinoKey(p.dino)" variant="flat" padding="sm">
                <div class="flex items-center gap-4">
                  <div class="w-20 h-20 shrink-0 rounded-full p-1.5 shadow-diecut" :style="tintBg(p.dino)">
                    <QuizDino :dino="p.dino" />
                  </div>
                  <div class="min-w-0 flex-1">
                    <p class="font-display text-display-xs leading-tight truncate">{{ dinoLabel(p.dino) }}</p>
                    <p class="text-sm text-ink-muted">{{ p.dino.personality?.archetype }}</p>
                    <UiButton class="mt-1 -ml-3" size="sm" variant="ghost" :aria-label="`Choose ${dinoLabel(p.dino)} instead`" @click="emit('choose', dinoKey(p.dino))">
                      Choose this one instead
                    </UiButton>
                  </div>
                </div>
              </UiCard>
              <p v-if="chosen !== picks[0]" class="text-sm text-ink-muted">
                Your best match was {{ dinoLabel(picks[0].dino) }}.
                <button type="button" class="link font-semibold" @click="emit('choose', dinoKey(picks[0].dino))">Go back to it</button>
              </p>
            </div>
          </section>
        </div>

        <UiCard variant="paper" as="section" aria-labelledby="traits-title">
          <div class="flex items-baseline justify-between gap-3 flex-wrap">
            <h2 id="traits-title" class="font-display text-display-xs">You and {{ name }}</h2>
            <p class="text-xs text-ink-subtle">Round marker: {{ name }}. Thin bar: you.</p>
          </div>
          <div class="mt-5 space-y-5">
            <UiStatBar
              v-for="ax in TRAIT_AXES"
              :key="ax.key"
              :label="ax.label"
              :min-label="ax.minLabel"
              :max-label="ax.maxLabel"
              :value="profile[ax.key]"
              :compare="you[ax.key]"
            />
          </div>
        </UiCard>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Full-bleed jungle stage that also swallows the phone tab-bar padding of <main>. */
.reveal-bleed { min-height: calc(100dvh - var(--nav-h, 64px)); }
@media (max-width: 767.98px) {
  .reveal-bleed {
    margin-bottom: calc(-1 * (var(--tabbar-h) + env(safe-area-inset-bottom) + 24px));
    padding-bottom: calc(var(--tabbar-h) + env(safe-area-inset-bottom) + 24px);
  }
}
.reveal-in { animation: reveal-in 420ms var(--ease-out) both; animation-delay: var(--d, 0ms); }
@keyframes reveal-in { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
</style>
