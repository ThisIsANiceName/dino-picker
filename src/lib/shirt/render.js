// The one shirt renderer. The on-screen preview, the print PNG, the mockup PNG and the
// thumbnails all go through drawSide(), so what you see is what gets exported.
import {
  ART, canvasToBlob, composeAvatarSvg, composeDinoFullSvg, kitSvg, mockupSvg, resolveAvatarConfig, svgToImage,
} from '../art/index.js'
import { MASTER, artBox, garmentById, resolveText } from './model.js'
import { canvasMeasure, effectiveFont, ensureFonts, fitLimits, fontCss, layoutText } from './text.js'

// ── Environment (who the tokens and the art resolve to) ─────────────────────────────────
/** env for one person: { person, dino, team, roster, avatarConfig } */
export function shirtEnv({ person = null, dino = null, team = null, roster = [] } = {}) {
  return { person, dino, team, roster, avatarConfig: resolveAvatarConfig(person, dino) }
}

// ── Assets ──────────────────────────────────────────────────────────────────────────────
const imageCache = new Map()

function loadSvg(svg) {
  let hit = imageCache.get(svg)
  if (!hit) {
    hit = svgToImage(svg)
    if (imageCache.size > 160) imageCache.delete(imageCache.keys().next().value)
    imageCache.set(svg, hit)
    hit.catch(() => imageCache.delete(svg))
  }
  return hit
}

/** Standalone SVG for an image layer, plus whether it is clipped to a circle. */
export function layerArt(layer, env) {
  if (layer.kind === 'avatar') {
    const cfg = env.avatarConfig
    return { svg: composeAvatarSvg(cfg, { size: 1024 }), circle: !cfg.frame }
  }
  if (layer.kind === 'dino') {
    return { svg: composeDinoFullSvg(env.avatarConfig, { gear: layer.gear !== false, flip: !!layer.flip, size: 1024 }), circle: false }
  }
  if (layer.kind === 'decor') {
    const item = ART.decorById[layer.decorId]
    return item ? { svg: kitSvg(item, layer.colors, { size: 512 }), circle: false } : null
  }
  return null
}

export function textSpecs(config, env, sides = ['front', 'back']) {
  const specs = []
  for (const side of sides) {
    for (const layer of config.sides[side].layers) {
      if (layer.kind !== 'text') continue
      const text = resolveText(layer, config, env)
      specs.push({ ...effectiveFont(layer, text), text })
    }
  }
  return specs
}

/**
 * Load everything drawSide needs: fonts (guaranteed before any text is measured or drawn)
 * and one decoded image per image layer. Returns Map(layerId -> { img, circle }).
 */
export async function prepareShirt(config, env, sides = ['front', 'back']) {
  const assets = new Map()
  const jobs = [ensureFonts(textSpecs(config, env, sides))]
  for (const side of sides) {
    for (const layer of config.sides[side].layers) {
      if (layer.kind === 'text') continue
      const art = layerArt(layer, env)
      if (!art) continue
      jobs.push(loadSvg(art.svg).then((img) => { assets.set(layer.id, { img, circle: art.circle }) }).catch(() => {}))
    }
  }
  await Promise.all(jobs)
  return assets
}

// ── Geometry ────────────────────────────────────────────────────────────────────────────
/** Text layout for a layer (pieces + final box), in master px around the layer centre. */
export function textLayout(layer, config, side, env) {
  const box = artBox(config.sides[side].placement)
  const text = resolveText(layer, config, env)
  const font = effectiveFont(layer, text)
  const layout = layoutText(text, {
    size: layer.size, tracking: layer.tracking, arc: layer.arc, measure: canvasMeasure(font), ...fitLimits(layer, box),
  })
  return { ...layout, font, text }
}

/** Unrotated box of a layer in master px: { cx, cy, w, h, rotate }. */
export function layerGeometry(layer, config, side, env) {
  const box = artBox(config.sides[side].placement)
  const cx = box.x + layer.x * box.w
  const cy = box.y + layer.y * box.h
  if (layer.kind === 'text') {
    const l = textLayout(layer, config, side, env)
    return { cx, cy, w: Math.max(l.w, layer.size * 0.5), h: Math.max(l.h, layer.size * 0.6), rotate: layer.rotate ?? 0, layout: l }
  }
  const w = layer.w * box.w
  return { cx, cy, w, h: w, rotate: layer.rotate ?? 0 }
}

