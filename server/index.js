import express from 'express'
import { DatabaseSync } from 'node:sqlite'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { mkdirSync } from 'fs'

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

const app = express()
app.use(express.json())

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

// ── Production: proxy dino API + serve built frontend ────────────────────────

if (process.env.NODE_ENV === 'production') {
  const DIST = resolve(__dirname, '../dist')

  app.get('/api/*', async (req, res) => {
    try {
      const upstream = `https://restasaurus.onrender.com${req.path}`
      const r = await fetch(upstream)
      if (!r.ok) return res.status(r.status).end()
      res.json(await r.json())
    } catch {
      res.status(502).json({ error: 'dino API unavailable' })
    }
  })

  app.use(express.static(DIST))
  app.get('*', (_req, res) => res.sendFile(resolve(DIST, 'index.html')))
}

const PORT = Number(process.env.PORT ?? 3001)
app.listen(PORT, () => console.log(`[server] listening on http://localhost:${PORT}`))
