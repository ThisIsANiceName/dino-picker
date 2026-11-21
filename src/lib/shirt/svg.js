// Vector export: one side as a standalone SVG at master size (4500x5400 user units = 15x18 in),
// art embedded as vectors and text converted to outlines with opentype.js, using the same
// @fontsource files the page uses. If outlining fails, the text stays live and the result says so.
import { inlineSvgImages } from '../art/index.js'
import { MASTER, artBox, resolveText } from './model.js'
import { effectiveFont, fitLimits, layoutText } from './text.js'
import { layerArt } from './render.js'

import caprasimo400 from '@fontsource/caprasimo/files/caprasimo-latin-400-normal.woff?url'
import caprasimo400x from '@fontsource/caprasimo/files/caprasimo-latin-ext-400-normal.woff?url'
import schibsted600 from '@fontsource/schibsted-grotesk/files/schibsted-grotesk-latin-600-normal.woff?url'
import schibsted600x from '@fontsource/schibsted-grotesk/files/schibsted-grotesk-latin-ext-600-normal.woff?url'
import schibsted800 from '@fontsource/schibsted-grotesk/files/schibsted-grotesk-latin-800-normal.woff?url'
import schibsted800x from '@fontsource/schibsted-grotesk/files/schibsted-grotesk-latin-ext-800-normal.woff?url'
import graduate400 from '@fontsource/graduate/files/graduate-latin-400-normal.woff?url'
import fredoka500 from '@fontsource/fredoka/files/fredoka-latin-500-normal.woff?url'
import fredoka500x from '@fontsource/fredoka/files/fredoka-latin-ext-500-normal.woff?url'
import fredoka700 from '@fontsource/fredoka/files/fredoka-latin-700-normal.woff?url'
import fredoka700x from '@fontsource/fredoka/files/fredoka-latin-ext-700-normal.woff?url'
import shoulders700 from '@fontsource/big-shoulders-display/files/big-shoulders-display-latin-700-normal.woff?url'
import shoulders700x from '@fontsource/big-shoulders-display/files/big-shoulders-display-latin-ext-700-normal.woff?url'
import shoulders900 from '@fontsource/big-shoulders-display/files/big-shoulders-display-latin-900-normal.woff?url'
import shoulders900x from '@fontsource/big-shoulders-display/files/big-shoulders-display-latin-ext-900-normal.woff?url'

const FONT_FILES = {
  'Caprasimo|400': [caprasimo400, caprasimo400x],
  'Schibsted Grotesk|600': [schibsted600, schibsted600x],
  'Schibsted Grotesk|800': [schibsted800, schibsted800x],
  'Graduate|400': [graduate400],
  'Fredoka|500': [fredoka500, fredoka500x],
  'Fredoka|700': [fredoka700, fredoka700x],
  'Big Shoulders Display|700': [shoulders700, shoulders700x],
  'Big Shoulders Display|900': [shoulders900, shoulders900x],
}

const fontCache = new Map()

async function loadOutlineFonts(font) {
  const key = `${font.family}|${font.weight}`
  let hit = fontCache.get(key)
  if (!hit) {
    const urls = FONT_FILES[key]
    if (!urls) throw new Error(`No font file for ${key}`)
    hit = (async () => {
      const opentype = (await import('opentype.js')).default ?? (await import('opentype.js'))
      const fonts = []
      for (const url of urls) {
        const res = await fetch(url)
        if (!res.ok) throw new Error(`Font ${url}: HTTP ${res.status}`)
        fonts.push(opentype.parse(await res.arrayBuffer()))
      }
      return fonts
    })()
    fontCache.set(key, hit)
    hit.catch(() => fontCache.delete(key))
  }
  return hit
}

/** Glyph run for a string: [{ glyph, font, adv (em) }], kerning folded into adv of the previous glyph. */
function shape(str, fonts) {
  const run = []
  let prev = null
  for (const ch of Array.from(str)) {
    const font = fonts.find((f) => f.charToGlyphIndex(ch) > 0) ?? null
    if (!font) {
      run.push({ glyph: null, font: null, adv: /\s/.test(ch) ? 0.28 : 0.5, missing: !/\s/.test(ch) })
      prev = null
      continue
    }
    const glyph = font.charToGlyph(ch)
    if (prev && prev.font === font) {
      const kern = font.getKerningValue(prev.glyph, glyph) || 0
      prev.adv += kern / font.unitsPerEm
    }
    const item = { glyph, font, adv: (glyph.advanceWidth ?? font.unitsPerEm * 0.5) / font.unitsPerEm }
    run.push(item)
    prev = item
  }
  return run
}