// ── Drawing ─────────────────────────────────────────────────────────────────────────────
/**
 * Draw one side into a 2D context whose coordinate system is master px times `scale`.
 * Synchronous: call prepareShirt() first and pass its assets.
 */
export function drawSide(ctx, config, side, env, assets, { scale = 1, clear = true } = {}) {
  ctx.save()
  ctx.setTransform(scale, 0, 0, scale, 0, 0)
  if (clear) ctx.clearRect(0, 0, MASTER.w, MASTER.h)
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  for (const layer of config.sides[side].layers) {
    if (layer.hidden) continue
    const g = layerGeometry(layer, config, side, env)
    ctx.save()
    ctx.translate(g.cx, g.cy)
    if (g.rotate) ctx.rotate((g.rotate * Math.PI) / 180)
    if (layer.kind === 'text') {
      const l = g.layout
      if (l.text) {
        ctx.scale(l.scale, l.scale)
        ctx.font = fontCss(l.font, layer.size)
        ctx.fillStyle = layer.color
        ctx.textBaseline = 'alphabetic'
        ctx.textAlign = 'left'
        for (const p of l.pieces) {
          if (!p.rot) ctx.fillText(p.text, p.x + p.dx, p.y + (p.dy ?? 0))
          else {
            ctx.save()
            ctx.translate(p.x, p.y)
            ctx.rotate(p.rot)
            ctx.fillText(p.text, p.dx, p.dy ?? 0)
            ctx.restore()
          }
        }
      }
    } else {
      const asset = assets.get(layer.id)
      if (asset) {
        if (asset.circle) {
          ctx.beginPath()
          ctx.arc(0, 0, g.w / 2, 0, Math.PI * 2)
          ctx.clip()
        }
        ctx.drawImage(asset.img, -g.w / 2, -g.h / 2, g.w, g.h)
      }
    }
    ctx.restore()
  }
  ctx.restore()
}

/** Canvas of one side at `scale` (1 = the 4500x5400 master). */
export async function renderSideCanvas(config, side, env, { scale = 1, assets = null } = {}) {
  const a = assets ?? (await prepareShirt(config, env, [side]))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(MASTER.w * scale)
  canvas.height = Math.round(MASTER.h * scale)
  // Print canvases are read back in strips (thresholdAlpha): ask for a CPU canvas up front.
  drawSide(canvas.getContext('2d', { willReadFrequently: scale >= 1 }), config, side, env, a, { scale: canvas.width / MASTER.w })
  return canvas
}

// ── Print PNG ───────────────────────────────────────────────────────────────────────────
/** Force every pixel to fully opaque or fully clear (print shops underbase any alpha > 0). */
export function thresholdAlpha(canvas, cut = 128) {
  const ctx = canvas.getContext('2d')
  const { width, height } = canvas
  const strip = 256
  for (let y = 0; y < height; y += strip) {
    const h = Math.min(strip, height - y)
    const image = ctx.getImageData(0, y, width, h)
    const d = image.data
    let touched = false
    for (let i = 3; i < d.length; i += 4) {
      const a = d[i]
      if (a === 0 || a === 255) continue
      d[i] = a < cut ? 0 : 255
      touched = true
    }
    if (touched) ctx.putImageData(image, 0, y)
  }
}

