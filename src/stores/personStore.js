import { defineStore } from 'pinia'

export const usePersonStore = defineStore('persons', {
  state: () => ({
    persons: [],
  }),

  getters: {
    getPersonById: (state) => (id) => state.persons.find((p) => p.id === id) ?? null,
  },

  actions: {
    addPerson({ name, photoUrl = '', dinoName = null }) {
      this.persons.push({
        id: crypto.randomUUID(),
        name,
        photoUrl,
        dinoName,
      })
    },

    updatePerson(id, patch) {
      const idx = this.persons.findIndex((p) => p.id === id)
      if (idx !== -1) Object.assign(this.persons[idx], patch)
    },

    removePerson(id) {
      this.persons = this.persons.filter((p) => p.id !== id)
    },

    assignDino(personId, dinoName) {
      this.updatePerson(personId, { dinoName })
    },
  },

  persist: true,
})
