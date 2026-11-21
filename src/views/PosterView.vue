<!--
  PosterView: A3 landscape team wall. The sheet is laid out in millimetres so the
  printed poster matches the screen preview, which is scaled to fit.
-->
<script setup>
import { computed } from 'vue'
import { UiButton, UiEmptyState, UiSkeleton, prefersReducedMotion } from '../components/ui/index.js'
import PersonAvatar from '../components/person/PersonAvatar.vue'
import PrintToolbar from '../components/insights/PrintToolbar.vue'
import { useFitScale } from '../components/insights/useFitScale.js'
import { teamStats } from '../components/insights/stats.js'
import ErrorState from '../components/layout/ErrorState.vue'
import { SPOTS } from '../components/layout/spots.js'
import { useAppData } from '../components/layout/useAppData.js'
import { dinoName } from '../components/dinopedia/dinoUtils.js'
import { usePersonStore } from '../stores/personStore.js'
import { useTeamStore } from '../stores/teamStore.js'

const personStore = usePersonStore()
const team = useTeamStore()
const data = useAppData()

const SHEET_W = 400 // mm (A3 landscape minus 10 mm margins)
const SHEET_H = 277
const { host, scale, MM } = useFitScale(SHEET_W, { padding: 0 })

const rows = computed(() => [...personStore.persons]
  .sort((a, b) => a.name.localeCompare(b.name))
  .map((person) => ({ person, dino: data.dinoFor(person) })))
const stats = computed(() => teamStats(rows.value))

// Grid geometry: pick columns so cards stay as big as the sheet allows.
const grid = computed(() => {
  const n = Math.max(1, rows.value.length)
  const areaW = SHEET_W - 32, areaH = SHEET_H - 82 // padding, header, footer
  let best = { cols: 1, size: 0 }
  for (let cols = 1; cols <= Math.min(n, 10); cols++) {
    const r = Math.ceil(n / cols)
    const gap = 8
    const cardW = (areaW - gap * (cols - 1)) / cols
    const cardH = (areaH - gap * (r - 1)) / r
    const avatar = Math.min(cardW * 0.78, cardH - 22) // 22 mm for text under the avatar
    if (avatar > best.size) best = { cols, size: avatar }
  }
  return { cols: best.cols, avatar: Math.min(best.size, 62) }
})
const nameSize = computed(() => Math.max(4.2, Math.min(7.4, grid.value.avatar * 0.13)))

const footer = computed(() => {
  const s = stats.value
  const parts = [`${s.total} ${s.total === 1 ? 'teammate' : 'teammates'}`]
  if (s.dietLine) parts.push(s.dietLine)
  if (s.totalLength) parts.push(`${Math.round(s.totalLength)} m of dino, nose to tail`)
  return parts.join(' · ')
})
const animate = !prefersReducedMotion()
const TILTS = [-2.5, 1.8, -1.2, 2.4, -1.8, 1.2, 2, -2]
</script>

<template>
  <div class="min-h-dvh bg-[#CDD2BE] print:bg-white">
    <PrintToolbar title="Team poster" hint="A3 landscape. In the print dialog, pick A3 and turn on background graphics." />

    <div v-if="data.loading.value" class="p-6 max-w-[1400px] mx-auto" aria-busy="true"><UiSkeleton shape="rect" height="70vh" /></div>
    <ErrorState v-else-if="data.failed.value" @retry="data.retry()" />
    <UiEmptyState v-else-if="!rows.length" title="An empty wall" text="Add teammates first; the poster fills itself in." :image="SPOTS.emptyRoster">
      <template #action><UiButton to="/people/new" icon="plus">Add teammate</UiButton></template>
    </UiEmptyState>

    <div v-else ref="host" class="poster-host mx-auto max-w-[1400px] px-3 sm:px-6 py-6 sm:py-10">
      <div class="poster-frame" :style="{ height: `${SHEET_H * MM * scale}px` }">
        <article
          class="poster print-poster"
          :style="{ transform: `scale(${scale})` }"
          :aria-label="`${team.name} team poster`"
        >
          <header class="poster__head">
            <img :src="SPOTS.logoMark" alt="" class="poster__logo" />
            <div class="min-w-0">
              <h2 class="poster__title">{{ team.name }}</h2>
              <p class="poster__sub">{{ stats.headline }} · {{ team.year }}</p>
            </div>
          </header>

          <ul class="poster__grid" :style="{ gridTemplateColumns: `repeat(${grid.cols}, minmax(0, 1fr))` }">
            <li
              v-for="({ person, dino }, i) in rows"
              :key="person.id"
              :class="['poster__card print-card', animate ? 'poster__slap' : '']"
              :style="{ '--tilt': `${TILTS[i % TILTS.length]}deg`, animationDelay: `${i * 60}ms` }"
            >
              <div class="poster__sticker" :style="{ width: `${grid.avatar}mm`, height: `${grid.avatar}mm` }">
                <PersonAvatar :person="person" :dino="dino" :size="400" />
              </div>
              <p class="poster__name" :style="{ fontSize: `${nameSize}mm` }">{{ person.name }}</p>
              <p class="poster__dino">{{ dino ? dinoName(dino) : 'Still in the egg' }}</p>
              <p v-if="dino?.personality" class="poster__arch">{{ dino.personality.archetype }}</p>
            </li>
          </ul>

          <footer class="poster__foot">
            <span>{{ footer }}</span>
            <span>Dino Selector</span>
          </footer>
        </article>
      </div>
    </div>
  </div>
