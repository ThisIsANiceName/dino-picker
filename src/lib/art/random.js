// Pleasant, constrained randomness for the Avatar Studio "Randomise" button.
// Never touches the dino, the photo or the display mode.
import { ART, HOUSE_PALETTES, hslToHex, hexToHsl, sceneColorsFor, mixHex } from './index.js'

const pick = (list, rnd) => list[Math.floor(rnd() * list.length)]
const chance = (p, rnd) => rnd() < p

/** A body/belly/accent trio built on colour-wheel relationships (never three loud colours). */
export function harmoniousPalette(rnd = Math.random) {
  if (chance(0.35, rnd)) {
    const p = pick(HOUSE_PALETTES, rnd)
    return { body: p.body, belly: p.belly, accent: p.accent }
  }
  const h = Math.floor(rnd() * 360)
  // Yellows go muddy when dark; keep them lighter, keep blues and purples deeper.
  const light = h > 40 && h < 80 ? 58 + rnd() * 8 : 44 + rnd() * 14
  const body = hslToHex(h, 42 + rnd() * 26, light)
  const belly = hslToHex(h + (chance(0.5, rnd) ? 18 : -14), 55 + rnd() * 25, 88 + rnd() * 5)
  const scheme = pick(['complement', 'split', 'analogous', 'triad'], rnd)
  const shift = { complement: 180, split: chance(0.5, rnd) ? 150 : 210, analogous: chance(0.5, rnd) ? 40 : -40, triad: 120 }[scheme]
  const accent = hslToHex(h + shift, 62 + rnd() * 22, scheme === 'analogous' ? 34 + rnd() * 10 : 50 + rnd() * 12)
  return { body, belly, accent }
}

/** Accessory colours that echo the dino: sometimes the kit's own, sometimes tinted to the accent. */
function gearColors(item, palette, rnd) {
  if (chance(0.55, rnd)) return {}
  const keys = Object.keys(item.defaults)
  const [h, s] = hexToHsl(palette.accent)
  const out = {}
  if (keys[0]) out[keys[0]] = hslToHex(h, Math.max(50, s), 48)
  if (keys[1]) out[keys[1]] = mixHex(palette.belly, '#FFFFFF', 0.3)
  return out
}

/** New config from `config`: palette, 0-2 accessories, scene, maybe a frame. */
export function randomizeAvatar(config, rnd = Math.random) {
  const next = JSON.parse(JSON.stringify(config))
  const palette = harmoniousPalette(rnd)
  next.colors = { ...next.colors, ...palette, shade: null }

  // 0-2 accessories. Hats are the fun one, extras are rare.
  const weights = { hat: 0.55, eyewear: 0.3, neck: 0.3, extra: 0.1 }
  const slots = ART.slots.filter((s) => chance(weights[s], rnd)).sort(() => rnd() - 0.5).slice(0, 2)
  for (const slot of ART.slots) {
    if (!slots.includes(slot)) { next.accessories[slot] = null; continue }
    const item = pick(ART.accessories[slot], rnd)
    next.accessories[slot] = { id: item.id, colors: gearColors(item, palette, rnd) }
  }

  const bg = pick(ART.backgrounds, rnd)
  // Mostly tie the scene to the dino; now and then keep the scene's own painted colours.
  next.background = { id: bg.id, colors: chance(0.7, rnd) ? sceneColorsFor(bg.id, palette) : {} }

  if (chance(0.35, rnd)) {
    const frame = pick(ART.frames, rnd)
    const keys = Object.keys(frame.defaults)
    const [h, s] = hexToHsl(palette.accent)
    const colors = {}
    if (chance(0.6, rnd)) {
      if (keys[0]) colors[keys[0]] = hslToHex(h, Math.max(45, s), 42)
      if (keys[1]) colors[keys[1]] = mixHex(palette.belly, '#FFFFFF', 0.2)
    }
    next.frame = { id: frame.id, colors }
  } else next.frame = null
  return next
}
