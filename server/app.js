import express from 'express'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { existsSync } from 'node:fs'
import { openDb } from './db.js'
import { syncCatalog, startRemoteSeed } from './dinos.js'
import { ensureUploadsDir } from './uploads.js'
import { errorHandler } from './http.js'
import { dinoRoutes } from './routes/dinos.js'
import { personRoutes } from './routes/persons.js'
import { designRoutes } from './routes/designs.js'
import { teamRoutes } from './routes/team.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
export const API_PREFIXES = ['/dinos', '/persons', '/designs', '/team', '/uploads', '/health']

/**
 * @param {{ dataDir?: string, remoteSeed?: boolean, serveStatic?: boolean }} opts
 * Returns an Express app; `app.locals.db` is the database, `app.locals.close()` stops background work and closes it.
 */
export function createApp({ dataDir = process.env.DATA_DIR ?? resolve(__dirname, '../data'), remoteSeed, serveStatic } = {}) {
  remoteSeed ??= (process.env.DINO_REMOTE_SEED ?? '').toLowerCase() !== 'off'
  serveStatic ??= process.env.NODE_ENV === 'production'

  const db = openDb(dataDir)
  syncCatalog(db)
  const uploadsDir = ensureUploadsDir(dataDir)

  const app = express()
  app.disable('x-powered-by')
  app.use(express.json({ limit: '1mb' }))

  app.get('/health', (_req, res) => {
    const dinos = db.prepare('SELECT COUNT(*) AS n FROM dinos').get().n
    res.json({ ok: true, dinos })
  })

  app.use('/uploads', express.static(uploadsDir, {
    index: false, dotfiles: 'deny', fallthrough: false, maxAge: '365d', immutable: true,
    setHeaders: (res) => res.set('X-Content-Type-Options', 'nosniff'),
  }))
  app.use('/dinos', dinoRoutes(db))
  app.use('/persons', personRoutes(db, uploadsDir))
  app.use('/designs', designRoutes(db))
  app.use('/team', teamRoutes(db))

  if (serveStatic) {
    const DIST = resolve(__dirname, '../dist')
    app.use(express.static(DIST))
    app.get('*', (req, res, next) => {
      const isApi = API_PREFIXES.some((p) => req.path === p || req.path.startsWith(`${p}/`))
      if (isApi || !existsSync(resolve(DIST, 'index.html'))) return next()
      res.sendFile(resolve(DIST, 'index.html'))
    })
  }

  app.use((_req, res) => res.status(404).json({ error: 'not found' }))
  app.use(errorHandler)

  let seed = null
  if (remoteSeed) seed = startRemoteSeed(db)
  let closed = false
  app.locals.db = db
  app.locals.remoteSeed = seed
  app.locals.close = () => {
    if (closed) return
    closed = true
    seed?.abort()
    try { db.close() } catch { /* ignore */ }
  }
  return app
}
