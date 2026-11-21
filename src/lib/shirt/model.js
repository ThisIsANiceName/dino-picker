// Shirt design model: constants, placements, layer helpers, token resolution, validation.
// ShirtConfig shape: docs/ux-spec.md section 6. Positions are fractions of the side's art box;
// sizes are px at the 4500x5400 master.
import { ART, normHex } from '../art/index.js'

export const MASTER = Object.freeze({ w: 4500, h: 5400 })
export const SAFE_MARGIN = 150 // px inside the art box (0.5 in)
export const MIN_TEXT = 90 // px at master (about 22 pt)
export const MAX_TEXT = 2600

/** Art boxes in master px. Full prints are top-centred; chest prints sit below the collar. */
export const PLACEMENTS = Object.freeze({
  'full-front': { label: 'Full front', w: 3600, h: 4800, x: 450, y: 0, sides: ['front'] },
  'full-back': { label: 'Full back', w: 3600, h: 4800, x: 450, y: 0, sides: ['back'] },
  'center-chest': { label: 'Centre chest', w: 2400, h: 2400, x: 1050, y: 300, sides: ['front', 'back'] },
  'left-chest': { label: 'Left chest', w: 1200, h: 1200, x: 2850, y: 300, sides: ['front'] },
})

export function artBox(placement) {
  return PLACEMENTS[placement] ?? PLACEMENTS['full-front']
}

export const GARMENTS = Object.freeze([
  { id: 'tshirt', label: 'T-shirt', mockups: { front: 'tshirt-front', back: 'tshirt-back' } },
  { id: 'hoodie', label: 'Hoodie', mockups: { front: 'hoodie-front', back: 'hoodie-front' }, note: 'The hoodie preview shows the front for both sides.' },
  { id: 'tote', label: 'Tote bag', mockups: { front: 'tote-bag', back: 'tote-bag' } },
])
export const garmentById = (id) => GARMENTS.find((g) => g.id === id) ?? GARMENTS[0]

export const GARMENT_COLORS = Object.freeze([
  { hex: '#FFFFFF', name: 'White' },
  { hex: '#1E2420', name: 'Black' },
  { hex: '#1D2B4F', name: 'Navy' },
  { hex: '#B9BCB5', name: 'Heather grey' },
  { hex: '#24452F', name: 'Forest green' },
])

/** The five shirt font families and the weights that are actually loaded. */
export const FONTS = Object.freeze([
  { family: 'Caprasimo', label: 'Caprasimo', weights: [400], note: 'Fat, warm serif' },
  { family: 'Schibsted Grotesk', label: 'Schibsted Grotesk', weights: [600, 800], note: 'Clean sans' },
  { family: 'Graduate', label: 'Graduate', weights: [400], note: 'Varsity slab', latin1Only: true },
  { family: 'Fredoka', label: 'Fredoka', weights: [500, 700], note: 'Rounded, friendly' },
  { family: 'Big Shoulders Display', label: 'Big Shoulders', weights: [700, 900], note: 'Condensed poster' },
])
export const fontByFamily = (family) => FONTS.find((f) => f.family === family) ?? FONTS[0]
export const GRADUATE_FALLBACK = { family: 'Big Shoulders Display', weight: 700 }

export const TOKENS = Object.freeze([
  { token: '{name}', label: 'Name' },
  { token: '{dino}', label: 'Dino' },
  { token: '{team}', label: 'Team' },
  { token: '{tagline}', label: 'Tagline' },
  { token: '{year}', label: 'Year' },
  { token: '{number}', label: 'Number' },
  { token: '{roster}', label: 'Everyone' },
])

let seq = 0
export function layerId() {
  seq += 1
  return `l${Date.now().toString(36).slice(-4)}${seq.toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`
}

export function textLayer(props = {}) {
  return {
    id: layerId(), kind: 'text', text: '{name}', font: 'Caprasimo', weight: 400, size: 420, color: '#FFFFFF',
    tracking: 0, arc: 0, case: 'none', align: 'center', x: 0.5, y: 0.5, rotate: 0, ...props,
  }
}
export function avatarLayer(props = {}) {
  return { id: layerId(), kind: 'avatar', source: 'person', x: 0.5, y: 0.4, w: 0.6, rotate: 0, ...props }
}
export function dinoLayer(props = {}) {
  return { id: layerId(), kind: 'dino', gear: true, flip: false, x: 0.5, y: 0.4, w: 0.7, rotate: 0, ...props }
}
export function decorLayer(decorId, props = {}) {
  return { id: layerId(), kind: 'decor', decorId, colors: {}, x: 0.5, y: 0.5, w: 0.2, rotate: 0, ...props }
}

/**
 * Values the tokens resolve to for one person.
 * env = { person, dino, team: { name, year }, roster: [names], avatarConfig }
 */
