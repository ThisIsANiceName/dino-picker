// Remove a teammate with an undo window. The server delete (which also drops
// their shirt designs and photo) only runs once the undo toast has expired,
// so "Undo" restores everything.
import { usePersonStore } from '../../stores/personStore.js'
import { useToast } from '../../composables/useToast.js'
import { firstName } from '../dinopedia/dinoUtils.js'

const UNDO_MS = 8000
const pending = new Map()

function flushAll() {
  for (const [id] of pending) fetch(`/persons/${encodeURIComponent(id)}`, { method: 'DELETE', keepalive: true }).catch(() => {})
  pending.clear()
}
if (typeof window !== 'undefined') window.addEventListener('pagehide', flushAll)

export function useRemovePerson() {
  const personStore = usePersonStore()
  const toast = useToast()

  return function removePerson(person) {
    const snapshot = { ...person }
    personStore.persons = personStore.persons.filter((p) => p.id !== person.id)
    const name = firstName(person.name)

    const commit = async () => {
      pending.delete(person.id)
      // removePerson expects the record in the list (it rolls back on failure).
      personStore.persons.push(snapshot)
      try {
        await personStore.removePerson(snapshot.id)
      } catch {
        toast.error(`Couldn't remove ${name}`, "Couldn't reach the server. They're back on the team.")
      }
    }
    pending.set(person.id, setTimeout(commit, UNDO_MS))

    toast.show({
      title: `Removed ${name}`,
      tone: 'neutral',
      duration: UNDO_MS - 300,
      action: {
        label: 'Undo',
        onClick: () => {
          clearTimeout(pending.get(person.id))
          pending.delete(person.id)
          if (!personStore.persons.some((p) => p.id === snapshot.id)) personStore.persons.push(snapshot)
          toast.success(`${name} is back`)
        },
      },
    })
  }
}
