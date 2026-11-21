import { Router } from 'express'
import { randomUUID } from 'node:crypto'
import { rowToDino, BODY_TYPES } from '../dinos.js'
import { badRequest, notFound, bodyObject } from '../http.js'

const TEXT_FIELDS = {
  diet: 'diet', period: 'period', existed: 'existed', region: 'region', type: 'type',
  description: 'description', image: 'image',
}
const NULLABLE_FIELDS = { wikipediaUrl: 'wikipedia_url', weight: 'weight', height: 'height', length: 'length' }

function str(v, field, max, { allowEmpty = true } = {}) {
  if (typeof v !== 'string') throw badRequest(`${field} must be a string`)
  const s = v.trim()
  if (!allowEmpty && !s) throw badRequest(`${field} cannot be empty`)
  if (s.length > max) throw badRequest(`${field} is too long (max ${max})`)
  return s
}

/** Validate the subset of fields present in body. Returns { column: value }. */
function validate(body) {
  const out = {}
  if (body.name !== undefined) out.name = str(body.name, 'name', 80, { allowEmpty: false }).toLowerCase()
  for (const [k, col] of Object.entries(TEXT_FIELDS)) {
    if (body[k] === undefined) continue
    out[col] = str(body[k], k, k === 'description' ? 5000 : k === 'image' ? 2048 : 200)
  }
  for (const [k, col] of Object.entries(NULLABLE_FIELDS)) {
    if (body[k] === undefined) continue
    out[col] = body[k] === null || body[k] === '' ? null : str(body[k], k, 2048)
  }
  if (out.image && !/^(https?:\/\/|\/|data:image\/)/i.test(out.image)) throw badRequest('image must be an http(s) URL or path')
  if (out.wikipedia_url && !/^https?:\/\//i.test(out.wikipedia_url)) throw badRequest('wikipediaUrl must be an http(s) URL')
  if (body.bodyType !== undefined) {
    if (body.bodyType !== null && !BODY_TYPES.includes(body.bodyType)) {
      throw badRequest(`bodyType must be one of: ${BODY_TYPES.join(', ')}`)
    }
    out.body_type = body.bodyType
  }
  if (body.isPopular !== undefined) out.is_popular = body.isPopular ? 1 : 0
  return out
}

export function dinoRoutes(db) {
  const r = Router()
  const get = db.prepare('SELECT * FROM dinos WHERE id = ?')

  r.get('/', (_req, res) => {
    res.set('X-Dinos-Seeding', '0')
    res.json(db.prepare('SELECT * FROM dinos ORDER BY name').all().map(rowToDino))
  })

  r.get('/:id', (req, res) => {
    const row = get.get(req.params.id)
    if (!row) throw notFound('dino not found')
    res.json(rowToDino(row))
  })

  r.post('/', (req, res) => {
    const body = bodyObject(req)
    if (body.name === undefined) throw badRequest('name is required')
    const v = validate(body)
    if (db.prepare('SELECT 1 FROM dinos WHERE name = ?').get(v.name)) {
      return res.status(409).json({ error: 'a dino with that name already exists' })
    }
    const id = `custom-${randomUUID()}`
    db.prepare(`
      INSERT INTO dinos (id, name, diet, period, existed, region, type, description, image, wikipedia_url,
        weight, height, length, is_popular, source, body_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'custom', ?)`).run(
      id, v.name, v.diet ?? '', v.period ?? '', v.existed ?? '', v.region ?? '', v.type ?? '',
      v.description ?? '', v.image ?? '', v.wikipedia_url ?? null, v.weight ?? null, v.height ?? null,
      v.length ?? null, v.body_type ?? null)
    res.status(201).json(rowToDino(get.get(id)))
  })

  r.patch('/:id', (req, res) => {
    const body = bodyObject(req)
    const row = get.get(req.params.id)
    if (!row) throw notFound('dino not found')
    let v = validate(body)
    if (!Object.keys(v).length) throw badRequest('nothing to update')
    if (row.source === 'catalog') {
      // Catalog rows are authoritative (rewritten on startup); only the image may be customised.
      v = 'image' in v ? { image: v.image } : {}
    } else {
      delete v.is_popular
      if (v.name && v.name !== row.name && db.prepare('SELECT 1 FROM dinos WHERE name = ? AND id <> ?').get(v.name, row.id)) {
        return res.status(409).json({ error: 'a dino with that name already exists' })
      }
    }
    const cols = Object.keys(v)
    if (cols.length) {
      db.prepare(`UPDATE dinos SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`).run(...cols.map((c) => v[c]), row.id)
    }
    res.json(rowToDino(get.get(row.id)))
  })

  return r
}
