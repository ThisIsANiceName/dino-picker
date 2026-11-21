import { defineStore } from 'pinia'

export const useTeamStore = defineStore('team', {
  state: () => ({
    name: 'Our Team',
    year: new Date().getFullYear(),
    loaded: false,
    error: null,
  }),

  actions: {
    async fetchTeam() {
      this.error = null
      try {
        const res = await fetch('/team')
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const t = await res.json()
        this.name = t.name
        this.year = t.year
        this.loaded = true
      } catch (err) {
        this.error = err.message ?? 'Unknown error'
      }
    },

    async saveTeam({ name = this.name, year = this.year } = {}) {
      const prev = { name: this.name, year: this.year }
      this.name = name
      this.year = year
      try {
        const res = await fetch('/team', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, year }),
        })
        if (!res.ok) {
          const body = await res.json().catch(() => ({}))
          throw new Error(body.error ?? `HTTP ${res.status}`)
        }
        const t = await res.json()
        this.name = t.name
        this.year = t.year
      } catch (err) {
        this.name = prev.name
        this.year = prev.year
        this.error = err.message
        throw err
      }
    },
  },
})
