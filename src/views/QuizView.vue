<!--
  Quiz view (/quiz, ?for=<personId>): intro -> one question per screen -> reveal.
  State machine: stage 'intro' | 'question' | 'reveal'. In-progress state lives in
  sessionStorage so an accidental reload resumes where you were.
-->
<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useDinoStore } from '../stores/dinoStore.js'
import { usePersonStore } from '../stores/personStore.js'
import { useTeamStore } from '../stores/teamStore.js'
import { useToast } from '../composables/useToast.js'
import { useAppData } from '../components/layout/useAppData.js'
import ErrorState from '../components/layout/ErrorState.vue'
import { UiButton, UiModal, UiSkeleton } from '../components/ui/index.js'
import { QUESTIONS, dinoKey, dinoLabel, scoreQuiz, userProfile } from '../lib/quiz/index.js'
import { downloadBlob, slugify } from '../lib/art/index.js'
import QuizIntro from '../components/quiz/QuizIntro.vue'
import QuizQuestionScreen from '../components/quiz/QuizQuestionScreen.vue'
import QuizReveal from '../components/quiz/QuizReveal.vue'
import { clearSession, loadSession, saveSession } from '../components/quiz/session.js'
import { renderResultCard } from '../components/quiz/resultCard.js'

const route = useRoute()
const router = useRouter()
const dinoStore = useDinoStore()
const personStore = usePersonStore()
const teamStore = useTeamStore()
const toast = useToast()
const data = useAppData()
data.load()

const stage = ref('intro')
const forId = ref('')
const cursor = ref(0)
const picked = ref({}) // questionId -> optionId
const chosenId = ref('')
const animateReveal = ref(true)
const applied = ref({ dinoId: '', personId: '' })
const saving = ref(false)
const downloading = ref(false)
const confirm = ref({ open: false, personId: '' })

const persons = computed(() => personStore.persons)
const traitDinos = computed(() => dinoStore.catalogDinos.filter((d) => d.traits))
const answerList = computed(() => QUESTIONS.filter((q) => picked.value[q.id]).map((q) => ({ q: q.id, a: picked.value[q.id] })))
const ranked = computed(() => (stage.value === 'reveal' ? scoreQuiz(answerList.value, traitDinos.value) : []))
const picks = computed(() => ranked.value.slice(0, 3))
const you = computed(() => userProfile(answerList.value))
const question = computed(() => QUESTIONS[cursor.value])
const appliedFor = computed(() => (applied.value.dinoId === chosenId.value ? applied.value.personId : ''))
const ready = computed(() => data.ready.value)

function persist() {
  saveSession({ stage: stage.value, forId: forId.value, cursor: cursor.value, picked: picked.value, chosenId: chosenId.value })
}

function resetAll(nextStage = 'intro') {
  stage.value = nextStage
  cursor.value = 0
  picked.value = {}
  chosenId.value = ''
  applied.value = { dinoId: '', personId: '' }
  animateReveal.value = true
  if (nextStage === 'intro') clearSession()
}

// ── Boot: resume, or start fresh from ?for= ─────────────────────────────────────────────
onMounted(async () => {
  await data.load()
  const queryFor = typeof route.query.for === 'string' ? route.query.for : ''
  const saved = loadSession()
  const known = (id) => !id || personStore.persons.some((p) => p.id === id)
  if (saved && (!queryFor || queryFor === saved.forId)) {
    // Only resume if the stored answers still make sense.
    const valid = Object.entries(saved.picked).every(([q, a]) => QUESTIONS.find((x) => x.id === q)?.options.some((o) => o.id === a))
    if (valid) {
      forId.value = known(saved.forId) ? saved.forId : ''
      picked.value = saved.picked
      cursor.value = Math.min(Math.max(saved.cursor, 0), QUESTIONS.length - 1)
      if (saved.stage === 'reveal' && Object.keys(saved.picked).length === QUESTIONS.length) {
        chosenId.value = saved.chosenId
        animateReveal.value = false
        stage.value = 'reveal'
      } else {
        stage.value = 'question'
      }
      return
    }
  }
  if (queryFor && known(queryFor)) forId.value = queryFor
})
watch([stage, forId, cursor, picked, chosenId], persist, { deep: true })

// ── Flow ────────────────────────────────────────────────────────────────────────────────
function start() {
  picked.value = {}
  cursor.value = 0
  chosenId.value = ''
  applied.value = { dinoId: '', personId: '' }
  stage.value = 'question'
}

function onAnswer(optionId) {
  picked.value = { ...picked.value, [question.value.id]: optionId }
  if (cursor.value < QUESTIONS.length - 1) {
    cursor.value++
  } else {
    chosenId.value = ''
    animateReveal.value = true
    stage.value = 'reveal'
  }
}
const back = () => { if (cursor.value > 0) cursor.value-- }
function quit() { resetAll('intro') }
function retake() {
  const keep = forId.value
  resetAll('intro')
  forId.value = keep
  window.scrollTo?.({ top: 0 })
}

// If the chosen dino is not in the ranking (catalog changed), fall back to the best.
watch(picks, (p) => { if (p.length && !p.some((x) => dinoKey(x.dino) === chosenId.value)) chosenId.value = dinoKey(p[0].dino) }, { immediate: true })

