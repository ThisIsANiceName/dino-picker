// Change a teammate's dino with an undo toast.
import { usePersonStore } from '../../stores/personStore.js'
import { useToast } from '../../composables/useToast.js'
import { dinoName, firstName } from '../dinopedia/dinoUtils.js'

export function useChangeDino() {
  const personStore = usePersonStore()
  const toast = useToast()
  return async function changeDino(person, dino) {
    const prev = person.dinoName ?? null
    if (prev === dino.name) return
    try {
      await personStore.assignDino(person.id, dino.name)
      toast.show({
        title: `${firstName(person.name)} is now a ${dinoName(dino)}`,
        tone: 'success',
        action: { label: 'Undo', onClick: () => personStore.assignDino(person.id, prev).catch(() => toast.error("Couldn't undo")) },
        duration: 7000,
      })
    } catch (err) {
      toast.error("Couldn't change the dino", 'Check the connection and try again.')
    }
  }
}
