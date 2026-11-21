<!-- Quiz intro: hero spot, promise, who-is-this-for, start. -->
<script setup>
import { computed, ref, onMounted } from 'vue'
import { UiButton, UiField, UiSelect } from '../ui/index.js'
import { SPOTS } from '../layout/spots.js'

const props = defineProps({
  modelValue: { type: String, default: '' }, // person id or ''
  persons: { type: Array, default: () => [] },
  dinoFor: { type: Function, required: true },
  count: { type: Number, required: true },
  loading: { type: Boolean, default: false },
})
const emit = defineEmits(['update:modelValue', 'start'])

const heading = ref(null)
onMounted(() => heading.value?.focus({ preventScroll: true }))

const options = computed(() => [
  { value: '', label: 'Just curious (nobody)' },
  ...[...props.persons].sort((a, b) => a.name.localeCompare(b.name)).map((p) => ({ value: p.id, label: p.name })),
])
const person = computed(() => props.persons.find((p) => p.id === props.modelValue) ?? null)
const currentDino = computed(() => (person.value ? props.dinoFor(person.value) : null))
const help = computed(() => {
  if (!person.value) return 'Nothing gets saved. You can still give the result to someone at the end.'
  const first = person.value.name.split(/\s+/)[0]
  return currentDino.value
    ? `${first} is currently a ${currentDino.value.name}. Nothing changes until you apply the result.`
    : `${first} does not have a dino yet.`
})
</script>

<template>
  <section class="max-w-4xl mx-auto px-4 sm:px-6 py-8 md:py-14" aria-labelledby="quiz-intro-title">
    <div class="grid md:grid-cols-[1fr_minmax(0,22rem)] gap-8 md:gap-12 items-center">
      <div class="order-2 md:order-1">
        <h1 id="quiz-intro-title" ref="heading" tabindex="-1" class="font-display text-display-md sm:text-display-lg outline-none">
          Which dino are you?
        </h1>
        <p class="mt-4 text-lg text-ink-muted max-w-md">
          {{ count }} questions, about 3 minutes. For fun, not science. We match your answers to a dino from the Dinopedia.
        </p>

        <div class="mt-7 max-w-sm">
          <UiField label="Who is this for?" :help="help">
            <UiSelect
              :model-value="modelValue"
              :options="options"
              :disabled="loading"
              @update:model-value="emit('update:modelValue', $event)"
            />
          </UiField>
        </div>

        <div class="mt-7 flex flex-wrap items-center gap-3">
          <UiButton size="lg" icon="egg" :disabled="loading" @click="emit('start')">Start the quiz</UiButton>
          <UiButton variant="ghost" to="/dinopedia">Browse the Dinopedia instead</UiButton>
        </div>
      </div>

      <div class="order-1 md:order-2 mx-auto w-48 sm:w-56 md:w-full" aria-hidden="true">
        <img :src="SPOTS.quizHero" alt="" class="w-full h-auto select-none" draggable="false" />
      </div>
    </div>
  </section>
</template>
