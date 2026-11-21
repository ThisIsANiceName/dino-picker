<!--
  NameCardsView: A4 portrait sheets of 2 x 4 folded tent cards (95 x 65 mm).
  Cut along the dashed lines, fold along the dotted line; the top half is upside
  down so the card reads from both sides of the table.
-->
<script setup>
import { computed } from 'vue'
import { UiButton, UiEmptyState, UiSkeleton } from '../components/ui/index.js'
import PersonAvatar from '../components/person/PersonAvatar.vue'
import PrintToolbar from '../components/insights/PrintToolbar.vue'
import { useFitScale } from '../components/insights/useFitScale.js'
import ErrorState from '../components/layout/ErrorState.vue'
import { SPOTS } from '../components/layout/spots.js'
import { useAppData } from '../components/layout/useAppData.js'
import { dinoName } from '../components/dinopedia/dinoUtils.js'
import { usePersonStore } from '../stores/personStore.js'
import { useTeamStore } from '../stores/teamStore.js'

const personStore = usePersonStore()
const team = useTeamStore()
const data = useAppData()

const SHEET_W = 210, SHEET_H = 297
const { host, scale, MM } = useFitScale(SHEET_W, { max: 1 })

function askAbout(dino, person) {
  const q = dino?.personality?.quirk
  if (q) return q.replace(/\.$/, '')
  if (dino?.personality?.strengths?.length) return dino.personality.strengths.join(', ')
  if (dino) return `why I'm a ${dinoName(dino)}`
  return person.note ? person.note.split(/(?<=[.!?])\s/)[0].replace(/\.$/, '') : 'which dino I should be'
}

const cards = computed(() => [...personStore.persons]
  .sort((a, b) => a.name.localeCompare(b.name))
  .map((person) => {
    const dino = data.dinoFor(person)
    return { person, dino, ask: askAbout(dino, person) }
  }))
const sheets = computed(() => {
  const out = []
  for (let i = 0; i < cards.value.length; i += 8) out.push(cards.value.slice(i, i + 8))
  return out
})
</script>

<template>
  <div class="min-h-dvh bg-[#CDD2BE] print:bg-white">
    <PrintToolbar title="Name cards" :hint="`${cards.length} cards on ${sheets.length} A4 ${sheets.length === 1 ? 'sheet' : 'sheets'}. Cut on dashes, fold on dots.`" />

    <div v-if="data.loading.value" class="p-6 max-w-[900px] mx-auto" aria-busy="true"><UiSkeleton shape="rect" height="80vh" /></div>
    <ErrorState v-else-if="data.failed.value" @retry="data.retry()" />
    <UiEmptyState v-else-if="!cards.length" title="No names to fold" text="Add teammates first, then print their tent cards." :image="SPOTS.emptyRoster">
      <template #action><UiButton to="/people/new" icon="plus">Add teammate</UiButton></template>
    </UiEmptyState>

    <div v-else ref="host" class="nc-host mx-auto max-w-[860px] px-3 sm:px-6 py-6 sm:py-10 space-y-8 print:space-y-0">
      <div v-for="(sheet, si) in sheets" :key="si" class="nc-frame" :style="{ height: `${SHEET_H * MM * scale}px` }">
        <section :class="['nc-sheet print-cards', si < sheets.length - 1 ? 'print-break' : '']" :style="{ transform: `scale(${scale})` }" :aria-label="`Sheet ${si + 1} of ${sheets.length}`">
          <div v-for="c in sheet" :key="c.person.id" class="nc-card print-card">
            <!-- Back face (upside down when laid flat) -->
            <div class="nc-face nc-face--flip" aria-hidden="true">
              <div class="nc-avatar"><PersonAvatar :person="c.person" :dino="c.dino" :size="200" alt="" /></div>
              <div class="nc-text">
                <p class="nc-name" :style="c.person.name.length > 17 ? { fontSize: '11.5pt' } : undefined">{{ c.person.name }}</p>
                <p class="nc-dino">{{ c.dino ? dinoName(c.dino) : 'Still in the egg' }}<template v-if="c.dino?.personality"> · {{ c.dino.personality.archetype }}</template></p>
              </div>
            </div>
            <div class="nc-fold" aria-hidden="true" />
            <!-- Front face -->
            <div class="nc-face">
              <div class="nc-avatar"><PersonAvatar :person="c.person" :dino="c.dino" :size="200" /></div>
              <div class="nc-text">
                <p class="nc-name" :style="c.person.name.length > 17 ? { fontSize: '11.5pt' } : undefined">{{ c.person.name }}</p>
                <p class="nc-dino">{{ c.dino ? dinoName(c.dino) : 'Still in the egg' }}</p>
                <p class="nc-ask"><span>Ask me about:</span> {{ c.ask }}</p>
              </div>
            </div>
          </div>
          <p class="nc-meta">{{ team.name }} · {{ team.year }} · Cut on dashes, fold on dots</p>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.nc-frame { position: relative; }
.nc-sheet {
  position: absolute;
  top: 0;
  left: 0;
  transform-origin: top left;
  width: 210mm;
  height: 297mm;
  padding: 13mm 10mm 0;
  background: #fff;
  box-shadow: 0 18px 40px -14px rgb(11 43 40 / 0.45);
  display: grid;
  grid-template-columns: repeat(2, 95mm);
  grid-auto-rows: 65mm;
  align-content: start;
  color: #1E2420;
}
.nc-card {
  display: grid;
  grid-template-rows: 1fr auto 1fr;
  outline: 0.3mm dashed #A9B09B;
  outline-offset: -0.15mm;
  overflow: hidden;
}
.nc-face {
  display: flex;
  align-items: center;
  gap: 4mm;
  padding: 3mm 5mm;
  min-height: 0;
  min-width: 0;
}
.nc-face--flip { transform: rotate(180deg); background: #F7F8F1; }
.nc-fold { border-top: 0.35mm dotted #5D6657; }
.nc-avatar {
  width: 24mm;
  height: 24mm;
  flex: none;
  border-radius: 3.5mm;
  overflow: hidden;
  border: 0.35mm solid #1E2420;
}
.nc-text { min-width: 0; }
.nc-name {
  font-family: 'Caprasimo', serif;
  font-size: 15pt;
  line-height: 1.05;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.nc-dino { margin-top: 0.8mm; font-size: 8pt; font-weight: 700; color: #434B40; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.nc-ask {
  margin-top: 1.2mm;
  font-size: 7pt;
  line-height: 1.3;
  color: #434B40;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.nc-ask span { font-weight: 700; color: #1E2420; }
.nc-meta { grid-column: 1 / -1; margin-top: 4mm; font-size: 7.5pt; color: #7F8875; text-align: center; }

@media print {
  .nc-host { padding: 0 !important; max-width: none !important; }
  .nc-frame { height: auto !important; }
  .nc-sheet { position: static; transform: none !important; box-shadow: none !important; width: 190mm; height: 276mm; padding: 3mm 0 0; overflow: hidden; }
}
</style>
