import { DatabaseSync } from 'node:sqlite'
import { resolve } from 'node:path'
import { mkdirSync } from 'node:fs'

export const SCHEMA_VERSION = 2

function columns(db, table) {
  return new Set(db.prepare(`PRAGMA table_info(${table})`).all().map((c) => c.name))
}

function ensureColumn(db, table, name, ddl) {
  if (!columns(db, table).has(name)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${ddl}`)
}

/**
 * Idempotent migrations. Safe on: an empty DB, the legacy production DB
 * (tables `persons` + `dinos` without new columns) and an already-migrated DB.
 * Nothing is ever dropped.
 */
export function migrate(db) {
  db.exec('CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)')

  // v1: legacy base schema (identical to the original server)
  db.exec(`
    CREATE TABLE IF NOT EXISTS persons (
      id        TEXT PRIMARY KEY,
      name      TEXT NOT NULL,
      photo_url TEXT NOT NULL DEFAULT '',
      dino_name TEXT
    )`)
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
    )`)

  // v2: persons gain avatar/photo/note/quiz/timestamps; dinos gain source/body_type/data_json; designs
  const now = new Date().toISOString()
  ensureColumn(db, 'persons', 'avatar_json', 'TEXT')
  ensureColumn(db, 'persons', 'photo_path', 'TEXT')
  ensureColumn(db, 'persons', 'note', "TEXT NOT NULL DEFAULT ''")
  ensureColumn(db, 'persons', 'quiz_json', 'TEXT')
  ensureColumn(db, 'persons', 'created_at', 'TEXT')
  ensureColumn(db, 'persons', 'updated_at', 'TEXT')
  db.prepare('UPDATE persons SET created_at = ? WHERE created_at IS NULL').run(now)
  db.prepare('UPDATE persons SET updated_at = created_at WHERE updated_at IS NULL').run()

  ensureColumn(db, 'dinos', 'source', "TEXT NOT NULL DEFAULT 'api'")
  ensureColumn(db, 'dinos', 'body_type', 'TEXT')
  ensureColumn(db, 'dinos', 'data_json', 'TEXT')
  db.exec("UPDATE dinos SET source = 'custom' WHERE id LIKE 'custom-%' AND source = 'api'")

  db.exec(`
    CREATE TABLE IF NOT EXISTS designs (
      id          TEXT PRIMARY KEY,
      person_id   TEXT,
      name        TEXT NOT NULL DEFAULT '',
      kind        TEXT NOT NULL DEFAULT 'shirt',
      config_json TEXT NOT NULL DEFAULT '{}',
      created_at  TEXT NOT NULL,
      updated_at  TEXT NOT NULL
    )`)
  db.exec('CREATE INDEX IF NOT EXISTS idx_designs_person ON designs(person_id)')
  db.exec('CREATE INDEX IF NOT EXISTS idx_dinos_name ON dinos(name)')

  db.prepare("INSERT INTO meta (key, value) VALUES ('schema_version', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value")
    .run(String(SCHEMA_VERSION))
}

export function openDb(dataDir) {
  mkdirSync(dataDir, { recursive: true })
  const db = new DatabaseSync(resolve(dataDir, 'persons.db'))
  db.exec('PRAGMA journal_mode = WAL')
  db.exec('PRAGMA busy_timeout = 5000')
  migrate(db)
  return db
}

export function tx(db, fn) {
  db.exec('BEGIN')
  try {
    const r = fn()
    db.exec('COMMIT')
    return r
  } catch (e) {
    db.exec('ROLLBACK')
    throw e
  }
}
