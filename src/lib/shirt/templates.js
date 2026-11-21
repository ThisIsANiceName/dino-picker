// Shirt templates. Each builds a full ShirtConfig for a garment colour, choosing inks that
// read on it. Layer positions are fractions of the art box; sizes are master px.
import { avatarLayer, decorLayer, dinoLayer, textLayer, defaultNumber } from './model.js'
import { inksFor } from './contrast.js'

const side = (placement, layers) => ({ placement, layers })

export const TEMPLATES = [
  {
    id: 'classic-badge',
    label: 'Classic badge',
    blurb: 'Avatar in a laurel, name underneath.',
    garment: { type: 'tshirt', color: '#1E2420' },
    build(ink) {
      return {
        front: side('full-front', [
          textLayer({ text: '{team}', font: 'Schibsted Grotesk', weight: 800, size: 190, tracking: 140, case: 'upper', color: ink.accent, y: 0.06 }),
          decorLayer('laurel-pair', { colors: { '--decor-1': ink.accent }, x: 0.5, y: 0.37, w: 0.96 }),
          avatarLayer({ x: 0.5, y: 0.355, w: 0.6 }),
          textLayer({ text: '{name}', font: 'Caprasimo', weight: 400, size: 430, color: ink.main, y: 0.725 }),
          textLayer({ text: '{dino}', font: 'Schibsted Grotesk', weight: 600, size: 180, tracking: 80, case: 'upper', color: ink.accent, y: 0.815 }),
        ]),
        back: side('full-back', []),
      }
    },
  },
  {
    id: 'retro-sunset',
    label: 'Retro sunset',
    blurb: 'Your dino in front of a striped sun.',
    garment: { type: 'tshirt', color: '#1D2B4F' },
    build(ink) {
      return {
        front: side('full-front', [
          decorLayer('sun-rays-half', { colors: { '--decor-1': ink.accent, '--decor-2': ink.main }, x: 0.5, y: 0.33, w: 1 }),
          dinoLayer({ x: 0.5, y: 0.37, w: 0.84 }),
          textLayer({ text: '{name}', font: 'Big Shoulders Display', weight: 900, size: 560, tracking: 20, case: 'upper', color: ink.main, y: 0.76 }),
          textLayer({ text: '{tagline}', font: 'Fredoka', weight: 500, size: 150, color: ink.accent, y: 0.86, maxW: 0.84 }),
        ]),
        back: side('full-back', []),
      }
    },
  },
  {
    id: 'varsity',
    label: 'Varsity',
    blurb: 'College arch, dino mascot, est. year.',
    garment: { type: 'tshirt', color: '#B9BCB5' },
    build(ink) {
      return {
        front: side('full-front', [
          textLayer({ text: '{team}', font: 'Graduate', weight: 400, size: 400, tracking: 30, arc: 38, case: 'upper', color: ink.main, y: 0.115 }),
          dinoLayer({ x: 0.5, y: 0.45, w: 0.78 }),
          textLayer({ text: '{name}', font: 'Graduate', weight: 400, size: 330, case: 'upper', color: ink.main, y: 0.775 }),
          decorLayer('star', { colors: { '--decor-1': ink.accent }, x: 0.2, y: 0.868, w: 0.07 }),
          textLayer({ text: 'EST. {year}', font: 'Graduate', weight: 400, size: 170, tracking: 160, color: ink.accent, y: 0.868 }),
          decorLayer('star', { colors: { '--decor-1': ink.accent }, x: 0.8, y: 0.868, w: 0.07 }),
        ]),
        back: side('full-back', []),
      }
    },
  },
  {
    id: 'name-number',
    label: 'Name and number',
    blurb: 'Back print like a team jersey, small crest on the front.',
    garment: { type: 'tshirt', color: '#24452F' },
    startSide: 'back',
    needsNumber: true,
    build(ink) {
      return {
        front: side('left-chest', [
          avatarLayer({ x: 0.5, y: 0.5, w: 0.86 }),
        ]),
        back: side('full-back', [
          textLayer({ text: '{name}', font: 'Big Shoulders Display', weight: 900, size: 440, tracking: 60, arc: 24, case: 'upper', color: ink.main, y: 0.085 }),
          textLayer({ text: '{number}', font: 'Graduate', weight: 400, size: 2300, color: ink.main, y: 0.42 }),
          textLayer({ text: '{team}', font: 'Schibsted Grotesk', weight: 800, size: 170, tracking: 160, case: 'upper', color: ink.accent, y: 0.69 }),
        ]),
      }
    },
  },
  {
    id: 'minimal-left-chest',
    label: 'Minimal left chest',
    blurb: 'A small avatar over the heart. Quiet and wearable.',
    garment: { type: 'tshirt', color: '#FFFFFF' },
    build(ink) {
      return {
        front: side('left-chest', [
          avatarLayer({ x: 0.5, y: 0.4, w: 0.74 }),
          textLayer({ text: '{name}', font: 'Schibsted Grotesk', weight: 800, size: 112, color: ink.main, y: 0.9 }),
        ]),
        back: side('full-back', []),
      }
    },
  },
  {
    id: 'team-roster',
    label: 'Team roster',
    blurb: 'Tour-shirt style: mascot up front, everyone on the back.',
    garment: { type: 'tshirt', color: '#1E2420' },
    build(ink) {
      return {
        front: side('center-chest', [
          dinoLayer({ x: 0.5, y: 0.4, w: 0.86 }),
          textLayer({ text: '{team}', font: 'Caprasimo', weight: 400, size: 250, color: ink.main, y: 0.86, maxW: 0.86 }),
        ]),
        back: side('full-back', [
          textLayer({ text: '{team}', font: 'Caprasimo', weight: 400, size: 400, color: ink.main, y: 0.07 }),
          textLayer({ text: 'The herd of {year}', font: 'Schibsted Grotesk', weight: 800, size: 150, tracking: 140, case: 'upper', color: ink.accent, y: 0.15 }),
          textLayer({ text: '{roster}', font: 'Schibsted Grotesk', weight: 600, size: 200, color: ink.main, y: 0.53, columns: 'auto', maxH: 0.62 }),
          decorLayer('footprint-trail', { colors: { '--decor-1': ink.accent }, x: 0.5, y: 0.93, w: 0.16, rotate: 90 }),
        ]),
      }
    },
  },
]

export const templateById = (id) => TEMPLATES.find((t) => t.id === id) ?? null

/**
 * Build a ShirtConfig from a template.
 *   garment   keep this garment ({ type, color }); defaults to the template's own
 *   personId  seeds a jersey number for templates that need one
 */
export function buildTemplate(id, { garment = null, personId = null, numbers = {} } = {}) {
  const t = templateById(id) ?? TEMPLATES[0]
  const g = garment ? { ...garment } : { ...t.garment }
  const config = { v: 1, template: t.id, garment: g, sides: t.build(inksFor(g.color)), numbers: { ...numbers } }
  if (t.needsNumber && personId && !config.numbers[personId]) config.numbers[personId] = defaultNumber(personId)
  return config
}

export function blankDesign(garment = { type: 'tshirt', color: '#1E2420' }) {
  return {
    v: 1,
    template: 'blank',
    garment: { ...garment },
    sides: { front: side('full-front', []), back: side('full-back', []) },
    numbers: {},
  }
}
