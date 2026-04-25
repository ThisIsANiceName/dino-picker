import { defineStore } from 'pinia'
import { DINO_FALLBACK } from '../data/dinoFallback.js'

const API_BASE = '/api/v1'

// RESTasaurus shape → our internal shape (matches original DinoAPI spec)
function normalizeDino(raw) {
  const range = raw.temporalRange?.toLowerCase() ?? ''
  let period = ''
  if (range.includes('cretaceous')) period = 'cretaceous'
  else if (range.includes('jurassic')) period = 'jurassic'
  else if (range.includes('triassic')) period = 'triassic'

  return {
    _id: String(raw.id),
    name: raw.name?.toLowerCase() ?? '',
    weight: null,
    height: null,
    length: null,
    diet: raw.diet?.toLowerCase() ?? '',
    period,
    existed: raw.temporalRange ?? '',
    region: '',
    type: raw.locomotionType ?? '',
    description: raw.description ?? '',
    image: raw.image?.imageURL ?? '',
    isPopular: false,
  }
}

export const useDinoStore = defineStore('dinos', {
  state: () => ({
    dinos: [],
    loading: false,
    error: null,
  }),

  getters: {
    dinosByDiet: (state) => (diet) =>
      state.dinos.filter((d) => d.diet?.toLowerCase() === diet.toLowerCase()),

    dinosByPeriod: (state) => (period) =>
      state.dinos.filter((d) => d.period?.toLowerCase() === period.toLowerCase()),

    popularDinos: (state) => state.dinos.filter((d) => d.isPopular),

    dietOptions: (state) =>
      [...new Set(state.dinos.map((d) => d.diet).filter(Boolean))].sort(),

    periodOptions: (state) =>
      [...new Set(state.dinos.map((d) => d.period).filter(Boolean))].sort(),
  },

  actions: {
    async fetchDinos(force = false) {
      if (!force && this.dinos.length > 0) return
      this.loading = true
      this.error = null
      try {
        const res = await fetch(`${API_BASE}/dinosaurs`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json()
        // RESTasaurus wraps results in { data: [...], nextPage, ... }
        const raw = Array.isArray(json) ? json : (json.data ?? [])
        this.dinos = raw.map(normalizeDino)
      } catch (err) {
        this.error = err.message ?? 'Unknown error'
        if (this.dinos.length === 0) this.dinos = DINO_FALLBACK
      } finally {
        this.loading = false
      }
    },

    getDinoByName(name) {
      if (!name) return null
      return (
        this.dinos.find((d) => d.name.toLowerCase() === name.toLowerCase()) ?? null
      )
    },

    searchDinos({ query = '', diet = '', period = '' } = {}) {
      const q = query.toLowerCase()
      return this.dinos.filter((d) => {
        const matchesQuery = !q || d.name.toLowerCase().includes(q)
        const matchesDiet = !diet || d.diet?.toLowerCase() === diet.toLowerCase()
        const matchesPeriod = !period || d.period?.toLowerCase() === period.toLowerCase()
        return matchesQuery && matchesDiet && matchesPeriod
      })
    },
  },
})
