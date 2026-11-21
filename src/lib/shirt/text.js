// Text layout shared by the canvas renderer (preview + PNG export) and the SVG outline export.
// One layout function, two "measure" back ends, so curved and tracked text cannot diverge.
import { fontByFamily, GRADUATE_FALLBACK, MASTER } from './model.js'

// Characters the "latin" subset of a Latin-1-only font (Graduate) can draw.
const LATIN1_PLUS = /^[\u0000-ÿıŒœˆ˚˜ -⁯€™\n]*$/

/** Characters in `text` that a Latin-1-only font cannot draw (unique, in order). */
export function unsupportedChars(text) {
  const out = []
  for (const ch of String(text)) if (!LATIN1_PLUS.test(ch) && !out.includes(ch)) out.push(ch)
  return out
}

/** Family + weight actually used for a line: Graduate falls back per line when it lacks a glyph. */
export function effectiveFont(layer, text) {
  const font = fontByFamily(layer.font)
  if (font.latin1Only && unsupportedChars(text).length) return { ...GRADUATE_FALLBACK, fallback: true }
  return { family: font.family, weight: layer.weight, fallback: false }
}

export const fontCss = (font, size) => `${font.weight} ${size}px "${font.family}"`

// ── Browser font loading ────────────────────────────────────────────────────────────────
const loaded = new Set()

/** Make sure every family/weight (and the unicode-range subset the text needs) is loaded. */
export async function ensureFonts(specs) {
  const jobs = []
  for (const s of specs) {
    const key = `${s.family}|${s.weight}|${[...new Set(s.text ?? '')].sort().join('')}`
    if (loaded.has(key)) continue
    jobs.push(
      document.fonts.load(`${s.weight} 64px "${s.family}"`, s.text || 'Aa0')
        .then(() => { loaded.add(key) })
        .catch(() => {}),
    )
  }
  if (jobs.length) {
    await Promise.all(jobs)
    widthCache.clear()
  }
}

// ── Canvas measuring ────────────────────────────────────────────────────────────────────
const REF = 200
const widthCache = new Map()
let mctx = null

/** measure(str) -> advance width in px for 1px font size (multiply by the size). */
export function canvasMeasure(font) {
  if (!mctx) mctx = document.createElement('canvas').getContext('2d')
  const css = fontCss(font, REF)
  return (str) => {
    if (!str) return 0
    const key = `${css}|${str}`
    let w = widthCache.get(key)
    if (w === undefined) {
      mctx.font = css
      w = mctx.measureText(str).width / REF
      if (widthCache.size > 6000) widthCache.clear()
      widthCache.set(key, w)
    }
    return w
  }
}

// ── Layout ──────────────────────────────────────────────────────────────────────────────
const BASELINE = 0.36 // baseline sits this many ems below the line's centre (centres cap height)
const LINE_HEIGHT = 1.2

/**
 * Lay out a text layer around (0, 0).
 *   text      resolved string (may contain \n)
 *   opts      { size, tracking (1/1000 em), arc (-100..100), measure(str)->em width, maxW, maxH, columns }
 * Returns { pieces: [{ text, x, y, rot, dx }], w, h, scale, lines }
 *   draw a piece with: translate(x, y); rotate(rot); fillText(text, dx, 0)   (all before `scale`)
 *   `scale` < 1 when the text was shrunk to fit maxW/maxH; w/h are the final (scaled) box.
 */
