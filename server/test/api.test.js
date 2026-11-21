import { test, describe, before, after } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { startServer, tmpDir, PNG } from './helpers.js'
import { rmSync, mkdirSync } from 'node:fs'

describe('catalog', () => {
  let s
  before(async () => { s = await startServer() })
  after(() => s.close())

  test('seeds >=121 dinos with rich fields', async () => {
    const r = await s.call('GET', '/dinos')
    assert.equal(r.status, 200)
    assert.ok(r.json.length >= 121)
    const t = r.json.find((d) => d.name === 'tyrannosaurus')
    assert.equal(t.bodyType, 'tyrannosaur')
    assert.ok(t.personality.archetype)
    assert.match(t.palette.body, /^#/)
    assert.equal(t.displayName, 'Tyrannosaurus')
    assert.equal(t.source, 'catalog')
    assert.equal(t.weight, '8400kg')
    assert.equal(t.length, '12.3m')
    assert.equal(t.existed, '68 - 66 million years ago')
    assert.equal(t.commonName, 'T. rex')
    for (const d of r.json) assert.ok(d.bodyType && d.palette?.accent && d.displayName && d._id)
  })

  test('restart is idempotent (no duplicates) and keeps edited catalog image', async () => {
    const t = (await s.call('GET', '/dinos')).json.find((d) => d.name === 'tyrannosaurus')
    const p = await s.call('PATCH', `/dinos/${t._id}`, { image: 'https://example.com/t.png', description: 'nope' })
    assert.equal(p.json.image, 'https://example.com/t.png')
    assert.notEqual(p.json.description, 'nope')
    const { createApp } = await import('../app.js')
    const app2 = createApp({ dataDir: s.dataDir, remoteSeed: false, serveStatic: false })
    const rows = app2.locals.db.prepare("SELECT image FROM dinos WHERE name='tyrannosaurus'").all()
    assert.equal(rows.length, 1)
    assert.equal(rows[0].image, 'https://example.com/t.png')
    app2.locals.close()
  })

  test('health, 404 json, bad json', async () => {
    assert.equal((await s.call('GET', '/health')).json.ok, true)
    const nf = await s.call('GET', '/nope')
    assert.equal(nf.status, 404)
    assert.ok(nf.json.error)
    const bad = await s.call('POST', '/persons', undefined, { 'Content-Type': 'application/json' })
    assert.equal(bad.status, 400)
    const res = await fetch(`${s.base}/persons`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{bad' })
    assert.equal(res.status, 400)
    assert.ok(!(await res.text()).includes(' at '))
  })
})

describe('legacy migration', () => {
  let dir, s
  before(async () => {
    dir = tmpDir()
    const db = new DatabaseSync(join(dir, 'persons.db'))
    db.exec(`CREATE TABLE persons (id TEXT PRIMARY KEY, name TEXT NOT NULL, photo_url TEXT NOT NULL DEFAULT '', dino_name TEXT)`)
    db.exec(`CREATE TABLE dinos (id TEXT PRIMARY KEY, name TEXT NOT NULL, diet TEXT NOT NULL DEFAULT '', period TEXT NOT NULL DEFAULT '',
      existed TEXT NOT NULL DEFAULT '', region TEXT NOT NULL DEFAULT '', type TEXT NOT NULL DEFAULT '', description TEXT NOT NULL DEFAULT '',
      image TEXT NOT NULL DEFAULT '', wikipedia_url TEXT, weight TEXT, height TEXT, length TEXT, is_popular INTEGER NOT NULL DEFAULT 0)`)
    db.prepare("INSERT INTO persons VALUES ('p-old','Old Pal','https://x.test/a.png','tyrannosaurus')").run()
    db.prepare("INSERT INTO dinos (id,name,diet,description,image) VALUES ('77','tyrannosaurus','carnivore','api text','https://img.test/trex.png')").run()
    db.prepare("INSERT INTO dinos (id,name,diet,description,image) VALUES ('88','zzzosaurus','herbivore','api only','')").run()
    db.prepare("INSERT INTO dinos (id,name,description) VALUES ('custom-123','mydino','mine')").run()
    db.close()
    s = await startServer(dir)
  })
  after(() => s.close())

  test('data survives, new columns work', async () => {
    const list = (await s.call('GET', '/persons')).json
    assert.equal(list.length, 1)
    assert.deepEqual([list[0].id, list[0].name, list[0].photoUrl, list[0].dinoName], ['p-old', 'Old Pal', 'https://x.test/a.png', 'tyrannosaurus'])
    assert.equal(list[0].note, '')
    assert.equal(list[0].avatar, null)
    assert.ok(list[0].createdAt)
    const r = await s.call('PATCH', '/persons/p-old', { avatar: { hat: 1 }, note: 'hi', quiz: { a: 1 } })
    assert.deepEqual(r.json.avatar, { hat: 1 })
    assert.equal((await s.call('GET', '/persons/p-old')).json.note, 'hi')
  })

  test('old dino rows merged / preserved, schema_version set', async () => {
    const dinos = (await s.call('GET', '/dinos')).json
    const trex = dinos.filter((d) => d.name === 'tyrannosaurus')
    assert.equal(trex.length, 1)
    assert.equal(trex[0]._id, '77')
    assert.equal(trex[0].source, 'catalog')
    assert.equal(trex[0].image, 'https://img.test/trex.png')
    assert.ok(trex[0].personality)
    const z = dinos.find((d) => d.name === 'zzzosaurus')
    assert.equal(z.source, 'api')
    assert.ok(z.bodyType && z.palette.body && z.displayName === 'Zzzosaurus')
    assert.equal(dinos.find((d) => d._id === 'custom-123').source, 'custom')
    assert.equal(s.db.prepare("SELECT value FROM meta WHERE key='schema_version'").get().value, '2')
  })
})

describe('persons', () => {
  let s
  before(async () => { s = await startServer() })
  after(() => s.close())

  test('CRUD + validation', async () => {
    const c = await s.call('POST', '/persons', { name: '  Ann  ', dinoName: 'Stegosaurus' })
    assert.equal(c.status, 201)
    const p = c.json
    assert.equal(p.name, 'Ann')
    assert.equal(p.dinoName, 'stegosaurus')
    assert.equal(p.photoUrl, '')
    assert.ok(p.id && p.createdAt && p.updatedAt)
    assert.equal((await s.call('POST', '/persons', { id: p.id, name: 'dup' })).status, 409)
    for (const body of [{}, { name: '' }, { name: '   ' }, { name: 'x'.repeat(61) }, { name: 5 }, { name: 'a', photoUrl: 'javascript:1' }, { name: 'a', note: 'n'.repeat(501) }, [1]]) {
      const r = await s.call('POST', '/persons', body)
      assert.equal(r.status, 400, JSON.stringify(body))
      assert.ok(r.json.error)
    }
    const u = await s.call('PATCH', `/persons/${p.id}`, { name: 'Anna', dinoName: null, photoUrl: 'https://a.test/x.png' })
    assert.equal(u.json.name, 'Anna')
    assert.equal(u.json.dinoName, null)
    assert.equal(u.json.photoUrl, 'https://a.test/x.png')
    assert.equal((await s.call('PATCH', `/persons/${p.id}`, {})).status, 400)
    assert.equal((await s.call('PATCH', `/persons/${p.id}`, { name: '' })).status, 400)
    assert.equal((await s.call('PATCH', '/persons/nope', { name: 'x' })).status, 404)
    assert.equal((await s.call('DELETE', '/persons/nope')).status, 404)
    assert.equal((await s.call('DELETE', `/persons/${p.id}`)).status, 200)
    assert.equal((await s.call('GET', `/persons/${p.id}`)).status, 404)
  })

  test('avatar / note / quiz round trip and limits', async () => {
    const { json: p } = await s.call('POST', '/persons', { name: 'Bo' })
    const avatar = { skin: '#fa0', parts: [1, 2, { x: 'y' }] }
    const quiz = { result: 'raptor', answers: [1, 2, 3] }
    await s.call('PATCH', `/persons/${p.id}`, { avatar, note: 'likes snacks', quiz })
    const got = (await s.call('GET', '/persons')).json.find((x) => x.id === p.id)
    assert.deepEqual(got.avatar, avatar)
    assert.deepEqual(got.quiz, quiz)
    assert.equal(got.note, 'likes snacks')
    assert.equal((await s.call('PATCH', `/persons/${p.id}`, { avatar: 'str' })).status, 400)
    assert.equal((await s.call('PATCH', `/persons/${p.id}`, { avatar: [1] })).status, 400)
    assert.equal((await s.call('PATCH', `/persons/${p.id}`, { avatar: { big: 'x'.repeat(21000) } })).status, 400)
    assert.equal((await s.call('PATCH', `/persons/${p.id}`, { quiz: { big: 'x'.repeat(21000) } })).status, 400)
    const cleared = await s.call('PATCH', `/persons/${p.id}`, { avatar: null })
    assert.equal(cleared.json.avatar, null)
  })
})

describe('photo upload', () => {
  let s, p
  before(async () => { s = await startServer(); p = (await s.call('POST', '/persons', { name: 'Pic', photoUrl: 'https://legacy.test/a.png' })).json })
  after(() => s.close())
  const up = (id, buf, type) => s.call('PUT', `/persons/${id}/photo`, buf, { 'Content-Type': type })

  test('happy path, replace, serve, delete', async () => {
    const r = await up(p.id, PNG, 'image/png')
    assert.equal(r.status, 200)
    assert.match(r.json.photoUrl, new RegExp(`^/uploads/${p.id}-[0-9a-f]{16}\\.png$`))
    const files1 = readdirSync(join(s.dataDir, 'uploads'))
    assert.equal(files1.length, 1)
    const served = await fetch(s.base + r.json.photoUrl)
    assert.equal(served.status, 200)
    assert.equal(served.headers.get('x-content-type-options'), 'nosniff')
    assert.match(served.headers.get('cache-control'), /max-age=31536000/)
    const r2 = await up(p.id, Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.alloc(20)]), 'image/jpeg')
    assert.equal(r2.status, 200)
    const files2 = readdirSync(join(s.dataDir, 'uploads'))
    assert.equal(files2.length, 1)
    assert.match(files2[0], /\.jpg$/)
    const d = await s.call('DELETE', `/persons/${p.id}/photo`)
    assert.equal(d.json.photoUrl, 'https://legacy.test/a.png')
    assert.equal(readdirSync(join(s.dataDir, 'uploads')).length, 0)
  })

  test('webp accepted; wrong magic, wrong type, empty rejected', async () => {
    const webp = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP'), Buffer.alloc(8)])
    assert.equal((await up(p.id, webp, 'image/webp')).status, 200)
    assert.equal((await up(p.id, Buffer.from('<svg/>'.repeat(5)), 'image/png')).status, 400)
    assert.equal((await up(p.id, PNG, 'image/jpeg')).status, 400)
    assert.equal((await up(p.id, PNG, 'image/gif')).status, 415)
    assert.equal((await up(p.id, PNG, 'text/plain')).status, 415)
    assert.equal((await up(p.id, Buffer.alloc(0), 'image/png')).status, 400)
    assert.equal(readdirSync(join(s.dataDir, 'uploads')).length, 1)
  })

  test('oversize rejected with 413', async () => {
    const big = Buffer.concat([PNG, Buffer.alloc(5 * 1024 * 1024)])
    assert.equal((await up(p.id, big, 'image/png')).status, 413)
  })

  test('unknown person and traversal attempts', async () => {
    assert.equal((await up('nope', PNG, 'image/png')).status, 404)
    assert.equal((await up('..%2F..%2Fevil', PNG, 'image/png')).status, 404)
    assert.equal((await fetch(`${s.base}/uploads/..%2fpersons.db`)).status >= 400, true)
    assert.equal((await fetch(`${s.base}/uploads/%2e%2e/persons.db`)).status >= 400, true)
    const raw = await fetch(`${s.base}/uploads/../persons.db`)
    assert.ok(raw.status >= 400 || !(await raw.text()).startsWith('SQLite'))
    assert.equal((await fetch(`${s.base}/uploads/missing.png`)).status, 404)
    assert.equal(existsSyncSafe(join(s.dataDir, '..', 'evil.png')), false)
  })

  test('person delete removes the photo file', async () => {
    const q = (await s.call('POST', '/persons', { name: 'Gone' })).json
    await up(q.id, PNG, 'image/png')
    const before = readdirSync(join(s.dataDir, 'uploads')).filter((f) => f.startsWith(q.id))
    assert.equal(before.length, 1)
    await s.call('DELETE', `/persons/${q.id}`)
    assert.equal(readdirSync(join(s.dataDir, 'uploads')).filter((f) => f.startsWith(q.id)).length, 0)
  })
})
function existsSyncSafe(p) { return existsSync(p) }

describe('designs', () => {
  let s
  before(async () => { s = await startServer() })
  after(() => s.close())

  test('CRUD, filter, validation, cascade', async () => {
    const a = (await s.call('POST', '/persons', { name: 'A' })).json
    const b = (await s.call('POST', '/persons', { name: 'B' })).json
    const d1 = await s.call('POST', '/designs', { personId: a.id, name: 'Rex tee', config: { color: 'red', layers: [1] } })
    assert.equal(d1.status, 201)
    assert.equal(d1.json.kind, 'shirt')
    assert.deepEqual(d1.json.config, { color: 'red', layers: [1] })
    await s.call('POST', '/designs', { personId: a.id, config: {} })
    await s.call('POST', '/designs', { personId: b.id, config: {} })
    await s.call('POST', '/designs', { config: { loose: true } })
    assert.equal((await s.call('GET', `/designs?personId=${a.id}`)).json.length, 2)
    assert.equal((await s.call('GET', '/designs')).json.length, 4)
    assert.equal((await s.call('GET', `/designs/${d1.json.id}`)).json.name, 'Rex tee')
    const u = await s.call('PATCH', `/designs/${d1.json.id}`, { name: 'Renamed', config: { color: 'blue' } })
    assert.equal(u.json.name, 'Renamed')
    assert.deepEqual(u.json.config, { color: 'blue' })
    assert.equal((await s.call('POST', '/designs', { name: 'x' })).status, 400)
    assert.equal((await s.call('POST', '/designs', { config: 'nope' })).status, 400)
    assert.equal((await s.call('POST', '/designs', { config: {}, personId: 'ghost' })).status, 400)
    assert.equal((await s.call('POST', '/designs', { config: { big: 'x'.repeat(101 * 1024) } })).status, 400)
    assert.equal((await s.call('PATCH', '/designs/nope', { name: 'x' })).status, 404)
    assert.equal((await s.call('GET', '/designs/nope')).status, 404)
    await s.call('DELETE', `/persons/${a.id}`)
    assert.equal((await s.call('GET', `/designs?personId=${a.id}`)).json.length, 0)
    assert.equal((await s.call('GET', '/designs')).json.length, 2)
    const del = await s.call('DELETE', `/designs/${(await s.call('GET', '/designs')).json[0].id}`)
    assert.equal(del.status, 200)
    assert.equal((await s.call('DELETE', '/designs/nope')).status, 404)
  })
})

describe('custom dinos', () => {
  let s
  before(async () => { s = await startServer() })
  after(() => s.close())

  test('create, patch, validation', async () => {
    const c = await s.call('POST', '/dinos', { name: ' Fluffosaurus ', diet: 'omnivore', bodyType: 'raptor', weight: '5kg' })
    assert.equal(c.status, 201)
    assert.equal(c.json.name, 'fluffosaurus')
    assert.equal(c.json.source, 'custom')
    assert.equal(c.json.bodyType, 'raptor')
    assert.equal(c.json.displayName, 'Fluffosaurus')
    assert.ok(c.json.palette.body)
    const p = await s.call('PATCH', `/dinos/${c.json._id}`, { description: 'fluffy', bodyType: 'sauropod' })
    assert.equal(p.json.description, 'fluffy')
    assert.equal(p.json.bodyType, 'sauropod')
    const noBt = (await s.call('POST', '/dinos', { name: 'Mystery' })).json
    assert.ok(noBt.bodyType)
    assert.equal((await s.call('POST', '/dinos', { name: 'fluffosaurus' })).status, 409)
    assert.equal((await s.call('POST', '/dinos', { name: 'tyrannosaurus' })).status, 409)
    assert.equal((await s.call('POST', '/dinos', {})).status, 400)
    assert.equal((await s.call('POST', '/dinos', { name: 'x', bodyType: 'blob' })).status, 400)
    assert.equal((await s.call('PATCH', `/dinos/${c.json._id}`, {})).status, 400)
    assert.equal((await s.call('PATCH', `/dinos/${c.json._id}`, { name: ' ' })).status, 400)
    assert.equal((await s.call('PATCH', '/dinos/nope', { name: 'x' })).status, 404)
  })
})

describe('team', () => {
  let s
  before(async () => { s = await startServer() })
  after(() => s.close())

  test('defaults, update, validation, persistence', async () => {
    const g = await s.call('GET', '/team')
    assert.deepEqual(g.json, { name: 'Our Team', year: new Date().getFullYear() })
    const u = await s.call('PUT', '/team', { name: ' Raptors ', year: 2027 })
    assert.deepEqual(u.json, { name: 'Raptors', year: 2027 })
    assert.deepEqual((await s.call('GET', '/team')).json, { name: 'Raptors', year: 2027 })
    for (const b of [{ name: '' }, { name: 'x'.repeat(61) }, { year: 1899 }, { year: 2101 }, { year: 20.5 }, { year: '2020' }]) {
      assert.equal((await s.call('PUT', '/team', b)).status, 400, JSON.stringify(b))
    }
  })
})
