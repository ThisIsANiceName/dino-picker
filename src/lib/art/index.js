// Dino art engine: recolouring, avatar composition and rasterising.
//
// Public contract (other workstreams import these; do not change signatures):
//   dinoSvg(bodyType, palette)                 -> standalone SVG string (full body, 512x512 viewBox)
//   defaultAvatarConfig(dino)                  -> AvatarConfig v1
//   resolveAvatarConfig(person, dino)          -> AvatarConfig v1 (saved one patched, or default)
//   composeAvatarSvg(config, { size = 512 })   -> standalone square SVG string
//   svgToImage(svg) / svgToPngBlob(svg, px) / downloadBlob(blob, filename)
//   ART                                        -> manifests and lists for UIs
//
// Art files use `var(--token, #fallback)` in fill/stroke attributes. We replace the whole
// `var(...)` with a concrete hex, so every string we return works outside the page
// (as <img>, on a canvas, as a downloaded file).
import dinoManifest from '../../assets/art/dinos/manifest.json'
import kitManifest from '../../assets/art/kit/kit-manifest.json'
import { ANCHOR_OVERRIDES, SLOT_FIT, ACCESSORY_FIT, EXTRA_SPOTS } from './placement.js'

// Some file-transfer and image tools append a <metadata> block (content credentials) to SVG files.
// It can carry an unbound namespace prefix, which makes the file invalid XML, so drop it on load.
const stripMeta = (files) => Object.fromEntries(Object.entries(files).map(([k, v]) => [k, String(v).replace(/<metadata[\s\S]*?<\/metadata>/g, '')]))
const dinoFiles = stripMeta(import.meta.glob('../../assets/art/dinos/*.svg', { query: '?raw', import: 'default', eager: true }))
const kitFiles = stripMeta(import.meta.glob('../../assets/art/kit/**/*.svg', { query: '?raw', import: 'default', eager: true }))

// ── Small colour helpers ────────────────────────────────────────────────────────────────
export function normHex(input, fallback = null) {
  if (typeof input !== 'string') return fallback
  let h = input.trim().replace(/^#/, '')
  if (/^[0-9a-f]{3}$/i.test(h)) h = h.split('').map((c) => c + c).join('')
  return /^[0-9a-f]{6}$/i.test(h) ? `#${h.toUpperCase()}` : fallback
}

const rgb = (hex) => {
  const n = parseInt(normHex(hex, '#000000').slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}
const toHex = (r, g, b) =>
  `#${[r, g, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('').toUpperCase()}`

/** Mix `a` towards `b` by t (0..1). */
export function mixHex(a, b, t) {
  const A = rgb(a)
  const B = rgb(b)
  return toHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t)
}

export function hexToHsl(hex) {
  let [r, g, b] = rgb(hex).map((v) => v / 255)
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2
  let h = 0
  let s = 0
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === r) h = ((g - b) / d + (g < b ? 6 : 0)) / 6
    else if (max === g) h = ((b - r) / d + 2) / 6
    else h = ((r - g) / d + 4) / 6
  }
  return [h * 360, s * 100, l * 100]
}

export function hslToHex(h, s, l) {
  h = (((h % 360) + 360) % 360) / 360
  s = Math.max(0, Math.min(100, s)) / 100
  l = Math.max(0, Math.min(100, l)) / 100
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s
  const p = 2 * l - q
  const f = (t) => {
    if (t < 0) t += 1
    if (t > 1) t -= 1
    if (t < 1 / 6) return p + (q - p) * 6 * t
    if (t < 1 / 2) return q
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
    return p
  }
  return toHex(f(h + 1 / 3) * 255, f(h) * 255, f(h - 1 / 3) * 255)
}

/** Spec: shade = body mixed 30% toward #0B2B28. */
export const deriveShade = (body) => mixHex(body, '#0B2B28', 0.3)

// ── SVG string plumbing ─────────────────────────────────────────────────────────────────
const VAR_RE = /var\(\s*(--[a-z0-9-]+)\s*,\s*([^)]+?)\s*\)/gi

