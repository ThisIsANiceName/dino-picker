// Colour utilities shared by UiColorPicker, Avatar Studio and Shirt Studio.

export function normalizeHex(input) {
  if (typeof input !== 'string') return null
  let h = input.trim().replace(/^#/, '')
  if (/^[0-9a-f]{3}$/i.test(h)) h = h.split('').map((c) => c + c).join('')
  return /^[0-9a-f]{6}$/i.test(h) ? `#${h.toUpperCase()}` : null
}

export function hexToRgb(hex) {
  const h = normalizeHex(hex)
  if (!h) return null
  const n = parseInt(h.slice(1), 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

/** WCAG relative luminance, 0..1 */
export function luminance(hex) {
  const c = hexToRgb(hex)
  if (!c) return 0
  const lin = (v) => {
    v /= 255
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b)
}

/** WCAG contrast ratio between two hex colours, 1..21 */
export function contrastRatio(a, b) {
  const la = luminance(a)
  const lb = luminance(b)
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05)
}

/** Ink (#1E2420) or white, whichever reads better on `bg`. */
export function readableOn(bg) {
  return contrastRatio(bg, '#1E2420') >= contrastRatio(bg, '#FFFFFF') ? '#1E2420' : '#FFFFFF'
}

/** Shirt Studio rule: warn below 3:1 between a design colour and the garment. */
export const LOW_CONTRAST_THRESHOLD = 3

/** Darken (amt < 0) or lighten (amt > 0) by mixing towards black/white. amt in -1..1 */
export function shade(hex, amt) {
  const c = hexToRgb(hex)
  if (!c) return hex
  const t = amt < 0 ? 0 : 255
  const p = Math.abs(amt)
  const mix = (v) => Math.round((t - v) * p + v)
  return `#${[mix(c.r), mix(c.g), mix(c.b)].map((v) => v.toString(16).padStart(2, '0')).join('').toUpperCase()}`
}
