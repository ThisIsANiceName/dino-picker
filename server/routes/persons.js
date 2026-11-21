import { Router } from 'express'
import express from 'express'
import { randomUUID, randomBytes } from 'node:crypto'
import { writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { wrap, badRequest, notFound, HttpError, bodyObject, serializeJsonObject, parseJson, nowIso } from '../http.js'
import { PHOTO_TYPES, MAX_PHOTO_BYTES, magicMatches, removeUpload, safeIdPart } from '../uploads.js'

const SELECT = 'SELECT * FROM persons'
const JSON_LIMIT = 20 * 1024

export function rowToPerson(row) {
  return {
    id: row.id,
    name: row.name,
    photoUrl: row.photo_path ? `/uploads/${row.photo_path}` : row.photo_url,
    dinoName: row.dino_name,
    avatar: parseJson(row.avatar_json),
    note: row.note ?? '',
    quiz: parseJson(row.quiz_json),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

function validName(v) {
  if (typeof v !== 'string') throw badRequest('name must be a string')
  const s = v.trim()
  if (s.length < 1 || s.length > 60) throw badRequest('name must be 1-60 characters')
  return s
}

function validate(body) {
  const out = {}
  if (body.name !== undefined) out.name = validName(body.name)
  if (body.photoUrl !== undefined) {
    if (typeof body.photoUrl !== 'string') throw badRequest('photoUrl must be a string')
    const u = body.photoUrl.trim()
    if (u.length > 2048) throw badRequest('photoUrl is too long')
    if (u && !/^https?:\/\//i.test(u)) throw badRequest('photoUrl must be an http(s) URL')
    out.photo_url = u
  }
  if (body.dinoName !== undefined) {
    if (body.dinoName === null || body.dinoName === '') out.dino_name = null
    else {
      if (typeof body.dinoName !== 'string') throw badRequest('dinoName must be a string or null')
      const d = body.dinoName.trim().toLowerCase()
      if (d.length > 80) throw badRequest('dinoName is too long')
      out.dino_name = d || null
    }
  }
  if (body.avatar !== undefined) out.avatar_json = serializeJsonObject(body.avatar, 'avatar', JSON_LIMIT)
  if (body.quiz !== undefined) out.quiz_json = serializeJsonObject(body.quiz, 'quiz', JSON_LIMIT)
  if (body.note !== undefined) {
    if (body.note === null) out.note = ''
    else {
      if (typeof body.note !== 'string') throw badRequest('note must be a string')
      if (body.note.length > 500) throw badRequest('note is too long (max 500 characters)')
      out.note = body.note
    }
  }
  return out
}

export function personRoutes(db, uploadsDir) {
  const r = Router()
  const get = db.prepare(`${SELECT} WHERE id = ?`)
  const find = (id) => {
    const row = get.get(id)
    if (!row) throw notFound('person not found')
    return row
  }

  r.get('/', (_req, res) => {
    res.json(db.prepare(`${SELECT} ORDER BY created_at, rowid`).all().map(rowToPerson))
  })

  r.get('/:id', (req, res) => res.json(rowToPerson(find(req.params.id))))

  r.post('/', (req, res) => {
    const body = bodyObject(req)
    if (body.name === undefined) throw badRequest('name is required')
    const v = validate(body)
    let id = body.id ?? randomUUID()
    if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(id)) throw badRequest('id must be 1-64 chars of A-Z a-z 0-9 _ -')
    if (get.get(id)) return res.status(409).json({ error: 'a person with that id already exists' })
    const now = nowIso()
    db.prepare(`
      INSERT INTO persons (id, name, photo_url, dino_name, avatar_json, note, quiz_json, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      id, v.name, v.photo_url ?? '', v.dino_name ?? null, v.avatar_json ?? null, v.note ?? '', v.quiz_json ?? null, now, now)
    res.status(201).json(rowToPerson(get.get(id)))
  })

  r.patch('/:id', (req, res) => {
    const body = bodyObject(req)
    const row = find(req.params.id)
    const v = validate(body)
    const cols = Object.keys(v)
    if (!cols.length) throw badRequest('nothing to update')
    v.updated_at = nowIso()
    const all = Object.keys(v)
    db.prepare(`UPDATE persons SET ${all.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`).run(...all.map((c) => v[c]), row.id)
    res.json(rowToPerson(get.get(row.id)))
  })

  r.delete('/:id', wrap(async (req, res) => {
    const row = find(req.params.id)
    db.prepare('DELETE FROM designs WHERE person_id = ?').run(row.id)
    db.prepare('DELETE FROM persons WHERE id = ?').run(row.id)
    await removeUpload(uploadsDir, row.photo_path)
    res.json({ ok: true })
  }))

  // Client crops + re-encodes via canvas before upload, which strips EXIF metadata; the server
  // only verifies type/magic bytes/size and does not re-encode.
  const raw = express.raw({ type: (req) => Object.hasOwn(PHOTO_TYPES, String(req.headers['content-type'] ?? '').split(';')[0].trim().toLowerCase()), limit: MAX_PHOTO_BYTES })

  r.put('/:id/photo', raw, wrap(async (req, res) => {
    const row = find(req.params.id)
    const mime = String(req.headers['content-type'] ?? '').split(';')[0].trim().toLowerCase()
    if (!Object.hasOwn(PHOTO_TYPES, mime)) throw new HttpError(415, 'Content-Type must be image/png, image/jpeg or image/webp')
    const buf = req.body
    if (!Buffer.isBuffer(buf) || !buf.length) throw badRequest('empty body')
    if (!magicMatches(buf, mime)) throw badRequest('file content does not match the declared image type')
    const fileName = `${safeIdPart(row.id)}-${randomBytes(8).toString('hex')}.${PHOTO_TYPES[mime]}`
    await writeFile(resolve(uploadsDir, fileName), buf)
    db.prepare('UPDATE persons SET photo_path = ?, updated_at = ? WHERE id = ?').run(fileName, nowIso(), row.id)
    await removeUpload(uploadsDir, row.photo_path)
    res.json(rowToPerson(get.get(row.id)))
  }))

  r.delete('/:id/photo', wrap(async (req, res) => {
    const row = find(req.params.id)
    db.prepare('UPDATE persons SET photo_path = NULL, updated_at = ? WHERE id = ?').run(nowIso(), row.id)
    await removeUpload(uploadsDir, row.photo_path)
    res.json(rowToPerson(get.get(row.id)))
  }))

  return r
}
