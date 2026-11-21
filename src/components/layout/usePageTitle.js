// Per-page title override (e.g. a teammate's name). The mobile top bar shows it,
// the route announcer reads it and document.title follows it.
import { ref, watch } from 'vue'

export const pageTitle = ref('')

export function setPageTitle(title) {
  pageTitle.value = title || ''
  if (title) document.title = `${title} · Dino Selector`
}

export function usePageTitle(getter) {
  watch(getter, (t) => setPageTitle(t), { immediate: true })
}
