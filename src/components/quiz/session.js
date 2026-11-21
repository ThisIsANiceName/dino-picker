// In-progress quiz persistence (sessionStorage, guarded: private modes can throw).
const KEY = 'dino:quiz:v1'

export function loadSession() {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return null
    const s = JSON.parse(raw)
    if (!s || typeof s !== 'object') return null
    if (!['question', 'reveal'].includes(s.stage)) return null
    return {
      stage: s.stage,
      forId: typeof s.forId === 'string' ? s.forId : '',
      cursor: Number.isInteger(s.cursor) ? s.cursor : 0,
      picked: s.picked && typeof s.picked === 'object' ? s.picked : {},
      chosenId: typeof s.chosenId === 'string' ? s.chosenId : '',
    }
  } catch {
    return null
  }
}

export function saveSession(state) {
  try {
    if (!state || state.stage === 'intro') sessionStorage.removeItem(KEY)
    else sessionStorage.setItem(KEY, JSON.stringify(state))
  } catch { /* storage unavailable: the quiz still works, it just will not resume */ }
}

export const clearSession = () => saveSession(null)
