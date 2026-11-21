<!-- ErrorState: network/load error with the meteor spot and a retry button. -->
<script setup>
import { UiButton, UiEmptyState } from '../ui/index.js'
import { SPOTS } from './spots.js'

defineProps({
  title: { type: String, default: "Couldn't reach the server" },
  text: { type: String, default: 'Your changes are kept on this device. Check the connection and try again.' },
  compact: { type: Boolean, default: false },
})
defineEmits(['retry'])
</script>

<template>
  <UiEmptyState tone="error" :title="title" :text="text" :image="SPOTS.errorMeteor" :compact="compact">
    <template #action>
      <UiButton @click="$emit('retry')">Try again</UiButton>
    </template>
  </UiEmptyState>
</template>