/** Replace every `var(--token, fallback)` with tokens[token] or the fallback. */
export function recolor(svg, tokens = {}) {
  return svg.replace(VAR_RE, (_, name, fallback) => normHex(tokens[name]) ?? fallback)
}

/** Prefix all ids (and their references) so one file can be inlined many times. */
export function scopeIds(svg, prefix) {
  if (!prefix || !svg.includes('id="')) return svg
  return svg
    .replace(/\bid="([^"]+)"/g, (_, id) => `id="${prefix}${id}"`)
    .replace(/url\(#([^)]+)\)/g, (_, id) => `url(#${prefix}${id})`)
    .replace(/\b(xlink:href|href)="#([^"]+)"/g, (_, attr, id) => `${attr}="#${prefix}${id}"`)
}

function parse(raw) {
  const open = raw.match(/<svg\b[^>]*>/i)
  const vb = open?.[0].match(/viewBox="([^"]+)"/i)?.[1].trim().split(/[\s,]+/).map(Number) ?? [0, 0, 512, 512]
  const start = open ? open.index + open[0].length : 0
  const end = raw.lastIndexOf('</svg>')
  return { viewBox: vb, body: raw.slice(start, end === -1 ? undefined : end).trim() }
}

const byName = (files) => {
  const out = {}
  for (const [path, raw] of Object.entries(files)) {
    out[path.split('/art/')[1].replace(/^(dinos|kit)\//, '')] = parse(raw)
  }
  return out
}
const DINO_PARTS = byName(dinoFiles) // 'tyrannosaur.svg' -> { viewBox, body }
const KIT_PARTS = byName(kitFiles) // 'accessories/party-hat.svg' -> { viewBox, body }

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const r2 = (n) => Math.round(n * 100) / 100

function hash(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0).toString(36)
}

// ── Manifests ───────────────────────────────────────────────────────────────────────────
const SLOTS = ['hat', 'eyewear', 'neck', 'extra']
const SLOT_LABELS = { hat: 'Hat', eyewear: 'Eyewear', neck: 'Neck', extra: 'Extra' }

const upperDefaults = (item) => ({
  ...item,
  defaults: Object.fromEntries(Object.entries(item.defaults ?? {}).map(([k, v]) => [k, normHex(v, v)])),
})

const bodyTypes = Object.entries(dinoManifest).map(([id, m]) => ({
  id,
  ...m,
  ...(ANCHOR_OVERRIDES[id] ?? {}),
  anchors: { ...m.anchors, ...(ANCHOR_OVERRIDES[id]?.anchors ?? {}) },
}))
const accessoriesAll = kitManifest.accessories.map(upperDefaults)
const index = (list) => Object.fromEntries(list.map((x) => [x.id, x]))

export const ART = Object.freeze({
  slots: SLOTS,
  slotLabels: SLOT_LABELS,
  bodyTypes,
  bodyTypeById: index(bodyTypes),
  accessories: Object.fromEntries(SLOTS.map((s) => [s, accessoriesAll.filter((a) => a.slot === s)])),
  accessoryById: index(accessoriesAll),
  backgrounds: kitManifest.backgrounds.map(upperDefaults),
  backgroundById: index(kitManifest.backgrounds.map(upperDefaults)),
  frames: kitManifest.frames.map(upperDefaults),
  frameById: index(kitManifest.frames.map(upperDefaults)),
  decor: kitManifest.decor.map(upperDefaults),
  decorById: index(kitManifest.decor.map(upperDefaults)),
  mockups: kitManifest.mockups,
  mockupById: index(kitManifest.mockups),
  dinoManifest,
  kitManifest,
})

const FALLBACK_BODY = 'tyrannosaur'
const FALLBACK_PALETTE = { body: '#6FAE6B', belly: '#E9E2BF', accent: '#E07A3F' }
const bodyMeta = (bodyType) => ART.bodyTypeById[bodyType] ?? ART.bodyTypeById[FALLBACK_BODY]

function paletteTokens(palette = {}) {
  const body = normHex(palette.body, FALLBACK_PALETTE.body)
  return {
    '--dino-body': body,
    '--dino-belly': normHex(palette.belly, FALLBACK_PALETTE.belly),
    '--dino-accent': normHex(palette.accent, FALLBACK_PALETTE.accent),
    '--dino-shade': normHex(palette.shade) ?? deriveShade(body),
  }
}

// ── Public: full-body dino ──────────────────────────────────────────────────────────────
const dinoCache = new Map()

/** Recoloured inner markup of a dino (ids scoped), in the dino's 512 space. */
function dinoBody(bodyType, palette, scope) {
  const meta = bodyMeta(bodyType)
  return scopeIds(recolor(DINO_PARTS[meta.file].body, paletteTokens(palette)), scope)
}

/** Standalone recoloured SVG of the full-body illustration. palette = { body, belly, accent, shade? } */
export function dinoSvg(bodyType, palette) {
  const meta = bodyMeta(bodyType)
  const tokens = paletteTokens(palette)
  const key = `${meta.id}|${Object.values(tokens).join('|')}`
  let svg = dinoCache.get(key)
  if (!svg) {
    const scope = `d${hash(key)}-`
    svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">${dinoBody(meta.id, palette, scope)}</svg>`
    if (dinoCache.size > 400) dinoCache.clear()
    dinoCache.set(key, svg)
  }
  return svg
}

// ── Public: kit pieces (used by the studios) ────────────────────────────────────────────
function kitPart(file) {
  return KIT_PARTS[file] ?? { viewBox: [0, 0, 200, 200], body: '' }
}

/** Standalone SVG of any kit item ({ file, defaults }) with colour overrides. */
export function kitSvg(item, colors = {}, { size } = {}) {
  if (!item) return ''
  const part = kitPart(item.file)
  const [x, y, w, h] = part.viewBox
  const body = scopeIds(recolor(part.body, { ...item.defaults, ...colors }), `k${hash(item.file + JSON.stringify(colors))}-`)
  const dims = size ? ` width="${size}" height="${r2((size * h) / w)}"` : ` width="${w}" height="${h}"`
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}"${dims}>${body}</svg>`
}

