// App-wide data bootstrap: dinos, persons and team are loaded once by App.vue.
// Views read `status` to choose between skeleton, error and content.
import { reactive, computed } from 'vue'
import { useDinoStore } from '../../stores/dinoStore.js'
import { usePersonStore } from '../../stores/personStore.js'
import { useTeamStore } from '../../stores/teamStore.js'

const state = reactive({ status: 'idle', error: null })
let inflight = null

export function useAppData() {
  const dinoStore = useDinoStore()
  const personStore = usePersonStore()
  const teamStore = useTeamStore()

  async function load(force = false) {
    if (inflight) return inflight
    if (state.status === 'ready' && !force) return
    state.status = 'loading'
    state.error = null
    inflight = (async () => {
      await Promise.all([dinoStore.fetchDinos(force), personStore.fetchPersons(), teamStore.fetchTeam()])
      const err = dinoStore.error || personStore.error
      if (err) {
        state.status = 'error'
        state.error = err
      } else {
        state.status = 'ready'
      }
    })().finally(() => { inflight = null })
    return inflight
  }

  // Fast lookup by genus, recomputed only when the dino list changes.
  const dinoIndex = computed(() => {
    const m = new Map()
    for (const d of dinoStore.dinos) m.set(d.name.toLowerCase(), d)
    return m
  })
  const dinoFor = (personOrName) => {
    const n = typeof personOrName === 'string' ? personOrName : personOrName?.dinoName
    return n ? dinoIndex.value.get(String(n).toLowerCase()) ?? null : null
  }

  return {
    state,
    ready: computed(() => state.status === 'ready'),
    loading: computed(() => state.status === 'loading' || state.status === 'idle'),
    failed: computed(() => state.status === 'error'),
    load,
    retry: () => load(true),
    dinoFor,
    dinoIndex,
  }
}
