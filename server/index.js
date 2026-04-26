import express from 'express'
import { DatabaseSync } from 'node:sqlite'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { mkdirSync } from 'fs'
import { DINO_FALLBACK } from '../src/data/dinoFallback.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = process.env.DATA_DIR ?? resolve(__dirname, '../data')
mkdirSync(DATA_DIR, { recursive: true })

const db = new DatabaseSync(resolve(DATA_DIR, 'persons.db'))
db.exec('PRAGMA journal_mode = WAL')

db.exec(`
  CREATE TABLE IF NOT EXISTS persons (
    id        TEXT PRIMARY KEY,
    name      TEXT NOT NULL,
    photo_url TEXT NOT NULL DEFAULT '',
    dino_name TEXT
  )
`)

db.exec(`
  CREATE TABLE IF NOT EXISTS dinos (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    diet        TEXT NOT NULL DEFAULT '',
    period      TEXT NOT NULL DEFAULT '',
    existed     TEXT NOT NULL DEFAULT '',
    region      TEXT NOT NULL DEFAULT '',
    type        TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    image       TEXT NOT NULL DEFAULT '',
    wikipedia_url TEXT,
    weight      TEXT,
    height      TEXT,
    length      TEXT,
    is_popular  INTEGER NOT NULL DEFAULT 0
  )
`)

const app = express()
app.use(express.json())

// ── Dino helpers ─────────────────────────────────────────────────────────────

function normalizeApiDino(raw) {
  const range = (raw.temporalRange ?? '').toLowerCase()
  let period = ''
  if (range.includes('cretaceous')) period = 'cretaceous'
  else if (range.includes('jurassic')) period = 'jurassic'
  else if (range.includes('triassic')) period = 'triassic'
  return {
    id:          String(raw.id),
    name:        (raw.name ?? '').toLowerCase(),
    diet:        (raw.diet ?? '').toLowerCase(),
    period,
    existed:     raw.temporalRange ?? '',
    region:      '',
    type:        (raw.locomotionType ?? '').toLowerCase(),
    description: raw.description ?? '',
    image:       raw.image?.imageURL ?? '',
    wikipediaUrl: raw.source?.wikipediaURL ?? null,
    weight: null, height: null, length: null,
    isPopular: false,
  }
}

function rowToDino(row) {
  return {
    _id:         row.id,
    name:        row.name,
    diet:        row.diet,
    period:      row.period,
    existed:     row.existed,
    region:      row.region,
    type:        row.type,
    description: row.description,
    image:       row.image,
    wikipediaUrl: row.wikipedia_url,
    weight:      row.weight,
    height:      row.height,
    length:      row.length,
    isPopular:   row.is_popular === 1,
  }
}

// ── Dino seeding ──────────────────────────────────────────────────────────────

let dinoSeedInProgress = false

const insertDino = db.prepare(`
  INSERT OR IGNORE INTO dinos
    (id, name, diet, period, existed, region, type, description, image, wikipedia_url, weight, height, length, is_popular)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`)

function runInsert(d) {
  insertDino.run(
    d.id, d.name, d.diet, d.period, d.existed, d.region, d.type,
    d.description, d.image, d.wikipediaUrl ?? null,
    d.weight ?? null, d.height ?? null, d.length ?? null,
    d.isPopular ? 1 : 0,
  )
}

async function seedDinos() {
  const { n } = db.prepare('SELECT COUNT(*) AS n FROM dinos').get()
  // Skip if we already have a full dataset (threshold guards against partial seeds)
  if (n >= 200) {
    console.log(`[dinos] cache ready — ${n} entries`)
    return
  }

  dinoSeedInProgress = true
  console.log('[dinos] seeding from RESTasaurus (first run — this takes ~1 min)…')

  const ORIGIN = 'https://restasaurus.onrender.com'
  let path = `${ORIGIN}/api/v1/dinosaurs`
  let apiCount = 0

  while (path) {
    try {
      const res = await fetch(path)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      const rows = Array.isArray(json) ? json : (json.data ?? [])
      for (const raw of rows) runInsert(normalizeApiDino(raw))
      apiCount += rows.length
      // nextPage is a relative path like "/api/v1/dinosaurs?page=2"
      path = json.nextPage ? `${ORIGIN}${json.nextPage}` : null
    } catch (err) {
      console.error('[dinos] seed fetch error:', err.message)
      break
    }
  }

  // Insert well-known fallback dinos not returned by the API.
  // Use empty image string — dead S3 URLs (403) are worse than a placeholder.
  const seededNames = new Set(
    db.prepare('SELECT name FROM dinos').all().map((r) => r.name)
  )
  let fallbackCount = 0
  for (const d of DINO_FALLBACK) {
    if (!seededNames.has(d.name)) {
      runInsert({ ...d, id: d._id, image: '', wikipediaUrl: d.wikipediaUrl ?? null })
      fallbackCount++
    }
  }

  const total = db.prepare('SELECT COUNT(*) AS n FROM dinos').get().n
  console.log(`[dinos] seeded — ${apiCount} API + ${fallbackCount} fallback = ${total} total`)
  dinoSeedInProgress = false
}

// Fire-and-forget — server accepts requests while seeding runs
seedDinos().catch(console.error)

// ── Dino API ──────────────────────────────────────────────────────────────────

app.get('/dinos', (_req, res) => {
  const rows = db.prepare('SELECT * FROM dinos ORDER BY name').all()
  res.set('X-Dinos-Seeding', dinoSeedInProgress ? '1' : '0')
  res.json(rows.map(rowToDino))
})

// ── Person CRUD ──────────────────────────────────────────────────────────────

app.get('/persons', (_req, res) => {
  res.json(
    db.prepare('SELECT id, name, photo_url AS photoUrl, dino_name AS dinoName FROM persons').all()
  )
})

app.post('/persons', (req, res) => {
  const { id, name, photoUrl = '', dinoName = null } = req.body
  db.prepare('INSERT INTO persons (id, name, photo_url, dino_name) VALUES (?, ?, ?, ?)').run(
    id, name, photoUrl, dinoName
  )
  res.status(201).json({ id, name, photoUrl, dinoName })
})

app.patch('/persons/:id', (req, res) => {
  const fieldMap = { name: 'name', photoUrl: 'photo_url', dinoName: 'dino_name' }
  const keys = Object.keys(req.body).filter((k) => fieldMap[k])
  if (!keys.length) return res.status(400).json({ error: 'nothing to update' })
  const sets = keys.map((k) => `${fieldMap[k]} = ?`).join(', ')
  const vals = keys.map((k) => req.body[k] ?? null)
  db.prepare(`UPDATE persons SET ${sets} WHERE id = ?`).run(...vals, req.params.id)
  res.json({ ok: true })
})

app.delete('/persons/:id', (req, res) => {
  db.prepare('DELETE FROM persons WHERE id = ?').run(req.params.id)
  res.json({ ok: true })
})

// ── Production: serve built frontend ─────────────────────────────────────────

if (process.env.NODE_ENV === 'production') {
  const DIST = resolve(__dirname, '../dist')
  app.use(express.static(DIST))
  app.get('*', (_req, res) => res.sendFile(resolve(DIST, 'index.html')))
}

const PORT = Number(process.env.PORT ?? 3001)
app.listen(PORT, () => console.log(`[server] listening on http://localhost:${PORT}`))