const n = (v) => Math.round(v * 100) / 100

/** Path data for a string starting at pen (x, 0) on the baseline, at `size` px. */
function runPath(str, fonts, size, x0 = 0, y0 = 0) {
  let d = ''
  let x = x0
  let missing = 0
  for (const item of shape(str, fonts)) {
    if (item.glyph) d += item.glyph.getPath(x, y0, size).toPathData(2)
    else if (item.missing) missing += 1
    x += item.adv * size
  }
  return { d, missing }
}

const escXml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/** Nest a standalone SVG string at a box, keeping its own viewBox. */
function nest(svg, x, y, w, h) {
  const open = svg.match(/<svg\b[^>]*>/i)
  if (!open) return ''
  const vb = open[0].match(/viewBox="([^"]+)"/i)?.[1] ?? '0 0 512 512'
  return `<svg x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}" viewBox="${vb}">${svg.slice(open.index + open[0].length)}`
}

/**
 * Export one side as SVG. Returns { svg, outlined, missingGlyphs }.
 *   outlined: false when the font files could not be parsed (text is then live <text>).
 */
export async function exportShirtSvg(config, side, env) {
  const box = artBox(config.sides[side].placement)
  const parts = []
  const defs = []
  let outlined = true
  let missingGlyphs = 0
  let clipSeq = 0

  for (const layer of config.sides[side].layers) {
    if (layer.hidden) continue
    const cx = box.x + layer.x * box.w
    const cy = box.y + layer.y * box.h
    const rot = layer.rotate ? ` rotate(${n(layer.rotate)})` : ''

    if (layer.kind !== 'text') {
      const art = layerArt(layer, env)
      if (!art) continue
      const w = layer.w * box.w
      let inner = nest(await inlineSvgImages(art.svg), -w / 2, -w / 2, w, w)
      if (art.circle) {
        clipSeq += 1
        defs.push(`<clipPath id="shirt-clip-${clipSeq}"><circle r="${n(w / 2)}"/></clipPath>`)
        inner = `<g clip-path="url(#shirt-clip-${clipSeq})">${inner}</g>`
      }
      parts.push(`<g transform="translate(${n(cx)} ${n(cy)})${rot}">${inner}</g>`)
      continue
    }

    const text = resolveText(layer, config, env)
    if (!text.trim()) continue
    const font = effectiveFont(layer, text)
    let fonts = null
    try {
      fonts = await loadOutlineFonts(font)
    } catch {
      outlined = false
    }

    if (fonts) {
      const measure = (str) => shape(str, fonts).reduce((sum, g) => sum + g.adv, 0)
      const l = layoutText(text, { size: layer.size, tracking: layer.tracking, arc: layer.arc, measure, ...fitLimits(layer, box) })
      let d = ''
      const rotated = []
      for (const p of l.pieces) {
        if (!p.rot) {
          const r = runPath(p.text, fonts, layer.size, p.x + p.dx, p.y + (p.dy ?? 0))
          d += r.d
          missingGlyphs += r.missing
        } else {
          const r = runPath(p.text, fonts, layer.size, p.dx, p.dy ?? 0)
          missingGlyphs += r.missing
          if (r.d) rotated.push(`<path transform="translate(${n(p.x)} ${n(p.y)}) rotate(${n((p.rot * 180) / Math.PI)})" d="${r.d}"/>`)
        }
      }
      const sc = l.scale !== 1 ? ` scale(${Math.round(l.scale * 10000) / 10000})` : ''
      parts.push(
        `<g transform="translate(${n(cx)} ${n(cy)})${rot}${sc}" fill="${layer.color}">` +
        `${d ? `<path d="${d}"/>` : ''}${rotated.join('')}</g>`,
      )
    } else {
      // Live text fallback (needs the fonts installed where the file is opened).
      const size = layer.size
      parts.push(
        `<text transform="translate(${n(cx)} ${n(cy)})${rot}" text-anchor="middle" y="${n(size * 0.36)}" ` +
        `font-family="'${font.family}'" font-weight="${font.weight}" font-size="${size}" ` +
        `letter-spacing="${n((layer.tracking / 1000) * size)}" fill="${layer.color}">${escXml(text.replace(/\n/g, ' '))}</text>`,
      )
    }
  }

  const svg =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" ` +
    `viewBox="0 0 ${MASTER.w} ${MASTER.h}" width="15in" height="18in">` +
    `${defs.length ? `<defs>${defs.join('')}</defs>` : ''}${parts.join('')}</svg>\n`
  return { svg, outlined, missingGlyphs }
}
