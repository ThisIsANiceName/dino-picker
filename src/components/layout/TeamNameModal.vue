<!-- TeamNameModal: rename the team and set the year (poster, shirts, result card). -->
<script setup>
import { ref, watch } from 'vue'
import { UiButton, UiField, UiInput, UiModal } from '../ui/index.js'
import { useTeamStore } from '../../stores/teamStore.js'
import { useToast } from '../../composables/useToast.js'

const props = defineProps({ modelValue: { type: Boolean, default: false } })
const emit = defineEmits(['update:modelValue'])
const team = useTeamStore()
const toast = useToast()

const name = ref('')
const year = ref('')
const error = ref('')
const saving = ref(false)

watch(() => props.modelValue, (open) => {
  if (open) {
    name.value = team.name
    year.value = String(team.year)
    error.value = ''
  }
})

async function save() {
  const n = name.value.trim()
  const y = Number(year.value)
  if (!n) { error.value = 'Give the team a name.'; return }
  if (!Number.isInteger(y) || y < 1900 || y > 2100) { error.value = 'Use a year between 1900 and 2100.'; return }
  saving.value = true
  try {
    await team.saveTeam({ name: n, year: y })
    toast.success('Team renamed', `Say hello to ${n}.`)
    emit('update:modelValue', false)
  } catch (err) {
    error.value = err.message || "Couldn't save. Try again."
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <UiModal :model-value="modelValue" title="Team name" description="Shown on the poster, name cards, shirts and quiz result cards." size="sm" @update:model-value="emit('update:modelValue', $event)">
    <form id="team-name-form" class="space-y-4" @submit.prevent="save">
      <UiField label="Name" :error="error" :count="name.length" :max="60">
        <UiInput v-model="name" maxlength="60" data-autofocus autocomplete="off" />
      </UiField>
      <UiField label="Year">
        <UiInput v-model="year" type="number" inputmode="numeric" min="1900" max="2100" class="max-w-[8rem]" />
      </UiField>
    </form>
    <template #footer>
      <UiButton variant="ghost" @click="emit('update:modelValue', false)">Cancel</UiButton>
      <UiButton type="submit" form="team-name-form" :loading="saving">Save name</UiButton>
    </template>
  </UiModal>
</template>
