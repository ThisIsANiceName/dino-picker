import { DINO_CATALOG, BODY_TYPES, bodyTypeFor } from '../src/data/catalog/index.js'
import { tx, } from './db.js'
import { parseJson } from './http.js'

export { BODY_TYPES }

const CATALOG_BY_NAME = new Map(DINO_CATALOG.map((d) => [d.id, d]))

// ~10 tasteful fallback palettes for dinos without catalog colours.
export const PALETTES = [
  { body: '#6b8f5e', belly: '#e6dcb8', accent: '#c4622d' },
  { body: '#5f7f8c', belly: '#dfe6e0', accent: '#d9a441' },
  { body: '#8a6f4e', belly: '#ecdcb9', accent: '#b4472a' },
  { body: '#7a6a99', belly: '#e4dcec', accent: '#e0a458' },
  { body: '#a0674f', belly: '#f0dfc6', accent: '#4f7a6a' },
  { body: '#4f7a6a', belly: '#d9e3c9', accent: '#e07a3f' },
  { body: '#9a8f4a', belly: '#efe6c2', accent: '#5a6f8f' },
  { body: '#6a7f9a', belly: '#e3e8ee', accent: '#c9553d' },
  { body: '#8f5a6b', belly: '#f1dfd8', accent: '#5f8f7a' },
  { body: '#7d7d5a', belly: '#e8e2c8', accent: '#a5522f' },
]

