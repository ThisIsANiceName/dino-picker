import DINO_CATALOG_DATA from './dinos.js'
import BODY_TYPE_HINTS from './bodyTypeHints.js'

export const DINO_CATALOG = DINO_CATALOG_DATA

export const BODY_TYPES = Object.freeze([
  'tyrannosaur', 'raptor', 'sauropod', 'ceratopsian', 'stegosaur', 'ankylosaur',
  'hadrosaur', 'pachycephalosaur', 'spinosaur', 'ornithomimid', 'pterosaur', 'marine',
])

const norm = (s) => String(s ?? '').toLowerCase().replace(/[^a-z]/g, '')

const byKey = new Map()
for (const d of DINO_CATALOG) {
  byKey.set(norm(d.id), d.bodyType)
  byKey.set(norm(d.name), d.bodyType)
  if (d.commonName) byKey.set(norm(d.commonName), d.bodyType)
}

// Ordered: first matching rule wins. Matched against the normalised genus.
const SUFFIX_RULES = [
  [/(ceratops|ceratopsian)$/, 'ceratopsian'],
  [/(cephale|cephalosaurus|tholus)$/, 'pachycephalosaur'],
  [/(pelta|ankylosaurus)$/, 'ankylosaur'],
  [/stegosaurus$/, 'stegosaur'],
  [/(titan|titanosaurus|sauropod)$/, 'sauropod'],
  [/(mimus|mimid)$/, 'ornithomimid'],
  [/(nykus|onykus)$/, 'ornithomimid'],
  [/(raptor|pteryx)$/, 'raptor'],
  [/(dactylus|dactyl|dracon|draco|pterus|pteranodon)$/, 'pterosaur'],
  [/(nectes|ichthyosaurus|plesiosaurus|pliosaurus|mosasaurus|clidastes)$/, 'marine'],
  [/^(ichthyo|plesio|pliosaur|mosasaur)/, 'marine'],
  [/^ptero/, 'pterosaur'],
  [/(tyrannus|tyrannosaurus)$/, 'tyrannosaur'],
  [/spinosaurus$/, 'spinosaur'],
]

/**
 * Pick one of the 12 illustration body types for a genus name.
 * Lookup order: catalog (id / name / common name), curated hints, suffix heuristics, default.
 * Accepts "Tyrannosaurus", "tyrannosaurus rex", "T. rex", etc.
 */
export function bodyTypeFor(name) {
  const raw = String(name ?? '').trim().toLowerCase()
  if (!raw) return BODY_TYPE_HINTS.default
  const full = norm(raw)
  const genus = norm(raw.split(/\s+/)[0])
  for (const key of [full, genus]) {
    if (byKey.has(key)) return byKey.get(key)
    if (Object.hasOwn(BODY_TYPE_HINTS.genera, key)) return BODY_TYPE_HINTS.genera[key]
  }
  for (const [re, type] of SUFFIX_RULES) if (re.test(genus)) return type
  return BODY_TYPE_HINTS.default
}
