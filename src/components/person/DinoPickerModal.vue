<!--
  DinoPickerModal: the dino picker in a UiModal (xl) on desktop, a bottom sheet on phones.
  Props: modelValue (open), title, current (dino name)
  Emits: update:modelValue, pick(dino)
-->
<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { UiBottomSheet, UiModal } from '../ui/index.js'
import DinoPicker from './DinoPicker.vue'

defineProps({
  modelValue: { type: Boolean, default: false },
  title: { type: String, default: 'Pick a dino' },
  current: { type: String, default: '' },
})
const emit = defineEmits(['update:modelValue', 'pick'])

const phone = ref(false)
let mq
const sync = () => { phone.value = mq.matches }
onMounted(() => { mq = window.matchMedia('(max-width: 767.98px)'); sync(); mq.addEventListener('change', sync) })
onBeforeUnmount(() => mq?.removeEventListener('change', sync))

function pick(d) {
  emit('pick', d)
  emit('update:modelValue', false)
}
</script>

<template>
  <UiBottomSheet v-if="phone" :model-value="modelValue" :title="title" @update:model-value="emit('update:modelValue', $event)">
    <DinoPicker v-if="modelValue" :model-value="current" compact @pick="pick" />
  </UiBottomSheet>
  <UiModal v-else :model-value="modelValue" :title="title" size="xl" @update:model-value="emit('update:modelValue', $event)">
    <DinoPicker v-if="modelValue" :model-value="current" autofocus @pick="pick" />
  </UiModal>
</template>
