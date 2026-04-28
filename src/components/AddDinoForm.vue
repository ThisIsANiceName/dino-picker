<script setup>
import { ref } from 'vue'
import { useDinoStore } from '../stores/dinoStore.js'

const props = defineProps({
  initialName: { type: String, default: '' },
  dino:        { type: Object, default: null }, // when set, form is in edit mode
})

const emit = defineEmits(['saved', 'cancel'])

const dinoStore = useDinoStore()
const isEdit = !!props.dino

const form = ref({
  name:        props.dino?.name        ?? props.initialName,
  image:       props.dino?.image       ?? '',
  diet:        props.dino?.diet        ?? '',
  period:      props.dino?.period      ?? '',
  type:        props.dino?.type        ?? '',
  description: props.dino?.description ?? '',
})

const saving = ref(false)
const error  = ref(null)
const imgPreviewError = ref(false)

const DIET_OPTIONS   = ['', 'herbivore', 'carnivore', 'omnivore']
const PERIOD_OPTIONS = ['', 'triassic', 'jurassic', 'cretaceous']
const TYPE_OPTIONS   = ['', 'terrestrial', 'flying', 'aquatic', 'semi-aquatic']

async function submit() {
  if (!form.value.name.trim()) return
  saving.value = true
  error.value  = null
  try {
    const data = {
      name:        form.value.name.trim(),
      image:       form.value.image.trim(),
      diet:        form.value.diet,
      period:      form.value.period,
      type:        form.value.type,
      description: form.value.description.trim(),
    }
    const dino = isEdit
      ? await dinoStore.updateDino(props.dino._id, data)
      : await dinoStore.createDino(data)
    emit('saved', dino)
  } catch (err) {
    error.value = err.message
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="text-left space-y-4">
    <h3 class="font-display text-fossil-50 text-base">
      {{ isEdit ? 'Edit Dinosaur' : 'Add Missing Dinosaur' }}
    </h3>

    <!-- Name -->
    <div>
      <label class="block text-xs text-earth-400 mb-1" for="dino-form-name">Name <span class="text-amber-500">*</span></label>
      <input
        id="dino-form-name"
        v-model="form.name"
        type="text"
        maxlength="100"
        placeholder="e.g. Spinosaurus"
        class="w-full bg-earth-800 border border-earth-600 rounded-lg px-3 py-2 text-sm text-fossil-50 placeholder-earth-600 focus:outline-none focus:border-amber-500"
        @keydown.enter.prevent="submit"
      />
    </div>

    <!-- Image URL -->
    <div>
      <label class="block text-xs text-earth-400 mb-1" for="dino-form-image">Image URL</label>
      <input
        id="dino-form-image"
        v-model="form.image"
        type="url"
        placeholder="https://…"
        class="w-full bg-earth-800 border border-earth-600 rounded-lg px-3 py-2 text-sm text-fossil-50 placeholder-earth-600 focus:outline-none focus:border-amber-500"
        @input="imgPreviewError = false"
      />
      <div
        v-if="form.image && !imgPreviewError"
        class="mt-2 w-full aspect-video rounded-lg overflow-hidden bg-earth-900"
      >
        <img
          :src="form.image"
          alt="Preview"
          class="w-full h-full object-cover"
          @error="imgPreviewError = true"
        />
      </div>
      <p v-if="imgPreviewError" class="mt-1 text-xs text-red-400">Image URL could not be loaded.</p>
    </div>

    <!-- Diet + Period row -->
    <div class="grid grid-cols-2 gap-3">
      <div>
        <label class="block text-xs text-earth-400 mb-1" for="dino-form-diet">Diet</label>
        <select
          id="dino-form-diet"
          v-model="form.diet"
          class="w-full bg-earth-800 border border-earth-600 rounded-lg px-3 py-2 text-sm text-fossil-50 focus:outline-none focus:border-amber-500 capitalize"
        >
          <option v-for="d in DIET_OPTIONS" :key="d" :value="d" class="capitalize">
            {{ d || 'Unknown' }}
          </option>
        </select>
      </div>
      <div>
        <label class="block text-xs text-earth-400 mb-1" for="dino-form-period">Period</label>
        <select
          id="dino-form-period"
          v-model="form.period"
          class="w-full bg-earth-800 border border-earth-600 rounded-lg px-3 py-2 text-sm text-fossil-50 focus:outline-none focus:border-amber-500 capitalize"
        >
          <option v-for="p in PERIOD_OPTIONS" :key="p" :value="p" class="capitalize">
            {{ p || 'Unknown' }}
          </option>
        </select>
      </div>
    </div>

    <!-- Locomotion type -->
    <div>
      <label class="block text-xs text-earth-400 mb-1" for="dino-form-type">Locomotion</label>
      <select
        id="dino-form-type"
        v-model="form.type"
        class="w-full bg-earth-800 border border-earth-600 rounded-lg px-3 py-2 text-sm text-fossil-50 focus:outline-none focus:border-amber-500 capitalize"
      >
        <option v-for="t in TYPE_OPTIONS" :key="t" :value="t" class="capitalize">
          {{ t || 'Unknown' }}
        </option>
      </select>
    </div>

    <!-- Description -->
    <div>
      <label class="block text-xs text-earth-400 mb-1" for="dino-form-desc">Description</label>
      <textarea
        id="dino-form-desc"
        v-model="form.description"
        rows="3"
        placeholder="A short description…"
        class="w-full bg-earth-800 border border-earth-600 rounded-lg px-3 py-2 text-sm text-fossil-50 placeholder-earth-600 focus:outline-none focus:border-amber-500 resize-none"
      />
    </div>

    <!-- Error -->
    <p v-if="error" role="alert" class="text-xs text-red-400">{{ error }}</p>

    <!-- Actions -->
    <div class="flex gap-2 justify-end">
      <button
        type="button"
        class="px-3 py-1.5 rounded-md text-sm text-earth-400 hover:text-fossil-50 transition-colors"
        @click="emit('cancel')"
      >
        Cancel
      </button>
      <button
        type="button"
        :disabled="!form.name.trim() || saving"
        class="px-4 py-1.5 rounded-md bg-amber-600 hover:bg-amber-500 disabled:opacity-40 disabled:cursor-not-allowed text-earth-950 text-sm font-semibold transition-colors"
        @click="submit"
      >
        {{ saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Dinosaur' }}
      </button>
    </div>
  </div>
</template>
