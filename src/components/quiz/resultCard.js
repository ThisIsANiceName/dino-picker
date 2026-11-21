// Shareable result card: 1080 x 1350 PNG drawn with Canvas 2D.
import { dinoSvg, svgToImage, canvasToBlob, mixHex } from '../../lib/art/index.js'
import { dinoLabel } from '../../lib/quiz/index.js'

const W = 1080
const H = 1350
const C = {
  jungle: '#0F3934', jungleDeep: '#071D1B', jungleDot: '#1B5B50', paper: '#E4E7D8', ink: '#1E2420',
  inkMuted: '#4A524B', resin: '#F5AE36', magma: '#D2335F', white: '#FFFFFF',
}
const DISPLAY = '"Caprasimo", "Schibsted Grotesk", Georgia, serif'
const BODY = '"Schibsted Grotesk", system-ui, sans-serif'

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.roundRect ? ctx.roundRect(x, y, w, h, r) : (ctx.rect(x, y, w, h))
}

function wrap(ctx, text, maxWidth) {
  const words = String(text).split(/\s+/)
  const lines = []
  let line = ''
  for (const w of words) {
    const test = line ? `${line} ${w}` : w
    if (ctx.measureText(test).width > maxWidth && line) { lines.push(line); line = w } else line = test
  }
  if (line) lines.push(line)
  return lines
}

/** Wrap, then narrow the measure while the line count holds so the last line is not an orphan. */
function wrapBalanced(ctx, text, maxWidth) {
  const base = wrap(ctx, text, maxWidth)
  if (base.length < 2) return base
  let lo = maxWidth * 0.5, hi = maxWidth
  for (let i = 0; i < 12; i++) {
    const mid = (lo + hi) / 2
    if (wrap(ctx, text, mid).length <= base.length) hi = mid; else lo = mid
  }
  return wrap(ctx, text, hi + 1)
}

/** Largest Caprasimo size (<= max) at which `text` fits on one line. */
function fitDisplay(ctx, text, maxWidth, max, min = 56) {
  for (let s = max; s >= min; s -= 2) {
    ctx.font = `400 ${s}px ${DISPLAY}`
    if (ctx.measureText(text).width <= maxWidth) return s
  }
  return min
}

/**
 * @param dino  catalog dino ({ name, bodyType, palette, personality })
 * @param opts  { personName?: string, teamName?: string }
 * @returns Promise<Blob> image/png
 */
