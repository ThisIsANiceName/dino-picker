<!-- PersonEditView: name, note, dino, remove. -->
<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { UiButton, UiCard, UiEmptyState, UiField, UiIcon, UiInput, UiModal, UiSkeleton, UiTextarea } from '../components/ui/index.js'
import PersonAvatar from '../components/person/PersonAvatar.vue'
import DinoPickerModal from '../components/person/DinoPickerModal.vue'
import DinoIllustration from '../components/dinopedia/DinoIllustration.vue'
import { useRemovePerson } from '../components/person/useRemovePerson.js'
import ErrorState from '../components/layout/ErrorState.vue'
import { SPOTS } from '../components/layout/spots.js'
import { useAppData } from '../components/layout/useAppData.js'
import { usePageTitle } from '../components/layout/usePageTitle.js'
import { dinoName, firstName } from '../components/dinopedia/dinoUtils.js'
import { usePersonStore } from '../stores/personStore.js'
import { useDesignStore } from '../stores/designStore.js'
import { useToast } from '../composables/useToast.js'

const route = useRoute()
const router = useRouter()
const personStore = usePersonStore()
const designStore = useDesignStore()
const data = useAppData()
const toast = useToast()
const removePerson = useRemovePerson()

const person = computed(() => personStore.getPersonById(route.params.id))
usePageTitle(() => (person.value ? `Edit ${firstName(person.value.name)}` : ''))

const form = ref({ name: '', note: '', dinoName: null })
const errors = ref({})
const saving = ref(false)
const picking = ref(false)
const confirming = ref(false)
const designCount = ref(0)
let seeded = false

watch(person, (p) => {
  if (p && !seeded) {
    seeded = true
    form.value = { name: p.name, note: p.note ?? '', dinoName: p.dinoName ?? null }
    designStore.fetchDesigns(p.id).then((list) => { designCount.value = list.length }).catch(() => {})
  }
}, { immediate: true })

const dino = computed(() => data.dinoFor(form.value.dinoName))
const previewPerson = computed(() => (person.value ? { ...person.value, name: form.value.name || person.value.name } : null))
const dirty = computed(() => person.value && (
  form.value.name.trim() !== person.value.name || form.value.note.trim() !== (person.value.note ?? '') || form.value.dinoName !== (person.value.dinoName ?? null)
))
const goneText = computed(() => {
  const bits = ['avatar', 'quiz result']
  const shirts = designCount.value
  const list = shirts ? `${bits.join(', ')} and ${shirts} shirt ${shirts === 1 ? 'design' : 'designs'}` : bits.join(' and ')
  return `Their ${list} go too. You can undo for a few seconds.`
})

async function save() {
  errors.value = {}
  const name = form.value.name.trim()
  if (!name) errors.value.name = 'A name is needed.'
  else if (name.length > 50) errors.value.name = 'Keep it under 50 characters.'
  if (form.value.note.length > 280) errors.value.note = 'Keep the note under 280 characters.'
  if (Object.keys(errors.value).length) return
  saving.value = true
  try {
    await personStore.updatePerson(person.value.id, { name, note: form.value.note.trim(), dinoName: form.value.dinoName })
    toast.success(`Saved ${firstName(name)}`)
    router.push(`/people/${person.value.id}`)
  } catch (err) {
    toast.error("Couldn't save changes", 'Check the connection and try again.')
  } finally {
    saving.value = false
  }
}
function remove() {
  confirming.value = false
  const p = person.value
  router.push('/')
  removePerson(p)
}
</script>

