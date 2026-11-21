// Shared dino helpers: labels, formatting, filtering. Pure functions only.

export const BODY_TYPES = [
  { value: 'tyrannosaur', label: 'Tyrannosaur', plural: 'tyrannosaurs' },
  { value: 'raptor', label: 'Raptor', plural: 'raptors' },
  { value: 'spinosaur', label: 'Spinosaur', plural: 'spinosaurs' },
  { value: 'ornithomimid', label: 'Ostrich mimic', plural: 'ostrich mimics' },
  { value: 'sauropod', label: 'Long-neck', plural: 'long-necks' },
  { value: 'stegosaur', label: 'Stegosaur', plural: 'stegosaurs' },
  { value: 'ankylosaur', label: 'Armoured tank', plural: 'armoured tanks' },
  { value: 'ceratopsian', label: 'Horned face', plural: 'horned faces' },
  { value: 'hadrosaur', label: 'Duck-bill', plural: 'duck-bills' },
  { value: 'pachycephalosaur', label: 'Dome head', plural: 'dome heads' },
  { value: 'pterosaur', label: 'Pterosaur', plural: 'pterosaurs' },
  { value: 'marine', label: 'Sea reptile', plural: 'sea reptiles' },
]
const BODY_MAP = Object.fromEntries(BODY_TYPES.map((b) => [b.value, b]))
export const bodyTypeLabel = (v) => BODY_MAP[v]?.label ?? (v ? cap(v) : 'Unknown')
export const bodyTypePlural = (v, n) => (n === 1 ? bodyTypeLabel(v).toLowerCase() : BODY_MAP[v]?.plural ?? `${v}s`)

export const PERIODS = [
  { value: 'triassic', label: 'Triassic', from: 252, to: 201 },
  { value: 'jurassic', label: 'Jurassic', from: 201, to: 145 },
  { value: 'cretaceous', label: 'Cretaceous', from: 145, to: 66 },
]
export const ERA_START = 252
export const ERA_END = 66
export const DIETS = ['herbivore', 'carnivore', 'omnivore', 'piscivore', 'insectivore']

export const SIZES = [
  { value: 'small', label: 'Under 3 m', test: (m) => m < 3 },
  { value: 'medium', label: '3 to 9 m', test: (m) => m >= 3 && m < 9 },
  { value: 'large', label: '9 to 20 m', test: (m) => m >= 9 && m < 20 },
  { value: 'giant', label: '20 m and up', test: (m) => m >= 20 },
]

export function cap(s) {
  if (!s) return ''
  return s.charAt(0).toUpperCase() + s.slice(1)
}

export function dinoName(dino) {
  if (!dino) return ''
  return dino.displayName || dino.name.replace(/\b\w/g, (c) => c.toUpperCase())
}

/** Route param for a dino: its lowercase genus name (the link key). */
export const dinoLink = (dino) => `/dinopedia/${encodeURIComponent(dino.name)}`

/** Metres, parsed from lengthM or legacy "9m" / "12 m" strings. */
export function lengthOf(dino) {
  if (typeof dino?.lengthM === 'number') return dino.lengthM
  const m = String(dino?.length ?? '').match(/[\d.]+/)
  return m ? parseFloat(m[0]) : null
}

export function sizeOf(dino) {
  const m = lengthOf(dino)
  if (m == null || Number.isNaN(m)) return null
  return SIZES.find((s) => s.test(m))?.value ?? null
}

const nf = new Intl.NumberFormat('en-GB', { maximumFractionDigits: 1 })
export function fmtMetres(m) {
  return m == null ? null : `${nf.format(m)} m`
}
export function fmtWeight(kg) {
  if (kg == null) return null
  if (kg >= 1000) return `${nf.format(kg / 1000)} t`
  return `${nf.format(kg)} kg`
}
export function fmtMya(from, to) {
  if (from == null) return null
  return to != null && to !== from ? `${from} to ${to} million years ago` : `${from} million years ago`
}

export function regionsText(dino) {
  const list = dino?.regions?.length ? dino.regions : (dino?.region ? dino.region.split(/,\s*/) : [])
  return list.map((r) => r.replace(/\b\w/g, (c) => c.toUpperCase())).join(', ')
}

/** Lightweight fuzzy-ish search text. */
export function searchText(dino) {
  return [dino.name, dino.displayName, dino.commonName, dino.group, dino.meaning, dino.region, ...(dino.regions ?? []), dino.personality?.archetype]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()
}

export function norm(s) {
  return String(s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
}

/** Possessive with a sensible apostrophe: "Mira's", "Jonas'". */
export function possessive(name) {
  const first = String(name ?? '').trim().split(/\s+/)[0] || 'their'
  return /s$/i.test(first) ? `${first}'` : `${first}'s`
}
export const firstName = (name) => String(name ?? '').trim().split(/\s+/)[0] || ''
