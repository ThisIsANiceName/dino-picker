import { defineStore } from 'pinia'

const BASE = '/persons'

export const usePersonStore = defineStore('persons', {
  state: () => ({
    persons: [],
    loading: false,
    error: null,
  }),

  getters: {
    getPersonById: (state) => (id) => state.persons.find((p) => p.id === id) ?? null,
  },

  actions: {
    async fetchPersons() {
      this.loading = true
      this.error = null
      try {
        const res = await fetch(BASE)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        this.persons = await res.json()
      } catch (err) {
        this.error = err.message ?? 'Unknown error'
      } finally {
        this.loading = false
      }
    },

    async addPerson({ name, photoUrl = '', dinoName = null }) {
      const person = { id: crypto.randomUUID(), name, photoUrl, dinoName }
      this.persons.push(person)
      try {
        const res = await fetch(BASE, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(person),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
      } catch (err) {
        // Roll back optimistic add
        this.persons = this.persons.filter((p) => p.id !== person.id)
        this.error = err.message
        throw err
      }
    },

    async updatePerson(id, patch) {
      const idx = this.persons.findIndex((p) => p.id === id)
      const prev = idx !== -1 ? { ...this.persons[idx] } : null
      if (idx !== -1) Object.assign(this.persons[idx], patch)
      try {
        const res = await fetch(`${BASE}/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(patch),
        })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
      } catch (err) {
        // Roll back optimistic update
        if (prev && idx !== -1) Object.assign(this.persons[idx], prev)
        this.error = err.message
        throw err
      }
    },

    async removePerson(id) {
      const removed = this.persons.find((p) => p.id === id)
      this.persons = this.persons.filter((p) => p.id !== id)
      try {
        const res = await fetch(`${BASE}/${id}`, { method: 'DELETE' })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
      } catch (err) {
        // Roll back optimistic delete
        if (removed) this.persons.push(removed)
        this.error = err.message
        throw err
      }
    },

    assignDino(personId, dinoName) {
      return this.updatePerson(personId, { dinoName })
    },
  },
})