/** Garment mockup tinted with the shirt colour. Returns { svg, viewBox, printArea }. */
export function mockupSvg(mockupId, shirtColor) {
  const item = ART.mockupById[mockupId] ?? ART.mockups[0]
  const part = kitPart(item.file)
  const [x, y, w, h] = part.viewBox
  const body = scopeIds(recolor(part.body, { '--shirt': shirtColor }), `m${hash(item.id + shirtColor)}-`)
  return {
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${w}" height="${h}">${body}</svg>`,
    viewBox: part.viewBox,
    printArea: item.printArea,
  }
}

// ── Avatar config ───────────────────────────────────────────────────────────────────────
export const HOUSE_PALETTES = [
  { name: 'Fern', body: '#56A44C', belly: '#FFEBC2', accent: '#D2335F' },
  { name: 'Lagoon', body: '#3A91BA', belly: '#EAF5FA', accent: '#F5AE36' },
  { name: 'Magma', body: '#E34E77', belly: '#FFEBC2', accent: '#743F12' },
  { name: 'Amber', body: '#F5AE36', belly: '#FFF7E6', accent: '#1F6B5C' },
  { name: 'Plum', body: '#7A6CBE', belly: '#DEDAF2', accent: '#F5AE36' },
  { name: 'Slate', body: '#5D6657', belly: '#E2E5D6', accent: '#E8951A' },
  { name: 'Jungle', body: '#1F6B5C', belly: '#C9E3DA', accent: '#F4A3BA' },
]

const DEFAULT_SCENES = ['sunburst', 'solid', 'polka', 'stripes-diagonal', 'retro-rings', 'topographic']

function seededInt(seed, mod) {
  return parseInt(hash(String(seed)), 36) % mod
}