let crcTable = null
function crc32(bytes) {
  if (!crcTable) {
    crcTable = new Uint32Array(256)
    for (let n = 0; n < 256; n++) {
      let c = n
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
      crcTable[n] = c >>> 0
    }
  }
  let crc = 0xffffffff
  for (let i = 0; i < bytes.length; i++) crc = crcTable[(crc ^ bytes[i]) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

/** Tag a PNG blob with its print resolution (pHYs chunk right after IHDR). */
export async function withDpi(blob, dpi = 300) {
  const src = new Uint8Array(await blob.arrayBuffer())
  if (src.length < 33 || src[12] !== 0x49 || src[13] !== 0x48) return blob // not IHDR-first: leave it
  const ppm = Math.round(dpi / 0.0254)
  const chunk = new Uint8Array(21)
  const view = new DataView(chunk.buffer)
  view.setUint32(0, 9)
  chunk.set([0x70, 0x48, 0x59, 0x73], 4) // "pHYs"
  view.setUint32(8, ppm)
  view.setUint32(12, ppm)
  chunk[16] = 1 // unit: metre
  view.setUint32(17, crc32(chunk.subarray(4, 17)))
  return new Blob([src.subarray(0, 33), chunk, src.subarray(33)], { type: 'image/png' })
}

/** Print file: transparent PNG, 4500x5400, hard alpha, tagged 300 DPI. */
export async function exportPrintPng(config, side, env) {
  const canvas = await renderSideCanvas(config, side, env, { scale: 1 })
  thresholdAlpha(canvas)
  const blob = await withDpi(await canvasToBlob(canvas, 'image/png'), 300)
  canvas.width = canvas.height = 1 // release ~100 MB promptly
  return blob
}

// ── Mockup ──────────────────────────────────────────────────────────────────────────────
export function mockupFor(config, side) {
  const garment = garmentById(config.garment.type)
  return mockupSvg(garment.mockups[side] ?? garment.mockups.front, config.garment.color)
}

/**
 * Garment mockup with the art composited into the manifest printArea.
 * Returns a canvas `size` px square (background: CSS colour, or null for transparent).
 */
export async function renderMockupCanvas(config, side, env, { size = 1600, background = '#E4E7D8', assets = null, focus = 0 } = {}) {
  const mock = mockupFor(config, side)
  const [, , vw, vh] = mock.viewBox
  const [mockImg, a] = await Promise.all([loadSvg(mock.svg), assets ?? prepareShirt(config, env, [side])])
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (background) {
    ctx.fillStyle = background
    ctx.fillRect(0, 0, size, size)
  }
  let k = Math.min(size / vw, size / vh) * 0.96
  let ox = (size - vw * k) / 2
  let oy = (size - vh * k) / 2
  if (focus) {
    // Thumbnails: crop to a square around the print area so the design is readable.
    const [fx, fy, fw, fh] = mock.printArea
    const win = Math.max(fw, fh) * focus
    k = size / win
    ox = size / 2 - (fx + fw / 2) * k
    oy = size / 2 - (fy + fh * 0.46) * k
  }
  ctx.drawImage(mockImg, ox, oy, vw * k, vh * k)
  // Art: render at the print-area resolution, then place it.
  const [px, py, pw] = mock.printArea
  const scale = (pw * k) / MASTER.w
  const art = document.createElement('canvas')
  art.width = Math.max(1, Math.round(MASTER.w * scale))
  art.height = Math.max(1, Math.round(MASTER.h * scale))
  drawSide(art.getContext('2d'), config, side, env, a, { scale: art.width / MASTER.w })
  ctx.drawImage(art, Math.round(ox + px * k), Math.round(oy + py * k))
  return canvas
}

export async function exportMockupPng(config, side, env, opts = {}) {
  return canvasToBlob(await renderMockupCanvas(config, side, env, { size: 1600, ...opts }), 'image/png')
}

const thumbCache = new Map()
/** Small mockup picture as an object URL (cached by content). */
export async function mockupThumb(config, side, env, size = 360, { focus = 0, background = null } = {}) {
  const key = `${size}|${focus}|${background}|${side}|${JSON.stringify(config)}|${env.person?.id ?? ''}|${env.person?.name ?? ''}|${JSON.stringify(env.avatarConfig)}|${env.team?.name}|${env.team?.year}|${env.roster?.length}`
  let hit = thumbCache.get(key)
  if (!hit) {
    hit = renderMockupCanvas(config, side, env, { size, background, focus })
      .then((c) => canvasToBlob(c, 'image/png'))
      .then((b) => URL.createObjectURL(b))
    if (thumbCache.size > 80) {
      const first = thumbCache.keys().next().value
      thumbCache.get(first).then((u) => URL.revokeObjectURL(u)).catch(() => {})
      thumbCache.delete(first)
    }
    thumbCache.set(key, hit)
    hit.catch(() => thumbCache.delete(key))
  }
  return hit
}