export function layoutText(text, { size, tracking = 0, arc = 0, measure, maxW = Infinity, maxH = Infinity, columns = 1 }) {
  const lines = String(text).split('\n').map((l) => l.trim()).filter((l, i, all) => l || all.length === 1)
  const track = (tracking / 1000) * size
  const pieces = []
  let w = 0
  let h = 0

  const lineWidth = (str) => {
    const n = Array.from(str).length
    return measure(str) * size + Math.max(0, n - 1) * track
  }

  if (lines.length <= 1) {
    const str = lines[0] ?? ''
    const chars = Array.from(str)
    const W = lineWidth(str)
    if (!arc || chars.length < 2) {
      if (!track) pieces.push({ text: str, x: 0, y: BASELINE * size, rot: 0, dx: -W / 2 })
      else {
        let prefix = ''
        chars.forEach((ch, i) => {
          const x0 = measure(prefix) * size + i * track
          pieces.push({ text: ch, x: x0 - W / 2, y: BASELINE * size, rot: 0, dx: 0 })
          prefix += ch
        })
      }
      w = W
      h = size
    } else {
      // Bend the baseline around a circle. arc 100 = half a circle; positive arches up.
      const theta = (Math.abs(arc) / 100) * Math.PI
      const R = Math.max(W / theta, size * 0.6)
      const dir = arc > 0 ? 1 : -1
      let prefix = ''
      let minX = 0, maxX = 0, minY = -size / 2, maxY = size / 2
      chars.forEach((ch, i) => {
        const x0 = measure(prefix) * size + i * track
        prefix += ch
        const adv = measure(prefix) * size + i * track - x0
        const s = x0 + adv / 2 - W / 2 // arc length from the middle of the text
        const phi = s / R
        const px = R * Math.sin(phi)
        const py = dir * (R - R * Math.cos(phi))
        pieces.push({ text: ch, x: px, y: py, rot: dir * phi, dx: -adv / 2, baseline: BASELINE * size })
        minX = Math.min(minX, px - size * 0.5)
        maxX = Math.max(maxX, px + size * 0.5)
        minY = Math.min(minY, py - size * 0.5)
        maxY = Math.max(maxY, py + size * 0.5)
      })
      for (const p of pieces) { p.dy = p.baseline; delete p.baseline }
      w = Math.max(maxX, -minX) * 2
      h = maxY - minY
      // Keep the layer anchor at the centre of the bent block.
      const shift = (minY + maxY) / 2
      for (const p of pieces) p.y -= shift
    }
  } else {
    const cols = columns === 'auto' ? (lines.length <= 10 ? 1 : lines.length <= 24 ? 2 : 3) : Math.max(1, Math.min(4, columns | 0 || 1))
    const perCol = Math.ceil(lines.length / cols)
    const gap = size * 1.4
    const colLines = Array.from({ length: cols }, (_, c) => lines.slice(c * perCol, (c + 1) * perCol))
    const colW = colLines.map((ls) => Math.max(0, ...ls.map(lineWidth)))
    w = colW.reduce((a, b) => a + b, 0) + gap * (cols - 1)
    h = perCol * size * LINE_HEIGHT
    let left = -w / 2
    colLines.forEach((ls, c) => {
      const cx = left + colW[c] / 2
      ls.forEach((str, r) => {
        const W = lineWidth(str)
        const y = -h / 2 + (r + 0.5) * size * LINE_HEIGHT + BASELINE * size
        if (!track) pieces.push({ text: str, x: cx, y, rot: 0, dx: -W / 2 })
        else {
          let prefix = ''
          Array.from(str).forEach((ch, i) => {
            pieces.push({ text: ch, x: cx - W / 2 + measure(prefix) * size + i * track, y, rot: 0, dx: 0 })
            prefix += ch
          })
        }
      })
      left += colW[c] + gap
    })
  }

  const scale = Math.min(1, w > 0 ? maxW / w : 1, h > 0 ? maxH / h : 1)
  return { pieces, w: w * scale, h: h * scale, scale, lines: lines.length }
}

/** Fit limits for a text layer inside its art box (never wider than the canvas allows). */
export function fitLimits(layer, box) {
  const multi = String(layer.text ?? '').includes('{roster}')
  return {
    maxW: Math.min(box.w * (layer.maxW ?? 0.98), MASTER.w),
    maxH: multi ? box.h * (layer.maxH ?? 0.62) : Infinity,
    columns: multi ? (layer.columns ?? 'auto') : 1,
  }
}