/** Scene colours that sit behind a given body colour without fighting it. */
export function sceneColorsFor(backgroundId, palette) {
  const bg = ART.backgroundById[backgroundId] ?? ART.backgrounds[0]
  const accent = normHex(palette?.accent, FALLBACK_PALETTE.accent)
  const body = normHex(palette?.body, FALLBACK_PALETTE.body)
  let [h, s] = hexToHsl(accent)
  const [bh] = hexToHsl(body)
  // If the accent is close to the body hue, shift to the complement so the dino pops.
  if (Math.min(Math.abs(h - bh), 360 - Math.abs(h - bh)) < 40 || s < 12) h = bh + 180
  const sat = Math.max(45, Math.min(85, s))
  const base = hslToHex(h, sat, 86)
  const mid = hslToHex(h, sat, 76)
  const pale = hslToHex(h, sat, 94)
  const out = {}
  const keys = Object.keys(bg.defaults)
  if (keys[0]) out[keys[0]] = base
  if (keys[1]) out[keys[1]] = mid
  if (keys[2]) out[keys[2]] = pale
  return out
}

/** Avatar config (spec shape, v1) for a dino object. Works with dino = null (egg placeholder). */
export function defaultAvatarConfig(dino) {
  const palette = {
    body: normHex(dino?.palette?.body, FALLBACK_PALETTE.body),
    belly: normHex(dino?.palette?.belly, FALLBACK_PALETTE.belly),
    accent: normHex(dino?.palette?.accent, FALLBACK_PALETTE.accent),
  }
  const seed = dino?.name ?? 'egg'
  const sceneId = dino ? DEFAULT_SCENES[seededInt(seed, DEFAULT_SCENES.length)] : 'solid'
  return {
    v: 1,
    dinoId: dino?.name ?? null,
    bodyType: dino ? bodyMeta(dino.bodyType).id : null,
    colors: { ...palette, shade: null },
    accessories: { hat: null, eyewear: null, neck: null, extra: null },
    background: {
      id: sceneId,
      colors: dino ? sceneColorsFor(sceneId, palette) : { '--bg-1': '#E2E5D6' },
    },
    frame: null,
    photo: null,
    display: 'dino',
  }
}

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)

function cleanColors(colors, defaults) {
  const out = {}
  if (isObj(colors)) {
    for (const [k, v] of Object.entries(colors)) {
      const hex = normHex(v)
      if (hex && (!defaults || k in defaults)) out[k] = hex
    }
  }
  return out
}

function cleanPiece(piece, lookup) {
  if (!isObj(piece) || !lookup[piece.id]) return null
  return { ...piece, id: piece.id, colors: cleanColors(piece.colors, lookup[piece.id].defaults) }
}

/**
 * Bring any stored avatar object to a complete, valid v1 config. Unknown fields are kept.
 * `dino` (optional) wins for dinoId/bodyType so the avatar follows a dino change.
 */
export function normalizeAvatarConfig(raw, dino = null, photoUrl = undefined) {
  const base = defaultAvatarConfig(dino)
  if (!isObj(raw)) return base
  const cfg = { ...raw, v: 1 }
  cfg.dinoId = dino ? dino.name : (raw.dinoId ?? null)
  cfg.bodyType = dino ? base.bodyType : (ART.bodyTypeById[raw.bodyType] ? raw.bodyType : null)
  const followsDino = !dino || !raw.dinoId || raw.dinoId === dino.name
  const c = isObj(raw.colors) && followsDino ? raw.colors : {}
  cfg.colors = {
    ...(isObj(raw.colors) ? raw.colors : {}),
    body: normHex(c.body, base.colors.body),
    belly: normHex(c.belly, base.colors.belly),
    accent: normHex(c.accent, base.colors.accent),
    shade: followsDino ? normHex(c.shade) : null,
  }
  const acc = isObj(raw.accessories) ? raw.accessories : {}
  cfg.accessories = { ...acc }
  for (const slot of SLOTS) {
    const piece = cleanPiece(acc[slot], ART.accessoryById)
    cfg.accessories[slot] = piece && ART.accessoryById[piece.id].slot === slot ? piece : null
  }
  cfg.background = cleanPiece(raw.background, ART.backgroundById) ?? base.background
  cfg.frame = cleanPiece(raw.frame, ART.frameById)
  // Photo: follow the person's current upload when we know it.
  let photo = isObj(raw.photo) && typeof raw.photo.url === 'string' && raw.photo.url ? { ...raw.photo } : null
  if (photoUrl !== undefined) {
    if (!photoUrl) photo = null
    else if (photo && photo.url !== photoUrl) photo = { url: photoUrl, crop: { x: 0, y: 0, size: 1 } }
  }
  if (photo) {
    const cr = isObj(photo.crop) ? photo.crop : {}
    const num = (v, d) => (Number.isFinite(v) ? v : d)
    const size = Math.max(0.05, Math.min(1, num(cr.size, 1)))
    photo.crop = {
      x: Math.max(0, Math.min(1 - size, num(cr.x, 0))),
      y: Math.max(0, Math.min(1 - size, num(cr.y, 0))),
      size,
    }
  }
  cfg.photo = photo
  cfg.display = raw.display === 'photo' && photo ? 'photo' : 'dino'
  return cfg
}

