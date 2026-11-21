// Dependency-free validator for the dinosaur catalog. Exit code 1 on any error.
// Usage: node scripts/validate-catalog.mjs
import { readFileSync } from 'node:fs'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'data', 'catalog')
const readJson = (f) => JSON.parse(readFileSync(join(dir, f), 'utf8'))

const BODY_TYPES = ['tyrannosaur', 'raptor', 'sauropod', 'ceratopsian', 'stegosaur', 'ankylosaur', 'hadrosaur', 'pachycephalosaur', 'spinosaur', 'ornithomimid', 'pterosaur', 'marine']
const NON_DINO_TYPES = ['pterosaur', 'marine']
const DIETS = ['carnivore', 'herbivore', 'omnivore', 'piscivore']
const PERIODS = { triassic: [252, 201], jurassic: [201, 145], cretaceous: [145, 66] }
const EPOCHS = {
  'Early Triassic': 'triassic', 'Middle Triassic': 'triassic', 'Late Triassic': 'triassic',
  'Early Jurassic': 'jurassic', 'Middle Jurassic': 'jurassic', 'Late Jurassic': 'jurassic',
  'Early Cretaceous': 'cretaceous', 'Late Cretaceous': 'cretaceous',
}
const REGIONS = ['north america', 'south america', 'europe', 'asia', 'africa', 'australia', 'antarctica']
const TRAIT_ENUMS = {
  diet: ['herbivore', 'carnivore', 'omnivore'], // same vocabulary as the quiz trait model (piscivore maps to carnivore)
  energy: ['high', 'low'],
  mobility: ['runner', 'flyer', 'swimmer', 'walker'],
  size: ['tiny', 'small', 'medium', 'large', 'colossal'],
  social: ['solo', 'pair', 'herd'],
  temperament: ['fierce', 'bold', 'calm', 'curious', 'gentle', 'stubborn'],
  defense: ['speed', 'armor', 'size', 'weapons', 'stealth', 'flight'],
  chronotype: ['dawn', 'day', 'dusk', 'night'],
}
const TOP_KEYS = ['id', 'name', 'commonName', 'pronunciation', 'meaning', 'group', 'bodyType', 'isDinosaur', 'diet', 'period', 'epoch', 'myaFrom', 'myaTo', 'regions', 'namedYear', 'lengthM', 'heightM', 'weightKg', 'speedKmh', 'description', 'funFact', 'isPopular', 'traits', 'personality', 'palette', 'wikipediaUrl']
const PERSONALITY_KEYS = ['archetype', 'tagline', 'strengths', 'quirk', 'teamRole']
const PALETTE_KEYS = ['body', 'belly', 'accent']
const MIN_PER_BODY_TYPE = 5
const MIN_CONTRAST = 1.8

const errors = []
const err = (where, msg) => errors.push(`${where}: ${msg}`)
const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v)
const isNum = (v) => typeof v === 'number' && Number.isFinite(v)
const isStr = (v) => typeof v === 'string' && v.trim().length > 0

function sameKeys(where, obj, expected) {
  for (const k of expected) if (!(k in obj)) err(where, `missing field "${k}"`)
  for (const k of Object.keys(obj)) if (!expected.includes(k)) err(where, `unexpected extra field "${k}"`)
}
function luminance(hex) {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}
const contrast = (a, b) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

const catalog = readJson('dinos.json')
const hints = readJson('bodyTypeHints.json')

if (!Array.isArray(catalog)) { err('dinos.json', 'must be an array'); finish() }
if (catalog.length < 110 || catalog.length > 130) err('dinos.json', `expected 110-130 entries, found ${catalog.length}`)

const seen = new Map()
const perType = Object.fromEntries(BODY_TYPES.map((t) => [t, 0]))
let popular = 0

