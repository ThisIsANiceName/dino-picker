import { Router } from 'express'
import { randomUUID } from 'node:crypto'
import { badRequest, notFound, bodyObject, parseJson, nowIso } from '../http.js'
import { isPlainObject } from '../http.js'

const CONFIG_LIMIT = 100 * 1024

export const rowToDesign = (r) => ({
  id: r.id,
  personId: r.person_id,
  name: r.name,
  kind: r.kind,
  config: parseJson(r.config_json) ?? {},
  createdAt: r.created_at,
  updatedAt: r.updated_at,
})

function validate(body, db) {
  const out = {}
  if (body.name !== undefined) {
    if (typeof body.name !== 'string') throw badRequest('name must be a string')
    const n = body.name.trim()
    if (n.length > 80) throw badRequest('name is too long (max 80)')
    out.name = n
  }
  if (body.kind !== undefined) {
    if (typeof body.kind !== 'string' || !/^[a-z][a-z0-9_-]{0,31}$/.test(body.kind)) throw badRequest('kind must be a short lowercase identifier')
    out.kind = body.kind
  }
  if (body.personId !== undefined) {
    if (body.personId === null) out.person_id = null
    else {
      if (typeof body.personId !== 'string') throw badRequest('personId must be a string or null')
      if (!db.prepare('SELECT 1 FROM persons WHERE id = ?').get(body.personId)) throw badRequest('personId does not exist')
      out.person_id = body.personId
    }
  }
  if (body.config !== undefined) {
    if (!isPlainObject(body.config)) throw badRequest('config must be a JSON object')
    const s = JSON.stringify(body.config)
    if (Buffer.byteLength(s) > CONFIG_LIMIT) throw badRequest('config is too large (max 100 KB)')
    out.config_json = s
  }
  return out
}

export function designRoutes(db) {
  const r = Router()
  const get = db.prepare('SELECT * FROM designs WHERE id = ?')
  const find = (id) => {
    const row = get.get(id)
    if (!row) throw notFound('design not found')
    return row
  }

  r.get('/', (req, res) => {
    const { personId } = req.query
    if (personId !== undefined && typeof personId !== 'string') throw badRequest('personId must be a string')
    const rows = personId
      ? db.prepare('SELECT * FROM designs WHERE person_id = ? ORDER BY created_at, rowid').all(personId)
      : db.prepare('SELECT * FROM designs ORDER BY created_at, rowid').all()
    res.json(rows.map(rowToDesign))
  })

  r.get('/:id', (req, res) => res.json(rowToDesign(find(req.params.id))))

  r.post('/', (req, res) => {
    const v = validate(bodyObject(req), db)
    if (v.config_json === undefined) throw badRequest('config is required')
    const id = randomUUID()
    const now = nowIso()
    db.prepare('INSERT INTO designs (id, person_id, name, kind, config_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .run(id, v.person_id ?? null, v.name ?? '', v.kind ?? 'shirt', v.config_json, now, now)
    res.status(201).json(rowToDesign(get.get(id)))
  })

  r.patch('/:id', (req, res) => {
    const row = find(req.params.id)
    const v = validate(bodyObject(req), db)
    if (!Object.keys(v).length) throw badRequest('nothing to update')
    v.updated_at = nowIso()
    const cols = Object.keys(v)
    db.prepare(`UPDATE designs SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`).run(...cols.map((c) => v[c]), row.id)
    res.json(rowToDesign(get.get(row.id)))
  })

  r.delete('/:id', (req, res) => {
    const row = find(req.params.id)
    db.prepare('DELETE FROM designs WHERE id = ?').run(row.id)
    res.json({ ok: true })
  })

  return r
}
