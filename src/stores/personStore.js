import { uuid } from '../lib/safeStorage.js'
import { defineStore } from 'pinia'

const BASE = '/persons'
const JSON_HEADERS = { 'Content-Type': 'application/json' }

async function failure(res) {
  const body = await res.json().catch(() => ({}))
  return new Error(body.error ?? `HTTP ${res.status}`)
}

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
        if (!res.ok) throw await failure(res)
        this.persons = await res.json()
      } catch (err) {
        this.error = err.message ?? 'Unknown error'
      } finally {
        this.loading = false
      }
    },

    async addPerson({ name, photoUrl = '', dinoName = null, avatar = null, note = '', quiz = null }) {
      const now = new Date().toISOString()
      const person = {
        id: uuid(), name, photoUrl, dinoName, avatar, note, quiz, createdAt: now, updatedAt: now,
      }
      this.persons.push(person)
      try {
        const res = await fetch(BASE, {
          method: 'POST',
          headers: JSON_HEADERS,
          body: JSON.stringify({ id: person.id, name, photoUrl, dinoName, avatar, note, quiz }),
        })
        if (!res.ok) throw await failure(res)
        // Replace the optimistic copy with the server's canonical record (trimmed name, timestamps, ...)
        const saved = await res.json().catch(() => null)
        const idx = this.persons.findIndex((p) => p.id === person.id)
        if (saved && idx !== -1) this.persons[idx] = saved
        return saved ?? person
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
          headers: JSON_HEADERS,
          body: JSON.stringify(patch),
        })
        if (!res.ok) throw await failure(res)
        const saved = await res.json().catch(() => null)
        const i = this.persons.findIndex((p) => p.id === id)
        if (saved && i !== -1) this.persons[i] = saved
        return saved
      } catch (err) {
        // Roll back optimistic update
        const i = this.persons.findIndex((p) => p.id === id)
        if (prev && i !== -1) Object.assign(this.persons[i], prev)
        this.error = err.message
        throw err
      }
    },

    async removePerson(id) {
      const removed = this.persons.find((p) => p.id === id)
      this.persons = this.persons.filter((p) => p.id !== id)
      try {
        const res = await fetch(`${BASE}/${id}`, { method: 'DELETE' })
        if (!res.ok) throw await failure(res)
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

    saveAvatar(id, avatar) {
      return this.updatePerson(id, { avatar })
    },

    saveNote(id, note) {
      return this.updatePerson(id, { note })
    },

    saveQuiz(id, quiz) {
      return this.updatePerson(id, { quiz })
    },

    /** Upload an already cropped/re-encoded image Blob (image/png | image/jpeg | image/webp, max 5 MB). */
    async uploadPhoto(id, blob) {
      const idx = this.persons.findIndex((p) => p.id === id)
      const prev = idx !== -1 ? { ...this.persons[idx] } : null
      try {
        const res = await fetch(`${BASE}/${id}/photo`, {
          method: 'PUT',
          headers: { 'Content-Type': blob.type },
          body: blob,
        })
        if (!res.ok) throw await failure(res)
        const saved = await res.json()
        const i = this.persons.findIndex((p) => p.id === id)
        if (i !== -1) this.persons[i] = saved
        return saved
      } catch (err) {
        const i = this.persons.findIndex((p) => p.id === id)
        if (prev && i !== -1) Object.assign(this.persons[i], prev)
        this.error = err.message
        throw err
      }
    },

    async removePhoto(id) {
      const idx = this.persons.findIndex((p) => p.id === id)
      const prev = idx !== -1 ? { ...this.persons[idx] } : null
      try {
        const res = await fetch(`${BASE}/${id}/photo`, { method: 'DELETE' })
        if (!res.ok) throw await failure(res)
        const saved = await res.json()
        const i = this.persons.findIndex((p) => p.id === id)
        if (i !== -1) this.persons[i] = saved
        return saved
      } catch (err) {
        const i = this.persons.findIndex((p) => p.id === id)
        if (prev && i !== -1) Object.assign(this.persons[i], prev)
        this.error = err.message
        throw err
      }
    },
  },
})
