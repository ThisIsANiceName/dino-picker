import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createApp } from '../app.js'

export function tmpDir() {
  return mkdtempSync(join(tmpdir(), 'dino-test-'))
}

export async function startServer(dataDir = tmpDir()) {
  const app = createApp({ dataDir, remoteSeed: false, serveStatic: false })
  const server = await new Promise((res) => { const s = app.listen(0, '127.0.0.1', () => res(s)) })
  const base = `http://127.0.0.1:${server.address().port}`
  const call = async (method, path, body, headers = {}) => {
    const isRaw = Buffer.isBuffer(body)
    const res = await fetch(base + path, {
      method,
      headers: { ...(body !== undefined && !isRaw ? { 'Content-Type': 'application/json' } : {}), ...headers },
      body: body === undefined ? undefined : isRaw ? body : JSON.stringify(body),
    })
    const text = await res.text()
    let json = null
    try { json = JSON.parse(text) } catch { /* not json */ }
    return { status: res.status, headers: res.headers, json, text }
  }
  const close = async () => {
    await new Promise((r) => server.close(r))
    app.locals.close()
    rmSync(dataDir, { recursive: true, force: true })
  }
  return { app, base, call, dataDir, close, db: app.locals.db }
}

export const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(64, 1)])
