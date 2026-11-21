// Shared studio state: one working config, undo/redo history (max 50), dirty tracking,
// localStorage drafts (debounced 500 ms), a leave guard and keyboard shortcuts.
// Used by both the Avatar Studio and the Shirt Studio.
import { computed, onBeforeUnmount, onMounted, ref, shallowRef } from 'vue'
import { onBeforeRouteLeave } from 'vue-router'

const clone = (v) => JSON.parse(JSON.stringify(v))
const MAX_HISTORY = 50

export function useStudio({ draftKey = () => null } = {}) {
  const config = ref(null)
  const committed = shallowRef('null') // JSON of the last committed state
  const savedSnap = shallowRef('null') // JSON of the last saved state
  const undoStack = ref([])
  const redoStack = ref([])
  const announcement = ref('')
  let draftTimer = null

  const canUndo = computed(() => undoStack.value.length > 0)
  const canRedo = computed(() => redoStack.value.length > 0)
  const dirty = computed(() => committed.value !== savedSnap.value)
  const stepsSinceSave = computed(() => undoStack.value.length)

  function announce(text) {
    announcement.value = ''
    // Re-set on the next frame so identical messages are read again.
    requestAnimationFrame(() => { announcement.value = text })
  }

  /** Start from a config. `saved` (default: the same) is what "Reset" returns to. */
  function load(cfg, { saved = cfg } = {}) {
    config.value = clone(cfg)
    committed.value = JSON.stringify(cfg)
    savedSnap.value = JSON.stringify(saved)
    undoStack.value = []
    redoStack.value = []
  }

  /**
   * Record the current config as one undo step. Call after live edits settle
   * (pointer up, Enter, swatch click). An optional mutator runs first.
   */
  function commit(label, mutator) {
    if (mutator) mutator(config.value)
    const now = JSON.stringify(config.value)
    if (now === committed.value) return false
    undoStack.value.push({ snap: committed.value, label })
    if (undoStack.value.length > MAX_HISTORY) undoStack.value.shift()
    redoStack.value = []
    committed.value = now
    scheduleDraft()
    return true
  }

  /** Throw away uncommitted live edits (for example Esc during a drag). */
  function revertLive() {
    config.value = JSON.parse(committed.value)
  }

  function undo() {
    const entry = undoStack.value.pop()
    if (!entry) return
    redoStack.value.push({ snap: committed.value, label: entry.label })
    committed.value = entry.snap
    config.value = JSON.parse(entry.snap)
    scheduleDraft()
    announce(`Undid: ${entry.label}`)
  }

  function redo() {
    const entry = redoStack.value.pop()
    if (!entry) return
    undoStack.value.push({ snap: committed.value, label: entry.label })
    committed.value = entry.snap
    config.value = JSON.parse(entry.snap)
    scheduleDraft()
    announce(`Redid: ${entry.label}`)
  }

  /** Back to the last saved config, as one undoable step. */
  function reset() {
    if (!dirty.value) return
    undoStack.value.push({ snap: committed.value, label: 'reset' })
    if (undoStack.value.length > MAX_HISTORY) undoStack.value.shift()
    redoStack.value = []
    committed.value = savedSnap.value
    config.value = JSON.parse(savedSnap.value)
    clearDraft()
    announce('Reset to the last saved version')
  }

  function markSaved(cfg = config.value) {
    savedSnap.value = JSON.stringify(cfg)
    clearDraft()
  }

  // ── Drafts ──────────────────────────────────────────────────────────────
  function scheduleDraft() {
    clearTimeout(draftTimer)
    draftTimer = setTimeout(writeDraft, 500)
  }
  function writeDraft() {
    const key = draftKey()
    if (!key) return
    try {
      if (dirty.value) localStorage.setItem(key, JSON.stringify({ at: Date.now(), config: JSON.parse(committed.value) }))
      else localStorage.removeItem(key)
    } catch { /* storage full or unavailable: drafts are best effort */ }
  }
  function readDraft() {
    const key = draftKey()
    if (!key) return null
    try {
      const d = JSON.parse(localStorage.getItem(key) ?? 'null')
      return d && typeof d.at === 'number' && d.config ? d : null
    } catch { return null }
  }
  function clearDraft() {
    clearTimeout(draftTimer)
    const key = draftKey()
    if (!key) return
    try { localStorage.removeItem(key) } catch { /* ignore */ }
  }

  onBeforeUnmount(() => {
    if (draftTimer) { clearTimeout(draftTimer); writeDraft() }
  })

  return {
    config, committed, canUndo, canRedo, dirty, stepsSinceSave, announcement,
    load, commit, revertLive, undo, redo, reset, markSaved, announce,
    readDraft, clearDraft,
  }
}