export function tokenValues(config, env) {
  const person = env?.person
  return {
    name: person?.name ?? 'Your name',
    dino: env?.dino?.displayName ?? env?.dino?.name ?? 'Dino',
    team: env?.team?.name ?? 'Our herd',
    tagline: env?.dino?.personality?.tagline ?? '',
    year: String(env?.team?.year ?? new Date().getFullYear()),
    number: String(config?.numbers?.[person?.id] ?? ''),
    roster: (env?.roster ?? []).join('\n'),
  }
}

export function resolveText(layer, config, env) {
  const values = tokenValues(config, env)
  let text = String(layer.text ?? '').replace(/\{(name|dino|team|tagline|year|number|roster)\}/g, (_, k) => values[k])
  if (layer.case === 'upper') text = text.toLocaleUpperCase()
  return text
}

/** A short human label for the layer list. */
export function layerLabel(layer, config, env) {
  if (layer.kind === 'text') {
    const t = resolveText(layer, config, env).split('\n')[0].trim()
    if (!t) return layer.text?.includes('{number}') ? 'Number (empty)' : 'Empty text'
    return t.length > 22 ? `${t.slice(0, 21)}…` : t
  }
  if (layer.kind === 'avatar') return 'Avatar'
  if (layer.kind === 'dino') return 'Dino'
  return ART.decorById[layer.decorId]?.label ?? 'Decor'
}

const num = (v, d, min = -Infinity, max = Infinity) => (Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : d)
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v)

function normalizeLayer(raw) {
  if (!isObj(raw)) return null
  const base = { ...raw, id: typeof raw.id === 'string' && raw.id ? raw.id : layerId() }
  base.x = num(raw.x, 0.5, -0.5, 1.5)
  base.y = num(raw.y, 0.5, -0.5, 1.5)
  base.rotate = num(raw.rotate, 0, -180, 180)
  if (raw.kind === 'text') {
    const font = fontByFamily(raw.font)
    return {
      ...base,
      text: typeof raw.text === 'string' ? raw.text.slice(0, 400) : '',
      font: font.family,
      weight: font.weights.includes(raw.weight) ? raw.weight : font.weights[font.weights.length - 1],
      size: num(raw.size, 300, MIN_TEXT, MAX_TEXT),
      color: normHex(raw.color, '#FFFFFF'),
      tracking: num(raw.tracking, 0, -100, 400),
      arc: num(raw.arc, 0, -100, 100),
      case: raw.case === 'upper' ? 'upper' : 'none',
      align: 'center',
    }
  }
  if (raw.kind === 'avatar') return { ...base, source: 'person', w: num(raw.w, 0.6, 0.04, 1.6) }
  if (raw.kind === 'dino') return { ...base, gear: raw.gear !== false, flip: !!raw.flip, w: num(raw.w, 0.7, 0.04, 1.8) }
  if (raw.kind === 'decor' && ART.decorById[raw.decorId]) {
    const colors = {}
    if (isObj(raw.colors)) for (const [k, v] of Object.entries(raw.colors)) { const h = normHex(v); if (h) colors[k] = h }
    return { ...base, colors, w: num(raw.w, 0.2, 0.02, 1.6) }
  }
  return null
}

/** Bring any stored design config to a complete, valid v1 ShirtConfig. Unknown fields are kept. */
export function normalizeShirtConfig(raw) {
  const cfg = isObj(raw) ? { ...raw } : {}
  cfg.v = 1
  cfg.template = typeof cfg.template === 'string' ? cfg.template : 'blank'
  const g = isObj(cfg.garment) ? cfg.garment : {}
  cfg.garment = { ...g, type: garmentById(g.type).id, color: normHex(g.color, '#1E2420') }
  const sides = isObj(cfg.sides) ? cfg.sides : {}
  cfg.sides = { ...sides }
  for (const side of ['front', 'back']) {
    const s = isObj(sides[side]) ? sides[side] : {}
    const fallback = side === 'front' ? 'full-front' : 'full-back'
    const placement = PLACEMENTS[s.placement]?.sides.includes(side) ? s.placement : fallback
    cfg.sides[side] = { ...s, placement, layers: (Array.isArray(s.layers) ? s.layers : []).map(normalizeLayer).filter(Boolean) }
  }
  cfg.numbers = isObj(cfg.numbers) ? { ...cfg.numbers } : {}
  return cfg
}

export function isEmptyDesign(config) {
  return !config || (config.sides.front.layers.length === 0 && config.sides.back.layers.length === 0)
}

/** Stable two-digit number for a person (so "Name and number" has something to show). */
export function defaultNumber(personId) {
  let h = 7
  for (const ch of String(personId ?? '')) h = (h * 31 + ch.charCodeAt(0)) % 9973
  return String((h % 98) + 1).padStart(2, '0')
}
