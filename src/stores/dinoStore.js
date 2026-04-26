import { defineStore } from 'pinia'

export const useDinoStore = defineStore('dinos', {
  state: () => ({
    dinos: [],
    loading: false,
    seeding: false,  // true on first run while server is building the DB
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
        const res = await fetch('/dinos')
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        this.seeding = res.headers.get('x-dinos-seeding') === '1'
        this.dinos = await res.json()
      } catch (err) {
        this.error = err.message ?? 'Unknown error'
      } finally {
        this.loading = false
      }
    },

    getDinoByName(name) {
      if (!name) return null
      return this.dinos.find((d) => d.name.toLowerCase() === name.toLowerCase()) ?? null
    },
  },
})