/**
 * Leave guard: while `dirty` is true, route changes wait for the user's choice.
 * Returns { open, choose(action) } for a UiModal: 'stay' | 'discard' | 'save'.
 */
export function useLeaveGuard(dirty, { save, discard } = {}) {
  const open = ref(false)
  let pending = null
  let bypass = false

  onBeforeRouteLeave(() => {
    if (bypass || !dirty.value) return true
    open.value = true
    return new Promise((resolve) => { pending = resolve })
  })

  async function choose(action) {
    const resolve = pending
    pending = null
    if (action === 'save') {
      try {
        const ok = await save?.()
        open.value = false
        resolve?.(ok !== false)
      } catch {
        open.value = false
        resolve?.(false)
      }
      return
    }
    open.value = false
    if (action === 'discard') {
      discard?.()
      resolve?.(true)
    } else resolve?.(false)
  }

  const onBeforeUnload = (e) => {
    if (!dirty.value || bypass) return
    e.preventDefault()
    e.returnValue = ''
  }
  onMounted(() => window.addEventListener('beforeunload', onBeforeUnload))
  onBeforeUnmount(() => window.removeEventListener('beforeunload', onBeforeUnload))

  return { open, choose, allowNext: () => { bypass = true; setTimeout(() => { bypass = false }, 0) } }
}

const isTextField = (el) =>
  !!el && (el.isContentEditable || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' ||
    (el.tagName === 'INPUT' && !['range', 'checkbox', 'radio', 'button', 'color', 'file'].includes(el.type)))

/**
 * Keyboard shortcuts. `handlers` maps names to functions:
 *   undo, redo, save, export, help  (modifier combos, work everywhere except undo/redo in text fields)
 *   keys: { r: fn, '1': fn, ArrowLeft: fn(event), ... }  single keys, ignored in text fields and dialogs
 */
export function useStudioKeys(handlers) {
  function onKey(e) {
    if (e.defaultPrevented) return
    const mod = e.ctrlKey || e.metaKey
    const inText = isTextField(e.target)
    const inDialog = !!e.target?.closest?.('[aria-modal="true"]')
    const k = e.key.length === 1 ? e.key.toLowerCase() : e.key
    if (mod && !e.altKey) {
      if (k === 'z' && !inText && !inDialog) { e.preventDefault(); (e.shiftKey ? handlers.redo : handlers.undo)?.() }
      else if (k === 'y' && !inText && !inDialog) { e.preventDefault(); handlers.redo?.() }
      else if (k === 's') { e.preventDefault(); if (!inDialog) handlers.save?.() }
      else if (k === 'e') { e.preventDefault(); if (!inDialog) handlers.export?.() }
      return
    }
    if (inText || inDialog || e.altKey) return
    if (e.key === '?') { e.preventDefault(); handlers.help?.(); return }
    const fn = handlers.keys?.[k] ?? handlers.keys?.[e.key]
    if (fn && fn(e) !== false) e.preventDefault()
  }
  onMounted(() => window.addEventListener('keydown', onKey))
  onBeforeUnmount(() => window.removeEventListener('keydown', onKey))
}

/** Reactive "is this a desktop studio layout" (>= 1024px). */
export function useIsDesktop(query = '(min-width: 1024px)') {
  const mq = typeof window !== 'undefined' ? window.matchMedia(query) : null
  const is = ref(mq ? mq.matches : true)
  const on = (e) => { is.value = e.matches }
  onMounted(() => mq?.addEventListener('change', on))
  onBeforeUnmount(() => mq?.removeEventListener('change', on))
  return is
}

export const isMac = () => typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform ?? '')
