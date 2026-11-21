// Reduced-motion helpers. CSS already neutralises animations when the OS
// setting or the in-app toggle is on; use these in JS to *skip* choreography
// (e.g. jump straight to the hatched quiz result instead of waiting 1.6 s).
const KEY = 'dino:motion'

export function prefersReducedMotion() {
  if (typeof window === 'undefined') return false
  if (document.documentElement.dataset.motion === 'reduce') return true
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

/** In-app toggle: 'reduce' | 'full' | null (follow OS). Persists in localStorage. */
export function setMotionPreference(pref) {
  if (pref === 'reduce') document.documentElement.dataset.motion = 'reduce'
  else delete document.documentElement.dataset.motion
  try {
    if (pref) localStorage.setItem(KEY, pref)
    else localStorage.removeItem(KEY)
  } catch { /* storage unavailable */ }
}

/** Call once at startup (App.vue onMounted) to restore the toggle. */
export function restoreMotionPreference() {
  try {
    const pref = localStorage.getItem(KEY)
    if (pref === 'reduce') document.documentElement.dataset.motion = 'reduce'
  } catch { /* ignore */ }
}