/** person.avatar if valid (patched), else a default from the dino. Works when dino is null. */
export function resolveAvatarConfig(person, dino) {
  const photoUrl = person ? (person.photoUrl ?? '') : undefined
  if (isObj(person?.avatar)) return normalizeAvatarConfig(person.avatar, dino ?? null, photoUrl)
  const cfg = defaultAvatarConfig(dino ?? null)
  // Legacy people: a photo and no dino yet -> show the photo rather than an egg.
  if (!dino && photoUrl) {
    cfg.photo = { url: photoUrl, crop: { x: 0, y: 0, size: 1 } }
    cfg.display = 'photo'
  }
  return cfg
}

// ── Avatar composition ──────────────────────────────────────────────────────────────────
function pieceMarkup(file, tokens, scope) {
  return scopeIds(recolor(kitPart(file).body, tokens), scope)
}

/** transform placing a 200-unit accessory so its anchor lands on (x, y). */
function place(anchor, x, y, scale, angle = 0) {
  const rot = angle ? ` rotate(${r2(angle)})` : ''
  return `translate(${r2(x)} ${r2(y)})${rot} scale(${r2(scale)}) translate(${-anchor[0]} ${-anchor[1]})`
}

function fitOf(acc, meta) {
  const slot = SLOT_FIT[acc.slot] ?? {}
  const own = ACCESSORY_FIT[acc.id] ?? {}
  const per = own.byBody?.[meta.id] ?? {}
  const perBody = meta.fit?.[acc.slot] ?? {}
  return {
    scale: (slot.scale ?? 1) * (own.scale ?? 1) * (per.scale ?? 1) * (perBody.scale ?? 1),
    dx: (slot.dx ?? 0) + (own.dx ?? 0) + (per.dx ?? 0) + (perBody.dx ?? 0),
    dy: (slot.dy ?? 0) + (own.dy ?? 0) + (per.dy ?? 0) + (perBody.dy ?? 0),
    rotate: (own.rotate ?? 0) + (per.rotate ?? 0) + (perBody.rotate ?? 0),
    top: own.top ?? slot.top ?? 14,
  }
}

/** Geometry of an accessory on a body, in dino space: { x, y, scale, angle, topY }. */
function accessoryGeometry(acc, meta) {
  const fit = fitOf(acc, meta)
  const headW = 120 * (meta.headScale ?? 1)
  const scale = (headW / acc.width) * fit.scale
  const anchorKey = acc.slot === 'hat' ? 'headTop' : acc.slot === 'eyewear' ? 'eye' : 'neck'
  const [ax, ay] = meta.anchors[anchorKey]
  const angle = (acc.slot === 'neck' ? (meta.neckAngle ?? 0) : (meta.headAngle ?? 0)) + fit.rotate
  // dx/dy are in head-widths so one tweak holds across body sizes.
  const x = ax + fit.dx * headW
  const y = ay + fit.dy * headW
  const topY = y - (acc.anchor[1] - fit.top) * scale
  return { x, y, scale, angle, topY }
}

