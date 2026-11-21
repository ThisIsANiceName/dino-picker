<!--
  CustomDinoForm: add a dino that is not in the catalog, or set/override a dino's image.
  Catalog dinos only accept an image (the server ignores other fields for them).

  Props: dino (Object|null: edit mode), initialName (String)
  Emits: saved(dino), cancel
-->
<script setup>
import { computed, ref } from 'vue'
import { UiButton, UiField, UiInput, UiSelect, UiTextarea } from '../ui/index.js'
import { useDinoStore } from '../../stores/dinoStore.js'
import { useToast } from '../../composables/useToast.js'
import { BODY_TYPES, PERIODS, DIETS, cap, dinoName } from './dinoUtils.js'
import DinoIllustration from './DinoIllustration.vue'

const props = defineProps({
  dino: { type: Object, default: null },
  initialName: { type: String, default: '' },
})
const emit = defineEmits(['saved', 'cancel'])
const dinoStore = useDinoStore()
const toast = useToast()

const isEdit = !!props.dino
const imageOnly = isEdit && props.dino.source === 'catalog'
const form = ref({
  name: props.dino ? dinoName(props.dino) : props.initialName.trim(),
  diet: props.dino?.diet ?? 'herbivore',
  period: props.dino?.period ?? 'cretaceous',
  bodyType: props.dino?.bodyType ?? 'raptor',
  image: props.dino?.image ?? '',
  description: props.dino?.description ?? '',
})
const error = ref('')
const imageError = ref('')
const saving = ref(false)

const preview = computed(() => ({
  ...(props.dino ?? {}),
  name: form.value.name || 'new dino',
  bodyType: form.value.bodyType,
  palette: props.dino?.palette ?? { body: '#56A44C', belly: '#FFEBC2', accent: '#D2335F' },
  image: /^https?:\/\//.test(form.value.image.trim()) ? form.value.image.trim() : '',
}))

async function submit() {
  error.value = ''
  imageError.value = ''
  const img = form.value.image.trim()
  if (img && !/^https?:\/\/\S+$/.test(img)) { imageError.value = 'Use a full link starting with https://'; return }
  if (!imageOnly && !form.value.name.trim()) { error.value = 'Give the dino a name.'; return }
  saving.value = true
  try {
    let saved
    if (imageOnly) {
      saved = await dinoStore.updateDino(props.dino._id, { image: img })
      toast.success(img ? 'Picture set' : 'Picture removed')
    } else {
      const payload = {
        name: form.value.name.trim(),
        diet: form.value.diet,
        period: form.value.period,
        bodyType: form.value.bodyType,
        image: img,
        description: form.value.description.trim(),
      }
      saved = isEdit ? await dinoStore.updateDino(props.dino._id, payload) : await dinoStore.createDino(payload)
      toast.success(isEdit ? 'Dino updated' : `Added ${dinoName(saved)} to the Dinopedia`)
    }
    emit('saved', saved)
  } catch (err) {
    error.value = /409|exists/i.test(err.message) ? 'That dino is already in the Dinopedia. Search for it instead.' : err.message || "Couldn't save the dino."
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <form class="grid gap-5 sm:grid-cols-[148px_1fr] items-start" novalidate @submit.prevent="submit">
    <div class="w-32 sm:w-full mx-auto rounded-lg border-[1.5px] border-ink overflow-hidden" :style="{ background: preview.palette.belly }">
      <DinoIllustration :dino="preview" decorative />
    </div>
    <div class="space-y-4 min-w-0">
      <UiField v-if="!imageOnly" label="Name" :error="error" required>
        <UiInput v-model="form.name" maxlength="80" placeholder="Like Zuul or Bob the Brave" data-autofocus autocomplete="off" />
      </UiField>
      <template v-if="!imageOnly">
        <div class="grid grid-cols-2 gap-3">
          <UiField label="Diet"><UiSelect v-model="form.diet" :options="DIETS.map((d) => ({ value: d, label: cap(d) }))" /></UiField>
          <UiField label="Period"><UiSelect v-model="form.period" :options="PERIODS.map((p) => ({ value: p.value, label: p.label }))" /></UiField>
        </div>
        <UiField label="Body shape" help="Picks the illustration."><UiSelect v-model="form.bodyType" :options="BODY_TYPES" /></UiField>
      </template>
      <UiField label="Picture link" optional :error="imageError || (imageOnly ? error : '')" :help="imageOnly ? 'Shown instead of the illustration. Clear it to go back.' : 'Leave empty to use the illustration.'">
        <UiInput v-model="form.image" type="url" placeholder="https://" autocomplete="off" />
      </UiField>
      <UiField v-if="!imageOnly" label="Description" optional :count="form.description.length" :max="400">
        <UiTextarea v-model="form.description" :rows="2" maxlength="400" />
      </UiField>
      <div class="flex flex-wrap justify-end gap-3 pt-1">
        <UiButton variant="ghost" @click="emit('cancel')">Cancel</UiButton>
        <UiButton type="submit" variant="secondary" :loading="saving">{{ imageOnly ? 'Save picture' : isEdit ? 'Save dino' : 'Add dino' }}</UiButton>
      </div>
    </div>
  </form>
</template>