export async function renderResultCard(dino, { personName = '', teamName = '' } = {}) {
  await Promise.all([
    document.fonts.load('400 64px Caprasimo'),
    document.fonts.load('400 32px "Schibsted Grotesk"'),
    document.fonts.load('600 32px "Schibsted Grotesk"'),
    document.fonts.load('700 32px "Schibsted Grotesk"'),
    document.fonts.load('italic 400 32px "Schibsted Grotesk"'),
  ])
  const palette = dino.palette ?? { body: '#56A44C', belly: '#FFEBC2', accent: '#D2335F' }
  const img = await svgToImage(dinoSvg(dino.bodyType, palette))

  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingQuality = 'high'
  ctx.textBaseline = 'alphabetic'

  // Jungle background with a specimen dot grid.
  ctx.fillStyle = C.jungle
  ctx.fillRect(0, 0, W, H)
  ctx.fillStyle = C.jungleDot
  for (let y = 28; y < H; y += 36) for (let x = 28; x < W; x += 36) { ctx.beginPath(); ctx.arc(x, y, 2.2, 0, 7); ctx.fill() }

  // Eyebrow
  const first = personName.trim().split(/\s+/)[0]
  ctx.fillStyle = C.resin
  ctx.font = `700 34px ${BODY}`
  ctx.textAlign = 'left'
  ctx.fillText(first ? `${first}'s dino` : 'Your dino', 72, 108)

  // Paper card with a hard jungle-ink shadow.
  const cx = 72, cy = 150, cw = W - 144, ch = 1050
  ctx.fillStyle = C.jungleDeep
  roundRect(ctx, cx + 12, cy + 12, cw, ch, 36); ctx.fill()
  ctx.fillStyle = C.paper
  roundRect(ctx, cx, cy, cw, ch, 36); ctx.fill()
  ctx.lineWidth = 4
  ctx.strokeStyle = C.jungleDeep
  roundRect(ctx, cx, cy, cw, ch, 36); ctx.stroke()

  // Dino stage: a tinted disc with the palette belly colour and a white die-cut ring.
  const dcx = W / 2, dcy = cy + 282, dr = 240
  ctx.fillStyle = mixHex(palette.belly, '#FFFFFF', 0.45)
  ctx.beginPath(); ctx.arc(dcx, dcy, dr, 0, 7); ctx.fill()
  ctx.lineWidth = 8; ctx.strokeStyle = C.white
  ctx.beginPath(); ctx.arc(dcx, dcy, dr, 0, 7); ctx.stroke()
  ctx.lineWidth = 4; ctx.strokeStyle = C.jungleDeep
  ctx.beginPath(); ctx.arc(dcx, dcy, dr + 6, 0, 7); ctx.stroke()
  const size = 450
  ctx.drawImage(img, dcx - size / 2, dcy - size / 2 + 10, size, size)

  // Name
  ctx.textAlign = 'center'
  ctx.fillStyle = C.ink
  const label = dinoLabel(dino)
  const nameSize = fitDisplay(ctx, label, cw - 100, 112)
  ctx.font = `400 ${nameSize}px ${DISPLAY}`
  ctx.fillText(label, W / 2, cy + 640)

  // Archetype pill
  const arche = dino.personality?.archetype ?? ''
  if (arche) {
    ctx.font = `700 34px ${BODY}`
    const pw = ctx.measureText(arche).width + 72
    ctx.fillStyle = C.resin
    roundRect(ctx, W / 2 - pw / 2, cy + 672, pw, 64, 32); ctx.fill()
    ctx.lineWidth = 3; ctx.strokeStyle = C.jungleDeep
    roundRect(ctx, W / 2 - pw / 2, cy + 672, pw, 64, 32); ctx.stroke()
    ctx.fillStyle = C.ink
    ctx.fillText(arche, W / 2, cy + 716)
  }

  // Tagline
  const tagline = dino.personality?.tagline ?? ''
  ctx.fillStyle = C.inkMuted
  ctx.font = `italic 400 38px ${BODY}`
  const lines = wrapBalanced(ctx, tagline, cw - 160).slice(0, 3)
  lines.forEach((l, i) => ctx.fillText(l, W / 2, cy + 796 + i * 50))

  // Strengths
  const strengths = (dino.personality?.strengths ?? []).slice(0, 3)
  ctx.font = `600 30px ${BODY}`
  const padX = 26, gap = 14, chipH = 58
  let widths = strengths.map((s) => ctx.measureText(s).width + padX * 2)
  // Shrink the text if the row would not fit on one line.
  let fs = 30
  while (widths.reduce((a, b) => a + b, 0) + gap * (widths.length - 1) > cw - 80 && fs > 22) {
    fs -= 1; ctx.font = `600 ${fs}px ${BODY}`
    widths = strengths.map((s) => ctx.measureText(s).width + padX * 2)
  }
  let x = W / 2 - (widths.reduce((a, b) => a + b, 0) + gap * (widths.length - 1)) / 2
  const chipY = cy + ch - 120
  strengths.forEach((s, i) => {
    ctx.fillStyle = C.white
    roundRect(ctx, x, chipY, widths[i], chipH, chipH / 2); ctx.fill()
    ctx.lineWidth = 2.5; ctx.strokeStyle = C.jungleDeep
    roundRect(ctx, x, chipY, widths[i], chipH, chipH / 2); ctx.stroke()
    ctx.fillStyle = C.ink
    ctx.textAlign = 'center'
    ctx.fillText(s, x + widths[i] / 2, chipY + chipH / 2 + fs * 0.35)
    x += widths[i] + gap
  })

  // Footer
  ctx.textAlign = 'left'
  ctx.fillStyle = C.white
  ctx.font = `400 44px ${DISPLAY}`
  ctx.fillText('Dino Selector', 72, H - 54)
  if (teamName) {
    ctx.textAlign = 'right'
    ctx.fillStyle = '#C9E3DA'
    ctx.font = `600 30px ${BODY}`
    ctx.fillText(teamName, W - 72, H - 56)
  }

  return canvasToBlob(canvas, 'image/png')
}