/** The square of dino space shown in the avatar, grown to make room for a hat. */
function avatarCropFor(meta, hat) {
  let [x, y, s] = meta.avatarCrop
  if (hat) {
    const g = accessoryGeometry(hat, meta)
    const top = g.topY - s * 0.04
    if (top < y) {
      const grow = y - top
      // Keep the chin line where it was and the head horizontally centred.
      x -= grow / 2
      y = top
      s += grow
    }
  }
  return [x, y, s]
}

const composeCache = new Map()

/**
 * Standalone square SVG for an avatar config: background, dino (cropped per manifest
 * avatarCrop) with accessories, frame on top. With display 'photo' the cropped photo
 * replaces the dino inside the same background/frame.
 * Options: size (px, default 512), background (false = transparent scene).
 */
export function composeAvatarSvg(config, { size = 512, background = true } = {}) {
  const key = `${size}|${background ? 1 : 0}|${JSON.stringify(config ?? null)}`
  const hit = composeCache.get(key)
  if (hit) return hit

  const cfg = isObj(config) && config.v === 1 && isObj(config.colors) && isObj(config.accessories)
    ? config
    : normalizeAvatarConfig(config)
  const scope = `a${hash(key)}-`
  const frame = cfg.frame ? ART.frameById[cfg.frame.id] : null
  const bg = cfg.background ? ART.backgroundById[cfg.background.id] : null
  const inset = frame?.inset ?? 0
  const box = 512 - inset * 2 // content square inside the frame
  const parts = []
  const defs = []

  if (background && bg) {
    parts.push(pieceMarkup(bg.file, { ...bg.defaults, ...cfg.background.colors }, `${scope}bg-`))
  }

  const usePhoto = cfg.display === 'photo' && cfg.photo?.url
  if (usePhoto) {
    const cr = cfg.photo.crop ?? { x: 0, y: 0, size: 1 }
    const full = box / cr.size
    parts.push(
      `<svg x="${inset}" y="${inset}" width="${box}" height="${box}" viewBox="0 0 ${box} ${box}" overflow="hidden">` +
      `<image href="${esc(cfg.photo.url)}" x="${r2(-cr.x * full)}" y="${r2(-cr.y * full)}" width="${r2(full)}" height="${r2(full)}" preserveAspectRatio="xMidYMid slice"/></svg>`,
    )
  } else if (cfg.bodyType && ART.bodyTypeById[cfg.bodyType]) {
    const meta = bodyMeta(cfg.bodyType)
    const worn = {}
    for (const slot of SLOTS) {
      const piece = cfg.accessories[slot]
      const acc = piece && ART.accessoryById[piece.id]
      if (acc) worn[slot] = { acc, colors: piece.colors }
    }
    const [cx, cy, cs] = avatarCropFor(meta, worn.hat?.acc)
    const k = box / cs
    const inner = [dinoBody(meta.id, cfg.colors, `${scope}d-`)]
    for (const slot of ['neck', 'eyewear', 'hat']) {
      const w = worn[slot]
      if (!w) continue
      const g = accessoryGeometry(w.acc, meta)
      inner.push(
        `<g transform="${place(w.acc.anchor, g.x, g.y, g.scale, g.angle)}"><g data-slot="${slot}">` +
        `${pieceMarkup(w.acc.file, { ...w.acc.defaults, ...w.colors }, `${scope}${slot}-`)}</g></g>`,
      )
    }
    parts.push(`<g transform="translate(${r2(inset - cx * k)} ${r2(inset - cy * k)}) scale(${r2(k * 1000) / 1000})">${inner.join('')}</g>`)
    if (worn.extra) {
      const spot = EXTRA_SPOTS[worn.extra.acc.id] ?? EXTRA_SPOTS.default
      const sc = (spot.w / worn.extra.acc.width) * (box / 512)
      parts.push(
        `<g transform="${place(worn.extra.acc.anchor, inset + spot.x * box, inset + spot.y * box, sc, spot.rotate ?? 0)}"><g data-slot="extra">` +
        `${pieceMarkup(worn.extra.acc.file, { ...worn.extra.acc.defaults, ...worn.extra.colors }, `${scope}extra-`)}</g></g>`,
      )
    }
  } else {
    // No dino yet: a calm egg.
    const egg = ART.decorById['egg-whole']
    const s = (box * 0.62) / 200
    parts.push(
      `<g transform="translate(${r2(256 - 100 * s)} ${r2(256 - 100 * s)}) scale(${r2(s)})">` +
      `${pieceMarkup(egg.file, { '--decor-1': '#FFF7E6', '--decor-2': '#F5AE36' }, `${scope}egg-`)}</g>`,
    )
  }

  let content = parts.join('')
  if (frame?.clipPath) {
    defs.push(`<clipPath id="${scope}clip"><path d="${frame.clipPath}"/></clipPath>`)
    content = `<g clip-path="url(#${scope}clip)">${content}</g>`
  }
  if (frame) content += pieceMarkup(frame.file, { ...frame.defaults, ...cfg.frame.colors }, `${scope}fr-`)

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0 0 512 512" width="${size}" height="${size}">` +
    `${defs.length ? `<defs>${defs.join('')}</defs>` : ''}${content}</svg>`
  if (composeCache.size > 600) composeCache.clear()
  composeCache.set(key, svg)
  return svg
}

