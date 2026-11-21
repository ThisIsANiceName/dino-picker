// Remembers the teammate that was just added so the Team wall can slap their card on.
let lastAdded = null
export const markAdded = (id) => { lastAdded = id }
export function consumeAdded() {
  const id = lastAdded
  lastAdded = null
  return id
}
