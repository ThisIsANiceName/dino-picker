<!--
  NoteEditor: "How to work with me", editable inline (280 chars).
  Saving stamps a small "Saved" badge.
-->
<script setup>
import { nextTick, ref } from 'vue'
import { UiButton, UiIcon, UiTextarea, prefersReducedMotion } from '../ui/index.js'
import { usePersonStore } from '../../stores/personStore.js'
import { useToast } from '../../composables/useToast.js'
import { firstName } from '../dinopedia/dinoUtils.js'

const props = defineProps({ person: { type: Object, required: true } })
const personStore = usePersonStore()
const toast = useToast()
const MAX = 280

const editing = ref(false)
const draft = ref('')
const saving = ref(false)
const stamped = ref(false)
const area = ref(null)
const editBtn = ref(null)

function start() {
  draft.value = props.person.note ?? ''
  editing.value = true
  nextTick(() => area.value?.$el?.querySelector('textarea')?.focus())
}
function cancel() {
  editing.value = false
  nextTick(() => editBtn.value?.$el?.focus?.() ?? editBtn.value?.focus?.())
}
async function save() {
  const note = draft.value.trim().slice(0, MAX)
  saving.value = true
  try {
    await personStore.saveNote(props.person.id, note)
    editing.value = false
    stamped.value = false
    nextTick(() => { stamped.value = true })
    if (prefersReducedMotion()) toast.success('Note saved')
    setTimeout(() => { stamped.value = false }, 2600)
  } catch (err) {
    toast.error("Couldn't save the note", 'Check the connection and try again.')
  } finally {
    saving.value = false
  }
}
function onKey(e) {
  if (e.key === 'Escape') { e.stopPropagation(); cancel() }
  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) save()
}
</script>

<template>
  <section class="relative rounded-lg border border-line bg-surface p-5 sm:p-6" aria-labelledby="note-heading">
    <div class="flex items-center gap-3">
      <h2 id="note-heading" class="font-display text-display-xs">How to work with {{ firstName(person.name) }}</h2>
      <span v-if="stamped" class="note-stamp ml-1 inline-flex items-center h-7 px-2.5 rounded-md border-2 border-success text-success font-bold text-sm animate-stamp" role="status">Saved</span>
      <UiButton v-if="!editing" ref="editBtn" variant="ghost" size="sm" icon="edit" class="ml-auto" @click="start">{{ person.note ? 'Edit' : 'Write' }}</UiButton>
    </div>

    <div v-if="editing" class="mt-4">
      <label for="note-input" class="sr-only">How to work with {{ firstName(person.name) }}</label>
      <UiTextarea id="note-input" ref="area" v-model="draft" :rows="3" :maxlength="MAX" placeholder="Best time to reach me, how I like feedback, what drains me…" @keydown="onKey" />
      <div class="mt-3 flex flex-wrap items-center gap-3">
        <span :class="['text-sm tabular', draft.length > MAX - 20 ? 'text-warning font-semibold' : 'text-ink-subtle']" aria-live="polite">{{ draft.length }} / {{ MAX }}</span>
        <span class="hidden sm:inline text-xs text-ink-subtle"><span class="kbd">Ctrl</span> + <span class="kbd">Enter</span> saves</span>
        <div class="ml-auto flex gap-2">
          <UiButton variant="ghost" size="sm" @click="cancel">Cancel</UiButton>
          <UiButton variant="secondary" size="sm" icon="check" :loading="saving" @click="save">Save note</UiButton>
        </div>
      </div>
    </div>
    <blockquote v-else-if="person.note" class="mt-3 text-lg leading-relaxed whitespace-pre-line break-words">{{ person.note }}</blockquote>
    <button v-else type="button" class="mt-3 w-full text-left rounded-md border-2 border-dashed border-line-strong px-4 py-4 text-ink-muted hover:text-ink hover:border-ink transition-colors flex items-center gap-2" @click="start">
      <UiIcon name="plus" :size="18" /> Add a note: best time to reach {{ firstName(person.name) }}, how they like feedback, pet peeves.
    </button>
  </section>
</template>