</template>

<style scoped>
.poster-frame { position: relative; }
.poster {
  position: absolute;
  left: 0;
  top: 0;
  transform-origin: top left;
  width: 400mm;
  height: 277mm;
  display: flex;
  flex-direction: column;
  background-color: #F7F8F1;
  background-image: radial-gradient(rgb(30 36 32 / 0.10) 0.35mm, transparent 0.4mm);
  background-size: 6mm 6mm;
  color: #1E2420;
  border-radius: 3mm;
  box-shadow: 0 18px 40px -14px rgb(11 43 40 / 0.45);
  overflow: hidden;
}
.poster__head {
  display: flex;
  align-items: center;
  gap: 7mm;
  padding: 9mm 16mm 7mm;
  background: #0F3934;
  color: #F7F8F1;
  border-bottom: 0.6mm solid #071D1B;
}
.poster__logo { width: 22mm; height: 22mm; flex: none; }
.poster__title {
  font-family: 'Caprasimo', serif;
  font-size: 72pt;
  line-height: 0.95;
  letter-spacing: -0.02em;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.poster__sub { margin-top: 2mm; font-size: 15pt; font-weight: 600; color: #C9E3DA; }
.poster__grid {
  flex: 1;
  display: grid;
  gap: 8mm;
  align-content: center;
  justify-items: center;
  padding: 8mm 16mm 4mm;
  list-style: none;
}
.poster__card { display: flex; flex-direction: column; align-items: center; text-align: center; min-width: 0; max-width: 100%; }
.poster__sticker {
  border-radius: 5mm;
  overflow: hidden;
  box-shadow: 0 0 0 1.3mm #fff, 1.3mm 1.8mm 0 1.3mm rgb(11 43 40 / 0.9);
  transform: rotate(var(--tilt));
}
.poster__slap { animation: slap 420ms var(--ease-spring) both; }
@keyframes slap {
  0% { opacity: 0; transform: scale(1.35); }
  55% { opacity: 1; transform: scale(0.96); }
  100% { transform: none; }
}
.poster__name {
  margin-top: 4.5mm;
  font-family: 'Caprasimo', serif;
  line-height: 1.05;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.poster__dino { margin-top: 0.8mm; font-size: 10.5pt; font-weight: 700; color: #434B40; }
.poster__arch { margin-top: 0.6mm; font-size: 9pt; color: #5D6657; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
.poster__foot {
  display: flex;
  justify-content: space-between;
  gap: 8mm;
  padding: 4mm 16mm 6mm;
  font-size: 10pt;
  font-weight: 600;
  color: #434B40;
  border-top: 0.3mm solid #CDD2BE;
}

@media print {
  .poster-host { padding: 0 !important; max-width: none !important; }
  .poster-frame { height: auto !important; }
  .poster {
    position: static;
    transform: none !important;
    border-radius: 0;
    box-shadow: none !important;
  }
  .poster__sticker { box-shadow: 0 0 0 1.3mm #fff, 0 0 0 1.6mm #1E2420 !important; }
  .poster__slap { animation: none !important; }
}
</style>
