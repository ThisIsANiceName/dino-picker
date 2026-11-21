<!-- NotFoundView: the lost-dino 404. -->
<script setup>
import { useRoute } from 'vue-router'
import { UiButton } from '../components/ui/index.js'
import { SPOTS } from '../components/layout/spots.js'

const route = useRoute()
</script>

<template>
  <section class="mx-auto max-w-[1240px] px-4 sm:px-6 py-16 sm:py-24 flex flex-col items-center text-center">
    <div class="relative w-52 sm:w-64">
      <img :src="SPOTS.errorMeteor" alt="" class="w-full h-auto nf-bob" />
    </div>
    <p class="mt-8 font-semibold text-ink-subtle tabular">Error 404</p>
    <h1 tabindex="-1" class="mt-2 font-display text-display-md sm:text-display-lg max-w-[16ch]">This page went extinct.</h1>
    <p class="mt-4 text-ink-muted max-w-[40ch]">
      Nothing lives at <code class="font-semibold text-ink break-all">{{ route.fullPath }}</code> any more. The fossil record suggests heading back.
    </p>
    <div class="mt-8 flex flex-wrap justify-center gap-3">
      <UiButton icon="arrow-left" to="/">Back to the team</UiButton>
      <UiButton variant="ghost" icon="book" to="/dinopedia">Browse the Dinopedia</UiButton>
    </div>
  </section>
</template>

<style scoped>
.nf-bob { animation: bob 3.2s var(--ease-in-out) infinite; }
@keyframes bob { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
</style>
