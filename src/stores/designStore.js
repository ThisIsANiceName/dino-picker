import { defineStore } from 'pinia'

const BASE = '/designs'
const JSON_HEADERS = { 'Content-Type': 'application/json' }

async function failure(res) {
  const body = await res.json().catch(() => ({}))
  return new Error(body.error ?? `HTTP ${res.status}`)
}

export const useDesignStore = defineStore('designs', {
  state: () => ({
    designs: [],
    loading: false,
    error: null,
  }),

  getters: {
    getDesignById: (state) => (id) => state.designs.find((d) => d.id === id) ?? null,
    designsForPerson: (state) => (personId) => state.designs.filter((d) => d.personId === personId),
  },

  actions: {
    /** Load designs (all, or just one person's) into the store, replacing that slice. */
    async fetchDesigns(personId = null) {
      this.loading = true
      this.error = null
      try {
        const res = await fetch(personId ? `${BASE}?personId=${encodeURIComponent(personId)}` : BASE)
        if (!res.ok) throw await failure(res)
        const list = await res.json()
        this.designs = personId
          ? [...this.designs.filter((d) => d.personId !== personId), ...list]
          : list
        return list
      } catch (err) {
        this.error = err.message ?? 'Unknown error'
        throw err
      } finally {
        this.loading = false
      }
    },

    listByPerson(personId) {
      return this.fetchDesigns(personId)
    },

    async createDesign({ personId = null, name = '', kind = 'shirt', config }) {
      try {
        const res = await fetch(BASE, {
          method: 'POST',
          headers: JSON_HEADERS,
          body: JSON.stringify({ personId, name, kind, config }),
        })
        if (!res.ok) throw await failure(res)
        const design = await res.json()
        this.designs.push(design)
        return design
      } catch (err) {
        this.error = err.message
        throw err
      }
    },

    async updateDesign(id, patch) {
      const idx = this.designs.findIndex((d) => d.id === id)
      const prev = idx !== -1 ? { ...this.designs[idx] } : null
      if (idx !== -1) Object.assign(this.designs[idx], patch)
      try {
        const res = await fetch(`${BASE}/${id}`, {
          method: 'PATCH',
          headers: JSON_HEADERS,
          body: JSON.stringify(patch),
        })
        if (!res.ok) throw await failure(res)
        const saved = await res.json()
        const i = this.designs.findIndex((d) => d.id === id)
        if (i !== -1) this.designs[i] = saved
        return saved
      } catch (err) {
        const i = this.designs.findIndex((d) => d.id === id)
        if (prev && i !== -1) Object.assign(this.designs[i], prev)
        this.error = err.message
        throw err
      }
    },

    async removeDesign(id) {
      const removed = this.designs.find((d) => d.id === id)
      this.designs = this.designs.filter((d) => d.id !== id)
      try {
        const res = await fetch(`${BASE}/${id}`, { method: 'DELETE' })
        if (!res.ok) throw await failure(res)
      } catch (err) {
        if (removed) this.designs.push(removed)
        this.error = err.message
        throw err
      }
    },
  },
})