// ── Apply to a person ───────────────────────────────────────────────────────────────────
const chosenPick = computed(() => picks.value.find((p) => dinoKey(p.dino) === chosenId.value) ?? picks.value[0])
const aOrAn = (name) => (/^[aeio]|^ou/i.test(name) ? 'an' : 'a')

function requestApply(personId) {
  const person = personStore.getPersonById(personId)
  if (!person || !chosenPick.value) return
  const current = person.dinoName
  if (current && current.toLowerCase() !== dinoKey(chosenPick.value.dino)) {
    confirm.value = { open: true, personId }
  } else {
    doApply(personId)
  }
}

async function doApply(personId) {
  const person = personStore.getPersonById(personId)
  const pick = chosenPick.value
  if (!person || !pick) return
  confirm.value.open = false
  saving.value = true
  try {
    await personStore.assignDino(personId, dinoKey(pick.dino))
    await personStore.saveQuiz(personId, {
      v: 1,
      answers: answerList.value,
      traits: you.value,
      matches: picks.value.map((p) => ({ dinoId: dinoKey(p.dino), name: dinoLabel(p.dino), score: p.score })),
      picked: dinoKey(pick.dino),
      takenAt: new Date().toISOString(),
    })
    applied.value = { dinoId: dinoKey(pick.dino), personId }
    toast.success(`${person.name.split(/\s+/)[0]} is now ${aOrAn(dinoLabel(pick.dino))} ${dinoLabel(pick.dino)}`)
  } catch (err) {
    toast.error('Could not save the result', err?.message ?? 'Check the connection and try again.')
  } finally {
    saving.value = false
  }
}

// ── Result card ─────────────────────────────────────────────────────────────────────────
async function download() {
  const pick = chosenPick.value
  if (!pick || downloading.value) return
  downloading.value = true
  try {
    const person = personStore.getPersonById(forId.value)
    const blob = await renderResultCard(pick.dino, { personName: person?.name ?? '', teamName: teamStore.loaded ? teamStore.name : '' })
    downloadBlob(blob, `${slugify(person?.name ?? 'my')}-${slugify(dinoLabel(pick.dino))}-result.png`)
    toast.success('Result card saved')
  } catch (err) {
    toast.error('Could not make the card', err?.message ?? 'Try again in a moment.')
  } finally {
    downloading.value = false
  }
}

const confirmPerson = computed(() => personStore.getPersonById(confirm.value.personId))
const confirmCurrent = computed(() => (confirmPerson.value?.dinoName ? dinoStore.getDinoByName(confirmPerson.value.dinoName) : null))
</script>

<template>
  <div>
    <div v-if="data.failed.value" class="max-w-3xl mx-auto px-4 py-10">
      <ErrorState @retry="data.retry()" />
    </div>

    <div v-else-if="!ready" class="max-w-2xl mx-auto px-4 py-10 space-y-4" aria-busy="true" aria-label="Loading the quiz">
      <UiSkeleton shape="rect" height="48px" width="75%" />
      <UiSkeleton shape="rect" height="24px" width="50%" />
      <UiSkeleton shape="rect" height="176px" />
    </div>

    <template v-else>
      <QuizIntro
        v-if="stage === 'intro'"
        v-model="forId"
        :persons="persons"
        :dino-for="data.dinoFor"
        :count="QUESTIONS.length"
        @start="start"
      />

      <QuizQuestionScreen
        v-else-if="stage === 'question'"
        :question="question"
        :index="cursor"
        :total="QUESTIONS.length"
        :selected="picked[question.id] ?? ''"
        :can-back="cursor > 0"
        @answer="onAnswer"
        @back="back"
        @quit="quit"
      />

      <QuizReveal
        v-else-if="picks.length"
        :picks="picks"
        :chosen-id="chosenId"
        :you="you"
        :animate="animateReveal"
        :for-id="forId"
        :persons="persons"
        :applied-for="appliedFor"
        :saving="saving"
        :downloading="downloading"
        @choose="chosenId = $event"
        @apply="requestApply"
        @download="download"
        @retake="retake"
      />
      <div v-else class="max-w-3xl mx-auto px-4 py-10">
        <ErrorState title="No dinos to match" text="The catalog has not loaded. Try again." @retry="data.retry()" />
      </div>
    </template>

    <UiModal v-model="confirm.open" role="alertdialog" size="sm" :title="`Swap ${confirmPerson?.name.split(/\s+/)[0] ?? ''}'s dino?`">
      <p>
        Swap {{ confirmPerson?.name.split(/\s+/)[0] }}'s {{ confirmCurrent ? dinoLabel(confirmCurrent) : confirmPerson?.dinoName }}
        for {{ chosenPick ? `${aOrAn(dinoLabel(chosenPick.dino))} ${dinoLabel(chosenPick.dino)}` : 'this dino' }}? The avatar keeps its colours until you change it in the studio.
      </p>
      <template #footer>
        <UiButton variant="ghost" @click="confirm.open = false">Keep {{ confirmCurrent ? dinoLabel(confirmCurrent) : 'current' }}</UiButton>
        <UiButton data-autofocus @click="doApply(confirm.personId)">Swap it</UiButton>
      </template>
    </UiModal>
  </div>
</template>
