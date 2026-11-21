// useToast: app-wide toast queue. Render <UiToast /> once (App.vue); call
// useToast() anywhere.
//
//   const toast = useToast()
//   toast.success('Avatar saved')
//   toast.show({ title: 'Removed Mira', message: 'Her shirts went too.', tone: 'neutral',
//                action: { label: 'Undo', onClick: restore }, duration: 8000 })
//   toast.error('Upload failed', 'Use a JPG, PNG or WebP under 8 MB.')
//
// Tones: 'neutral' | 'success' | 'error' | 'warning' | 'info'.
// Errors stay 8 s by default, others 4.5 s; duration 0 = sticky until dismissed.
// Max 3 visible; oldest drops first. Hover/focus pauses the timer.
import { reactive, readonly } from 'vue'

const state = reactive({ items: [] })
let seq = 0
const timers = new Map()
const MAX = 3

function dismiss(id) {
  clearTimeout(timers.get(id)?.handle)
  timers.delete(id)
  const i = state.items.findIndex((t) => t.id === id)
  if (i !== -1) state.items.splice(i, 1)
}

function schedule(id, ms) {
  if (!ms) return
  timers.set(id, { handle: setTimeout(() => dismiss(id), ms), started: Date.now(), remaining: ms })
}

function pause(id) {
  const t = timers.get(id)
  if (!t) return
  clearTimeout(t.handle)
  t.remaining -= Date.now() - t.started
}

function resume(id) {
  const t = timers.get(id)
  if (!t) return
  schedule(id, Math.max(t.remaining, 1500))
}

function show(opts) {
  const o = typeof opts === 'string' ? { title: opts } : opts
  const tone = o.tone ?? 'neutral'
  const id = ++seq
  const duration = o.duration ?? (tone === 'error' ? 8000 : 4500)
  state.items.push({ id, tone, title: o.title ?? '', message: o.message ?? '', action: o.action ?? null })
  while (state.items.length > MAX) dismiss(state.items[0].id)
  schedule(id, duration)
  return id
}

const api = {
  items: readonly(state).items,
  state: readonly(state),
  show,
  success: (title, message) => show({ title, message, tone: 'success' }),
  error: (title, message) => show({ title, message, tone: 'error' }),
  warning: (title, message) => show({ title, message, tone: 'warning' }),
  info: (title, message) => show({ title, message, tone: 'info' }),
  dismiss,
  pause,
  resume,
  clear: () => [...state.items].forEach((t) => dismiss(t.id)),
}

export function useToast() {
  return api
}
