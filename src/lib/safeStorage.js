// Browser storage that never throws. Some browsers deny storage outright (cookies blocked,
// strict privacy modes, sandboxed frames): reads then return null and writes are dropped.
function area(kind) {
  try {
    return kind === 'local' ? window.localStorage : window.sessionStorage
  } catch {
    return null
  }
}

function make(kind) {
  return {
    get(key) {
      try { return area(kind)?.getItem(key) ?? null } catch { return null }
    },
    set(key, value) {
      try { area(kind)?.setItem(key, value) } catch { /* unavailable or full */ }
    },
    remove(key) {
      try { area(kind)?.removeItem(key) } catch { /* unavailable */ }
    },
  }
}

export const safeSession = make('session')
export const safeLocal = make('local')

/** UUID v4 that also works outside secure contexts (plain http on a LAN address), where crypto.randomUUID is missing. */
export function uuid() {
  const c = globalThis.crypto
  if (c?.randomUUID) return c.randomUUID()
  const b = new Uint8Array(16)
  if (c?.getRandomValues) c.getRandomValues(b)
  else for (let i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256)
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}
