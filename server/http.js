// Small HTTP helpers shared by the route modules.
export class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
    this.expose = true
  }
}

export const badRequest = (msg) => new HttpError(400, msg)
export const notFound = (msg = 'not found') => new HttpError(404, msg)

/** Express 4 does not catch rejected promises; wrap async handlers. */
export const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next)

export function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
}

/** Request bodies must be JSON objects; express.json leaves {} when there is no body. */
export function bodyObject(req) {
  if (!isPlainObject(req.body)) throw badRequest('request body must be a JSON object')
  return req.body
}

/**
 * Validate an opaque JSON value (object) and return its serialized form.
 * `null` clears the value. Throws 400 when not an object or larger than maxBytes.
 */
export function serializeJsonObject(value, field, maxBytes) {
  if (value === null) return null
  if (!isPlainObject(value)) throw badRequest(`${field} must be a JSON object or null`)
  const s = JSON.stringify(value)
  if (Buffer.byteLength(s) > maxBytes) throw badRequest(`${field} is too large (max ${Math.round(maxBytes / 1000)} KB)`)
  return s
}

export function parseJson(s) {
  if (s == null || s === '') return null
  try {
    return JSON.parse(s)
  } catch {
    return null
  }
}

export const nowIso = () => new Date().toISOString()

export function errorHandler(err, req, res, _next) {
  if (res.headersSent) return
  let status = err.status ?? err.statusCode
  if (err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'request body too large' })
  }
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'invalid JSON body' })
  if (typeof status === 'number' && status >= 400 && status < 500) {
    return res.status(status).json({ error: err.expose ? err.message : 'bad request' })
  }
  console.error(`[server] ${req.method} ${req.path} failed:`, err?.message ?? err)
  res.status(500).json({ error: 'internal server error' })
}