function hash(str) {
  // FNV-1a 32-bit
  let h = 0x811c9dc5
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

export const paletteFor = (name) => ({ ...PALETTES[hash(String(name).toLowerCase()) % PALETTES.length] })

export function properCase(name) {
  return String(name).replace(/(^|[\s-])([a-z])/g, (_, sep, c) => sep + c.toUpperCase())
}

const fmt = (n, unit) => (n == null ? null : `${n}${unit}`)

function existedFrom(c) {
  if (c.myaFrom == null) return c.epoch ?? ''
  if (c.myaTo == null || c.myaTo === c.myaFrom) return `${c.myaFrom} million years ago`
  return `${c.myaFrom} - ${c.myaTo} million years ago`
}

function locomotionFor(bodyType) {
  if (bodyType === 'pterosaur') return 'aerial'
  if (bodyType === 'marine') return 'aquatic'
  if (bodyType === 'spinosaur') return 'semi-aquatic'
  return 'terrestrial'
}

const DEAD_IMAGE_HOST = 'brunosouzadev-dinoapi.s3'

/**
 * Upsert the bundled catalog. Catalog rows are authoritative: all fields are
 * rewritten on every start except `image` (may be user-edited). An existing row
 * with the same name (API/fallback/custom) is merged into rather than duplicated.
 */
export function syncCatalog(db) {
  const findByName = db.prepare('SELECT id, image, source FROM dinos WHERE name = ? ORDER BY (source = \'catalog\') DESC, rowid LIMIT 1')
  const update = db.prepare(`
    UPDATE dinos SET name = ?, diet = ?, period = ?, existed = ?, region = ?, type = ?, description = ?,
      wikipedia_url = ?, weight = ?, height = ?, length = ?, is_popular = ?,
      source = 'catalog', body_type = ?, data_json = ?, image = ?
    WHERE id = ?`)
  const insert = db.prepare(`
    INSERT INTO dinos (id, name, diet, period, existed, region, type, description, image, wikipedia_url,
      weight, height, length, is_popular, source, body_type, data_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'catalog', ?, ?)`)

  tx(db, () => {
    for (const c of DINO_CATALOG) {
      const name = c.id.toLowerCase()
      const bodyType = c.bodyType ?? bodyTypeFor(name)
      const vals = [
        c.diet ?? '', c.period ?? '', existedFrom(c), (c.regions ?? []).join(', '), locomotionFor(bodyType),
        c.description ?? '', c.wikipediaUrl ?? null,
        fmt(c.weightKg, 'kg'), fmt(c.heightM, 'm'), fmt(c.lengthM, 'm'), c.isPopular ? 1 : 0,
      ]
      const json = JSON.stringify(c)
      const ex = findByName.get(name)
      if (ex) {
        const image = ex.image && !ex.image.includes(DEAD_IMAGE_HOST) ? ex.image : ''
        update.run(name, ...vals, bodyType, json, image, ex.id)
      } else {
        insert.run(`catalog-${c.id}`, name, vals[0], vals[1], vals[2], vals[3], vals[4], vals[5], '', vals[6],
          vals[7], vals[8], vals[9], vals[10], bodyType, json)
      }
    }
  })
}

export function rowToDino(row) {
  const data = parseJson(row.data_json) ?? {}
  const catalog = row.source === 'catalog' ? data : null
  const bodyType = row.body_type || catalog?.bodyType || bodyTypeFor(row.name)
  const dino = {
    _id: row.id,
    name: row.name,
    displayName: catalog?.name ?? properCase(row.name),
    source: row.source,
    diet: row.diet,
    period: row.period,
    existed: row.existed,
    region: row.region,
    type: row.type,
    description: row.description,
    image: row.image,
    wikipediaUrl: row.wikipedia_url,
    weight: row.weight,
    height: row.height,
    length: row.length,
    isPopular: row.is_popular === 1,
    bodyType,
    palette: catalog?.palette ?? paletteFor(row.name),
  }
  if (catalog) {
    for (const k of ['commonName', 'pronunciation', 'meaning', 'group', 'epoch', 'myaFrom', 'myaTo', 'namedYear',
      'regions', 'lengthM', 'heightM', 'weightKg', 'speedKmh', 'funFact', 'traits', 'personality', 'isDinosaur']) {
      if (catalog[k] !== undefined) dino[k] = catalog[k]
    }
  }
  return dino
}

// ── Remote enrichment (RESTasaurus) ──────────────────────────────────────────

const ORIGIN = 'https://restasaurus.onrender.com'

function normalizeApiDino(raw) {
  const range = (raw.temporalRange ?? '').toLowerCase()
  let period = ''
  if (range.includes('cretaceous')) period = 'cretaceous'
  else if (range.includes('jurassic')) period = 'jurassic'
  else if (range.includes('triassic')) period = 'triassic'
  return {
    id: String(raw.id),
    name: String(raw.name ?? '').trim().toLowerCase(),
    diet: String(raw.diet ?? '').toLowerCase(),
    period,
    existed: raw.temporalRange ?? '',
    type: String(raw.locomotionType ?? '').toLowerCase(),
    description: raw.description ?? '',
    image: raw.image?.imageURL ?? '',
    wikipediaUrl: raw.source?.wikipediaURL ?? null,
  }
}

/**
 * Optional, non-blocking enrichment for non-catalog genera. Never deletes rows and never
 * touches catalog or custom rows. Any failure produces a single warning and ends the run.
 * Returns { done: Promise, abort() }.
 */
export function startRemoteSeed(db, { fetchImpl = globalThis.fetch, timeoutMs = 15_000 } = {}) {
  const ctrl = new AbortController()
  const findByName = db.prepare('SELECT id, source FROM dinos WHERE name = ? LIMIT 1')
  const idTaken = db.prepare('SELECT 1 FROM dinos WHERE id = ?')
  const insert = db.prepare(`
    INSERT INTO dinos (id, name, diet, period, existed, type, description, image, wikipedia_url, source)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'api')`)
  const update = db.prepare(`
    UPDATE dinos SET diet = ?, period = ?, existed = ?, type = ?, description = ?, image = ?, wikipedia_url = ?
    WHERE id = ? AND source = 'api'`)

  async function run() {
    const fetched = []
    let path = `${ORIGIN}/api/v1/dinosaurs`
    let retries = 0
    try {
      while (path && !ctrl.signal.aborted) {
        const res = await fetchImpl(path, { signal: AbortSignal.any([ctrl.signal, AbortSignal.timeout(timeoutMs)]) })
        if (res.status === 429 && retries++ < 3) {
          await new Promise((r) => setTimeout(r, 30_000).unref())
          continue
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const json = await res.json()
        for (const raw of Array.isArray(json) ? json : (json.data ?? [])) fetched.push(normalizeApiDino(raw))
        path = json.nextPage ? `${ORIGIN}${json.nextPage}` : null
      }
    } catch (err) {
      if (!ctrl.signal.aborted) {
        const why = err?.cause?.code ?? err?.message ?? String(err)
        console.warn(`[dinos] remote enrichment unavailable (${why}); using bundled catalog only`)
      }
    }
    if (ctrl.signal.aborted || !fetched.length) return 0
    let changed = 0
    tx(db, () => {
      for (const d of fetched) {
        if (!d.name || CATALOG_BY_NAME.has(d.name)) continue
        const ex = findByName.get(d.name)
        if (ex) {
          if (ex.source === 'api') { update.run(d.diet, d.period, d.existed, d.type, d.description, d.image, d.wikipediaUrl, ex.id); changed++ }
          continue
        }
        const id = idTaken.get(d.id) ? `api-${d.id}` : d.id
        insert.run(id, d.name, d.diet, d.period, d.existed, d.type, d.description, d.image, d.wikipediaUrl)
        changed++
      }
    })
    console.log(`[dinos] remote enrichment applied (${changed} non-catalog dinos)`)
    return changed
  }

  const done = run().catch((e) => { console.warn('[dinos] remote enrichment failed:', e?.message ?? e); return 0 })
  return { done, abort: () => ctrl.abort() }
}