/** Dino head (avatar crop, accessories, no scene/frame): used for shirt art and thumbnails. */
export function composeDinoBustSvg(config, { size = 512 } = {}) {
  return composeAvatarSvg({ ...normalizeAvatarConfig(config), frame: null, display: 'dino' }, { size, background: false })
}

/**
 * Full-body dino with the avatar's colours and (optionally) its hat, eyewear and neckwear.
 * No ground shadow (shirt art must not carry soft transparency). The viewBox grows to keep tall hats.
 * Returns a standalone square SVG string.
 */
export function composeDinoFullSvg(config, { gear = true, flip = false, size = 512 } = {}) {
  const cfg = normalizeAvatarConfig(config)
  const key = `full|${gear ? 1 : 0}|${flip ? 1 : 0}|${size}|${JSON.stringify(cfg.colors)}|${cfg.bodyType}|${gear ? JSON.stringify(cfg.accessories) : ''}`
  const hit = composeCache.get(key)
  if (hit) return hit
  const scope = `f${hash(key)}-`
  let svg
  if (!cfg.bodyType) {
    const egg = ART.decorById['egg-whole']
    svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="${size}" height="${size}">` +
      `${pieceMarkup(egg.file, { '--decor-1': '#FFF7E6', '--decor-2': '#F5AE36' }, scope)}</svg>`
  } else {
    const meta = bodyMeta(cfg.bodyType)
    const body = dinoBody(meta.id, cfg.colors, `${scope}d-`).replace(/<g id="[^"]*shadow">[\s\S]*?<\/g>/, '')
    const inner = [body]
    let top = 0
    if (gear) {
      for (const slot of ['neck', 'eyewear', 'hat']) {
        const piece = cfg.accessories[slot]
        const acc = piece && ART.accessoryById[piece.id]
        if (!acc) continue
        const g = accessoryGeometry(acc, meta)
        if (slot === 'hat') top = Math.min(top, g.topY - 6)
        inner.push(
          `<g transform="${place(acc.anchor, g.x, g.y, g.scale, g.angle)}">` +
          `${pieceMarkup(acc.file, { ...acc.defaults, ...piece.colors }, `${scope}${slot}-`)}</g>`,
        )
      }
    }
    const grow = Math.max(0, -top)
    const vb = `${r2(-grow / 2)} ${r2(-grow)} ${r2(512 + grow)} ${r2(512 + grow)}`
    const content = flip ? `<g transform="translate(512 0) scale(-1 1)">${inner.join('')}</g>` : inner.join('')
    svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="${size}" height="${size}">${content}</svg>`
  }
  if (composeCache.size > 600) composeCache.clear()
  composeCache.set(key, svg)
  return svg
}

