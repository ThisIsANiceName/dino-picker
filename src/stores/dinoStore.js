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
    wikipediaUrl: raw.source?.wikipediaURL ?? null,
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
        const raw = Array.isArray(json) ? json : (json.data ?? [])
        const page1 = raw.map(normalizeDino)
        const page1Names = new Set(page1.map((d) => d.name))
        // Show app immediately with page 1 + fallback for the rest
        this.dinos = [...page1, ...DINO_FALLBACK.filter((d) => !page1Names.has(d.name))]
        // Fetch remaining pages in background — replaces fallback entries as they load
        if (json.nextPage) this._fetchRemainingPages(json.nextPage)
      } catch (err) {
        this.error = err.message ?? 'Unknown error'
        if (this.dinos.length === 0) this.dinos = [...DINO_FALLBACK]
      } finally {
        this.loading = false
      }
    },

    async _fetchRemainingPages(firstNextPath) {
      // nextPage from RESTasaurus is a relative path ("/api/v1/dinosaurs?page=2")
      // which routes through our existing Vite/Express proxy — no origin needed.
      let path = firstNextPath
      const laterPages = []
      while (path) {
        try {
          const res = await fetch(path)
          if (!res.ok) break
          const json = await res.json()
          laterPages.push(...(Array.isArray(json) ? json : (json.data ?? [])).map(normalizeDino))
          path = json.nextPage ?? null
        } catch {
          break
        }
      }
      if (!laterPages.length) return
      // Rebuild: all API dinos (page 1 already in store + later pages),
      // fallback only for names the API never returned.
      const page1Api = this.dinos.filter((d) => !d._id.startsWith('fallback-'))
      const allApi = [...page1Api, ...laterPages]
      const allApiNames = new Set(allApi.map((d) => d.name))
      this.dinos = [...allApi, ...DINO_FALLBACK.filter((d) => !allApiNames.has(d.name))]
    },

    getDinoByName(name) {
      if (!name) return null
      return (
        this.dinos.find((d) => d.name.toLowerCase() === name.toLowerCase()) ?? null
      )
    },

  },
})
