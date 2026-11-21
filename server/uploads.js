import { resolve, sep, basename } from 'node:path'
import { mkdirSync } from "node:fs"
import { unlink as unlinkP } from 'node:fs/promises'

export const MAX_PHOTO_BYTES = 5 * 1024 * 1024

export const PHOTO_TYPES = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
}

/** True when the leading bytes match the declared image type. */
export function magicMatches(buf, mime) {
  if (!Buffer.isBuffer(buf)) return false
  if (mime === 'image/png') {
    return buf.length > 8 && buf.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  }
  if (mime === 'image/jpeg') return buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff
  if (mime === 'image/webp') {
    return buf.length > 12 && buf.toString('latin1', 0, 4) === 'RIFF' && buf.toString('latin1', 8, 12) === 'WEBP'
  }
  return false
}

export function ensureUploadsDir(dataDir) {
  const dir = resolve(dataDir, 'uploads')
  mkdirSync(dir, { recursive: true })
  return dir
}

/** Resolve a stored file name inside the uploads dir; null if it would escape it. */
export function safeUploadPath(uploadsDir, fileName) {
  if (!fileName || typeof fileName !== 'string') return null
  const name = basename(fileName)
  if (name !== fileName || name.startsWith('.')) return null
  const full = resolve(uploadsDir, name)
  return full.startsWith(uploadsDir + sep) ? full : null
}

export async function removeUpload(uploadsDir, fileName) {
  const p = safeUploadPath(uploadsDir, fileName)
  if (!p) return
  try { await unlinkP(p) } catch { /* already gone */ }
}

export const safeIdPart = (id) => String(id).replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 64)