catalog.forEach((d, i) => {
  const w = `dinos.json[${i}]${isObj(d) && d.id ? ` (${d.id})` : ''}`
  if (!isObj(d)) return err(w, 'entry must be an object')
  sameKeys(w, d, TOP_KEYS)

  if (!isStr(d.id) || !/^[a-z]+$/.test(d.id)) err(w, `id must be a lowercase a-z slug, got ${JSON.stringify(d.id)}`)
  else if (seen.has(d.id)) err(w, `duplicate id "${d.id}" (also at index ${seen.get(d.id)})`)
  else seen.set(d.id, i)
  if (!isStr(d.name) || !/^[A-Z][a-z]+$/.test(d.name)) err(w, `name must be a Proper-case genus, got ${JSON.stringify(d.name)}`)
  else if (d.id !== d.name.toLowerCase()) err(w, `id "${d.id}" does not match lowercase name "${d.name}"`)
  if (d.commonName !== null && !isStr(d.commonName)) err(w, 'commonName must be a string or null')
  for (const k of ['pronunciation', 'meaning', 'group', 'description', 'funFact', 'epoch']) if (!isStr(d[k])) err(w, `${k} must be a non-empty string`)
  if (isStr(d.group) && !d.group.includes(' · ')) err(w, 'group should look like "Clade · Family"')

  if (!BODY_TYPES.includes(d.bodyType)) err(w, `invalid bodyType ${JSON.stringify(d.bodyType)}`)
  else perType[d.bodyType]++
  if (typeof d.isDinosaur !== 'boolean') err(w, 'isDinosaur must be boolean')
  else if (BODY_TYPES.includes(d.bodyType) && d.isDinosaur === NON_DINO_TYPES.includes(d.bodyType)) err(w, `isDinosaur=${d.isDinosaur} is inconsistent with bodyType "${d.bodyType}" (pterosaur and marine must be false, all others true)`)
  if (!DIETS.includes(d.diet)) err(w, `invalid diet ${JSON.stringify(d.diet)}`)
  if (!(d.period in PERIODS)) err(w, `invalid period ${JSON.stringify(d.period)}`)
  if (!(d.epoch in EPOCHS)) err(w, `invalid epoch ${JSON.stringify(d.epoch)}`)
  else if (EPOCHS[d.epoch] !== d.period) err(w, `epoch "${d.epoch}" does not belong to period "${d.period}"`)

  if (!isNum(d.myaFrom) || !isNum(d.myaTo)) err(w, 'myaFrom and myaTo must be numbers')
  else {
    if (d.myaFrom < d.myaTo) err(w, `myaFrom (${d.myaFrom}) must be >= myaTo (${d.myaTo})`)
    const range = PERIODS[d.period]
    if (range && (d.myaFrom > range[0] || d.myaTo < range[1])) err(w, `${d.myaFrom}-${d.myaTo} Mya falls outside ${d.period} (${range[0]}-${range[1]} Mya)`)
  }
  if (!Array.isArray(d.regions) || d.regions.length === 0) err(w, 'regions must be a non-empty array')
  else {
    for (const r of d.regions) if (!REGIONS.includes(r)) err(w, `invalid region ${JSON.stringify(r)}`)
    if (new Set(d.regions).size !== d.regions.length) err(w, 'duplicate region')
  }
  if (!Number.isInteger(d.namedYear) || d.namedYear < 1800 || d.namedYear > 2026) err(w, `namedYear implausible: ${d.namedYear}`)
  for (const k of ['lengthM', 'weightKg']) if (!isNum(d[k]) || d[k] <= 0) err(w, `${k} must be a positive number`)
  if (d.heightM !== null && (!isNum(d.heightM) || d.heightM <= 0)) err(w, 'heightM must be a positive number or null')
  if (d.speedKmh !== null && (!isNum(d.speedKmh) || d.speedKmh <= 0)) err(w, 'speedKmh must be a positive number or null')
  if (typeof d.isPopular !== 'boolean') err(w, 'isPopular must be boolean')
  else if (d.isPopular) popular++

  if (!isObj(d.traits)) err(w, 'traits must be an object')
  else {
    sameKeys(`${w}.traits`, d.traits, Object.keys(TRAIT_ENUMS))
    for (const [k, allowed] of Object.entries(TRAIT_ENUMS)) if (k in d.traits && !allowed.includes(d.traits[k])) err(`${w}.traits`, `${k}=${JSON.stringify(d.traits[k])} not in [${allowed.join(', ')}]`)
    const expectDiet = d.diet === 'piscivore' ? 'carnivore' : d.diet
    if (d.traits.diet !== expectDiet) err(`${w}.traits`, `diet "${d.traits.diet}" should be "${expectDiet}" for top-level diet "${d.diet}"`)
  }
  if (!isObj(d.personality)) err(w, 'personality must be an object')
  else {
    const p = d.personality
    sameKeys(`${w}.personality`, p, PERSONALITY_KEYS)
    for (const k of ['archetype', 'tagline', 'quirk', 'teamRole']) if (!isStr(p[k])) err(`${w}.personality`, `${k} must be a non-empty string`)
    if (isStr(p.archetype) && (p.archetype.split(/\s+/).length < 2 || p.archetype.split(/\s+/).length > 6)) err(`${w}.personality`, `archetype "${p.archetype}" should be a short title (2-6 words)`)
    if (!Array.isArray(p.strengths) || p.strengths.length !== 3 || !p.strengths.every(isStr)) err(`${w}.personality`, 'strengths must be exactly three non-empty strings')
  }
  if (!isObj(d.palette)) err(w, 'palette must be an object')
  else {
    sameKeys(`${w}.palette`, d.palette, PALETTE_KEYS)
    for (const k of PALETTE_KEYS) if (!/^#[0-9a-fA-F]{6}$/.test(d.palette[k] ?? '')) err(`${w}.palette`, `${k} must be a #rrggbb hex colour, got ${JSON.stringify(d.palette[k])}`)
    if (PALETTE_KEYS.every((k) => /^#[0-9a-fA-F]{6}$/.test(d.palette[k] ?? ''))) {
      const c = contrast(d.palette.body, d.palette.belly)
      if (c < MIN_CONTRAST) err(`${w}.palette`, `body/belly contrast ${c.toFixed(2)} is below ${MIN_CONTRAST}`)
    }
  }
  if (!isStr(d.wikipediaUrl) || !/^https:\/\/en\.wikipedia\.org\/wiki\/[A-Za-z_()]+$/.test(d.wikipediaUrl)) err(w, `wikipediaUrl malformed: ${JSON.stringify(d.wikipediaUrl)}`)
})

for (const t of BODY_TYPES) if (perType[t] < MIN_PER_BODY_TYPE) err('coverage', `bodyType "${t}" has ${perType[t]} entries, need at least ${MIN_PER_BODY_TYPE}`)
for (const p of Object.keys(PERIODS)) if (!catalog.some((d) => d.period === p)) err('coverage', `no entries for period ${p}`)
for (const r of REGIONS) if (!catalog.some((d) => d.regions?.includes(r))) err('coverage', `no entries for region ${r}`)
if (popular < 25 || popular > 40) err('coverage', `isPopular count is ${popular}, expected roughly 30`)

// Hints
if (!isObj(hints) || !isObj(hints.genera)) err('bodyTypeHints.json', 'must be { genera: {...}, default: "..." }')
else {
  sameKeys('bodyTypeHints.json', hints, ['genera', 'default'])
  if (!BODY_TYPES.includes(hints.default)) err('bodyTypeHints.json', `invalid default ${JSON.stringify(hints.default)}`)
  for (const [g, t] of Object.entries(hints.genera)) {
    if (!/^[a-z]+$/.test(g)) err('bodyTypeHints.json', `genus key "${g}" must be lowercase a-z only`)
    if (!BODY_TYPES.includes(t)) err('bodyTypeHints.json', `genus "${g}" maps to invalid body type ${JSON.stringify(t)}`)
    if (seen.has(g)) err('bodyTypeHints.json', `genus "${g}" is already in the catalog; remove it from the hints`)
  }
}

// Generated JS modules must match JSON
for (const [name, json] of [['dinos', catalog], ['bodyTypeHints', hints]]) {
  try {
    const mod = await import(pathToFileURL(join(dir, `${name}.js`)).href)
    if (JSON.stringify(mod.default) !== JSON.stringify(json)) err(`${name}.js`, 'is out of date; run node scripts/build-catalog.mjs')
  } catch (e) {
    err(`${name}.js`, `cannot be imported (${e.code ?? e.message}); run node scripts/build-catalog.mjs`)
  }
}

finish()

function finish() {
  if (errors.length) {
    console.error(`Catalog validation FAILED with ${errors.length} problem(s):`)
    for (const e of errors) console.error(`  - ${e}`)
    process.exit(1)
  }
  console.log(`Catalog OK: ${catalog.length} dinos, ${Object.keys(hints.genera).length} hint genera, ${popular} popular.`)
  console.log('Per body type: ' + BODY_TYPES.map((t) => `${t}=${perType[t]}`).join(', '))
}