/** Short spoken summary: "Stegosaurus, party hat, polka dots background, circle ring frame". */
export function describeAvatar(config, dinoName = '') {
  if (!isObj(config)) return 'Avatar'
  const bits = []
  if (config.display === 'photo' && config.photo) bits.push('Photo')
  else if (!config.bodyType) bits.push('An egg, no dino yet')
  else bits.push(dinoName || ART.bodyTypeById[config.bodyType]?.label || 'Dino')
  if (config.display !== 'photo') {
    for (const slot of SLOTS) {
      const a = config.accessories?.[slot] && ART.accessoryById[config.accessories[slot].id]
      if (a) bits.push(a.label.toLowerCase())
    }
  }
  const bg = config.background && ART.backgroundById[config.background.id]
  if (bg) bits.push(`${bg.label.toLowerCase()} background`)
  const fr = config.frame && ART.frameById[config.frame.id]
  if (fr) bits.push(`${fr.label.toLowerCase()} frame`)
  return bits.join(', ')
}

// ── Rasterising ─────────────────────────────────────────────────────────────────────────
const dataUrlCache = new Map()

async function toDataUrl(url) {
  if (url.startsWith('data:')) return url
  let hit = dataUrlCache.get(url)
  if (!hit) {
    hit = fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.blob()
      })
      .then((blob) => new Promise((resolve, reject) => {
        const fr = new FileReader()
        fr.onload = () => resolve(fr.result)
        fr.onerror = () => reject(fr.error)
        fr.readAsDataURL(blob)
      }))
    dataUrlCache.set(url, hit)
    hit.catch(() => dataUrlCache.delete(url))
  }
  return hit
}

/** An SVG used as an image cannot fetch anything: embed referenced bitmaps as data URLs. */
export async function inlineSvgImages(svg) {
  const re = /<image\b[^>]*?\bhref="([^"]+)"/g
  const urls = [...new Set([...svg.matchAll(re)].map((m) => m[1]).filter((u) => !u.startsWith('data:')))]
  if (!urls.length) return svg
  let out = svg
  for (const u of urls) {
    try {
      const data = await toDataUrl(u.replace(/&amp;/g, '&'))
      out = out.split(`href="${u}"`).join(`href="${data}"`)
    } catch {
      // Unreachable or cross-origin photo: leave it; the image just stays empty.
    }
  }
  return out
}

/** SVG string -> decoded HTMLImageElement (external bitmaps embedded first). */
export async function svgToImage(svgString) {
  const svg = await inlineSvgImages(svgString)
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }))
  try {
    const img = new Image()
    img.decoding = 'async'
    await new Promise((resolve, reject) => {
      img.onload = resolve
      img.onerror = () => reject(new Error('Could not render the artwork'))
      img.src = url
    })
    if (img.decode) await img.decode().catch(() => {})
    return img
  } finally {
    // Safe: the image is decoded; revoke on the next tick so Safari keeps the bitmap.
    setTimeout(() => URL.revokeObjectURL(url), 30_000)
  }
}

export function canvasToBlob(canvas, type = 'image/png', quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not encode the image'))), type, quality)
  })
}

/** SVG string -> PNG Blob. `px` is the output width; height follows the SVG's aspect ratio. */
export async function svgToPngBlob(svgString, px = 512) {
  const img = await svgToImage(svgString)
  const ratio = img.naturalWidth && img.naturalHeight ? img.naturalHeight / img.naturalWidth : 1
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(px)
  canvas.height = Math.round(px * ratio)
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  return canvasToBlob(canvas)
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.rel = 'noopener'
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

/** data: URI for an SVG string (for <img src>). */
export function svgDataUri(svg) {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`
}

/** "Mira Okafor" -> "mira-okafor" for file names. */
export function slugify(text, fallback = 'dino') {
  const s = String(text ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/ł/g, 'l').replace(/Ł/g, 'L').replace(/ø/g, 'o').replace(/ß/g, 'ss')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
  return s || fallback
}