<template>
  <div class="mx-auto max-w-[880px] px-4 sm:px-6 pt-5 sm:pt-8">
    <RouterLink :to="person ? `/people/${person.id}` : '/'" class="inline-flex items-center gap-1 min-h-[44px] text-sm font-semibold text-ink-muted hover:text-ink">
      <UiIcon name="arrow-left" :size="16" /> {{ person ? `Back to ${firstName(person.name)}` : 'Team' }}
    </RouterLink>

    <div v-if="data.loading.value" aria-busy="true" class="mt-4 space-y-4">
      <h1 class="sr-only">Loading</h1>
      <UiSkeleton width="18rem" height="2.6rem" />
      <UiSkeleton shape="card" height="380px" />
    </div>
    <ErrorState v-else-if="data.failed.value" @retry="data.retry()" />
    <UiEmptyState v-else-if="!person" title="No teammate here" text="They may have been removed already." :image="SPOTS.emptySearch">
      <template #action><UiButton to="/" icon="arrow-left">Back to the team</UiButton></template>
    </UiEmptyState>

    <template v-else>
      <h1 tabindex="-1" class="mt-2 font-display text-display-md break-words">Edit {{ firstName(person.name) }}</h1>

      <form class="mt-8 space-y-6" novalidate @submit.prevent="save">
        <UiCard padding="lg">
          <div class="grid sm:grid-cols-[132px_1fr] gap-6 items-start">
            <div class="w-28 sm:w-full mx-auto sticker overflow-hidden" style="--tilt:-2deg">
              <PersonAvatar v-if="previewPerson" :person="previewPerson" :dino="dino" :size="264" />
            </div>
            <div class="space-y-5 min-w-0">
              <UiField label="Name" :error="errors.name" :count="form.name.length" :max="50" required>
                <UiInput v-model="form.name" maxlength="50" autocomplete="off" />
              </UiField>
              <UiField label="How to work with me" optional :error="errors.note" :count="form.note.length" :max="280" help="Best time to reach them, how they like feedback, what drains them.">
                <UiTextarea v-model="form.note" :rows="3" maxlength="280" />
              </UiField>
            </div>
          </div>
        </UiCard>

        <UiCard padding="lg">
          <h2 class="font-display text-display-xs">Dino</h2>
          <div class="mt-4 flex flex-wrap items-center gap-4">
            <div class="w-20 h-20 rounded-md border-[1.5px] border-ink overflow-hidden shrink-0" :style="{ background: dino?.palette?.belly ?? 'rgb(var(--c-surface-sunken))' }">
              <DinoIllustration v-if="dino" :key="dino.name" :dino="dino" decorative class="animate-pop-in" />
              <img v-else :src="SPOTS.eggWhole" alt="" class="w-full h-full p-3" />
            </div>
            <div class="min-w-0 flex-1">
              <p class="font-display text-xl">{{ dino ? dinoName(dino) : form.dinoName || 'No dino yet' }}</p>
              <p class="text-sm text-ink-muted">{{ dino?.personality?.archetype ?? (dino ? 'Custom dino' : 'Pick one, or let the quiz decide.') }}</p>
            </div>
            <div class="flex flex-wrap gap-2">
              <UiButton variant="secondary" size="sm" icon="shuffle" @click="picking = true">{{ dino ? 'Change dino' : 'Pick a dino' }}</UiButton>
              <UiButton variant="ghost" size="sm" icon="egg" :to="`/quiz?for=${person.id}`">Take the quiz</UiButton>
              <UiButton v-if="form.dinoName" variant="ghost" size="sm" icon="x" @click="form.dinoName = null">Clear</UiButton>
            </div>
          </div>
        </UiCard>

        <div class="flex flex-wrap items-center gap-3">
          <UiButton type="submit" size="lg" icon="check" :loading="saving" :disabled="!dirty">Save changes</UiButton>
          <UiButton variant="ghost" size="lg" :to="`/people/${person.id}`">Cancel</UiButton>
        </div>
      </form>

      <section class="mt-14 rounded-lg border-[1.5px] border-dashed border-danger/50 p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4" aria-labelledby="danger-heading">
        <div class="flex-1">
          <h2 id="danger-heading" class="font-sans font-bold text-lg">Remove from the team</h2>
          <p class="text-sm text-ink-muted mt-1">Deletes {{ firstName(person.name) }}'s profile, avatar and shirt designs.</p>
        </div>
        <UiButton variant="danger" icon="trash" @click="confirming = true">Remove {{ firstName(person.name) }}</UiButton>
      </section>

      <DinoPickerModal v-model="picking" :title="`Pick a dino for ${firstName(form.name || person.name)}`" :current="form.dinoName ?? ''" @pick="form.dinoName = $event.name" />

      <UiModal v-model="confirming" :title="`Remove ${firstName(person.name)} from the team?`" size="sm" role="alertdialog">
        <p class="text-ink-muted">{{ goneText }}</p>
        <template #footer>
          <UiButton variant="ghost" data-autofocus @click="confirming = false">Keep {{ firstName(person.name) }}</UiButton>
          <UiButton variant="danger" icon="trash" @click="remove">Remove</UiButton>
        </template>
      </UiModal>
    </template>
  </div>
</template>
