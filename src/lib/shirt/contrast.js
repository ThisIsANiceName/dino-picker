// Garment-aware colour helpers: ink choices per garment, low-contrast detection, colour names.
import { hexToHsl, normHex } from '../art/index.js'
import { contrastRatio, LOW_CONTRAST_THRESHOLD } from '../../components/ui/color.js'
import { GARMENT_COLORS } from './model.js'
import { ART } from '../art/index.js'

const CREAM = '#FFF7E6'
const INK = '#1E2420'
const ACCENTS = ['#F5AE36', '#D2335F', '#1F6B5C', '#3A91BA', '#FFFFFF', '#1E2420']

/** Inks that read on a garment colour: main (text), accent (decor, second line), soft. */
export function inksFor(garment) {
  const g = normHex(garment, '#FFFFFF')
  const main = contrastRatio(g, INK) >= contrastRatio(g, CREAM) ? INK : CREAM
  const ok = (c) => contrastRatio(g, c) >= LOW_CONTRAST_THRESHOLD + 0.3
  const accent = ACCENTS.find((c) => c !== main && ok(c)) ?? main
  const second = ACCENTS.find((c) => c !== main && c !== accent && ok(c)) ?? accent
  return { main, accent, second }
}

export function colorName(hex) {
  const h = normHex(hex)
  if (!h) return 'This colour'
  const preset = GARMENT_COLORS.find((c) => c.hex === h)
  if (preset) return preset.name
  const [hue, sat, light] = hexToHsl(h)
  if (light > 96) return 'White'
  if (light < 9) return 'Black'
  if (sat < 10) return light > 70 ? 'Light grey' : light < 32 ? 'Dark grey' : 'Grey'
  const names = [
    [14, 'red'], [40, 'orange'], [66, 'yellow'], [160, 'green'], [195, 'teal'],
    [255, 'blue'], [290, 'purple'], [340, 'pink'], [361, 'red'],
  ]
  let base = names.find(([max]) => hue < max)[1]
  if (base === 'orange' && light < 34) base = 'brown'
  if (base === 'yellow' && sat < 45 && light > 75) base = 'cream'
  const tone = light < 32 ? 'Dark ' : light > 74 ? 'Light ' : ''
  const out = `${tone}${base}`
  return out.charAt(0).toUpperCase() + out.slice(1)
}

export function garmentColorName(hex) {
  return (GARMENT_COLORS.find((c) => c.hex === normHex(hex))?.name ?? colorName(hex)).toLowerCase()
}

/**
 * Low-contrast findings for one side: [{ layerId, key, color, ratio }].
 * key is 'color' for text or a decor token ('--decor-1').
 */
export function contrastIssues(config, side) {
  const g = config.garment.color
  const out = []
  for (const layer of config.sides[side].layers) {
    if (layer.hidden) continue
    if (layer.kind === 'text') {
      const ratio = contrastRatio(layer.color, g)
      if (ratio < LOW_CONTRAST_THRESHOLD) out.push({ layerId: layer.id, key: 'color', color: layer.color, ratio })
    } else if (layer.kind === 'decor') {
      const decor = ART.decorById[layer.decorId]
      // Only the main colour decides: second colours are details inside the shape.
      const key = Object.keys(decor?.defaults ?? {})[0]
      if (!key) continue
      const color = layer.colors?.[key] ?? decor.defaults[key]
      const ratio = contrastRatio(color, g)
      if (ratio < LOW_CONTRAST_THRESHOLD) out.push({ layerId: layer.id, key, color, ratio })
    }
  }
  // Worst first, so the warning names the colour most likely to vanish.
  return out.sort((a, b) => a.ratio - b.ratio)
}

/** Mutates the side: swaps every low-contrast colour for an ink that reads on the garment. */
export function fixContrast(config, side) {
  const inks = inksFor(config.garment.color)
  const issues = contrastIssues(config, side)
  for (const issue of issues) {
    const layer = config.sides[side].layers.find((l) => l.id === issue.layerId)
    if (!layer) continue
    if (layer.kind === 'text') layer.color = inks.main
    else layer.colors = { ...(layer.colors ?? {}), [issue.key]: inks.accent }
  }
  return issues.length
}

/** "Dark green on forest green is hard to see. It may vanish when printed." */
export function contrastMessage(issue, garment) {
  return `${colorName(issue.color)} on ${garmentColorName(garment)} is hard to see. It may vanish when printed.`
}
