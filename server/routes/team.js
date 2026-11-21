import { Router } from 'express'
import { badRequest, bodyObject } from '../http.js'

export function teamRoutes(db) {
  const r = Router()
  const read = () => {
    const rows = Object.fromEntries(db.prepare("SELECT key, value FROM meta WHERE key IN ('team_name','team_year')").all().map((x) => [x.key, x.value]))
    const year = Number.parseInt(rows.team_year, 10)
    return { name: rows.team_name ?? 'Our Team', year: Number.isInteger(year) ? year : new Date().getFullYear() }
  }
  const upsert = db.prepare('INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value')

  r.get('/', (_req, res) => res.json(read()))

  r.put('/', (req, res) => {
    const body = bodyObject(req)
    const cur = read()
    let name = cur.name
    let year = cur.year
    if (body.name !== undefined) {
      if (typeof body.name !== 'string') throw badRequest('name must be a string')
      name = body.name.trim()
      if (name.length < 1 || name.length > 60) throw badRequest('name must be 1-60 characters')
    }
    if (body.year !== undefined) {
      if (!Number.isInteger(body.year) || body.year < 1900 || body.year > 2100) throw badRequest('year must be an integer between 1900 and 2100')
      year = body.year
    }
    upsert.run('team_name', name)
    upsert.run('team_year', String(year))
    res.json({ name, year })
  })

  return r
}
