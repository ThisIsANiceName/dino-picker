// Team compatibility labels. Deterministic and symmetric; never exposes a number.
//
//   compatibility(dinoA, dinoB) -> { key, label, blurb, reasons } | null
//   teamPairs(persons, getDinoByName) -> [{ a, b, result }]  (most interesting first)
//
// How the label is chosen (first match wins):
//   eras    the two never shared a world (different periods, 80+ million years apart)
//   spicy   predator meets prey (unless they complement each other on 4+ counts),
//           or two big temperaments that push on each other
//   kindred many shared traits (4+ of 8)
//   balance complementary: solo+herd, calm+fierce, different body clock / energy / defence (score 4+)
//   eras    little in common (2 or fewer shared traits)
//   kindred otherwise (3 shared traits)

import { TRAIT_KEYS } from './quiz/index.js'

export const COMPAT_LABELS = {
  kindred: { label: 'Kindred spirits', blurb: 'You will get each other without explaining.' },
  balance: { label: 'Great balance', blurb: 'What one of you lacks, the other brings.' },
  spicy: { label: 'Spicy combo', blurb: 'Sparks are likely. Productive ones, with luck.' },
  eras: { label: 'Different eras', blurb: 'Different worlds, which makes for good stories.' },
}

const LOUD = new Set(['fierce', 'bold', 'stubborn'])
const SOFT = new Set(['calm', 'gentle'])
const CLASH = new Set(['fierce|fierce', 'bold|fierce', 'fierce|stubborn', 'bold|stubborn', 'stubborn|stubborn'])
const pairKey = (a, b) => [a, b].sort().join('|')
const mid = (d) => (Number.isFinite(d.myaFrom) && Number.isFinite(d.myaTo) ? (d.myaFrom + d.myaTo) / 2 : null)

/** Facts about a pair, shared by the label logic, reasons and tests. */
export function pairFacts(a, b) {
  const ta = a.traits, tb = b.traits
  const shared = TRAIT_KEYS.filter((k) => ta[k] === tb[k])
  const dietPair = pairKey(ta.diet, tb.diet)
  const predatorPrey = dietPair === 'carnivore|herbivore'
  const clash = CLASH.has(pairKey(ta.temperament, tb.temperament))
  const ma = mid(a), mb = mid(b)
  const eraGap = ma !== null && mb !== null ? Math.abs(ma - mb) : 0
  const samePeriod = !!a.period && a.period === b.period
  const comp = {
    social: pairKey(ta.social, tb.social) === 'herd|solo',
    temperament: (SOFT.has(ta.temperament) && LOUD.has(tb.temperament)) || (SOFT.has(tb.temperament) && LOUD.has(ta.temperament)),
    energy: ta.energy !== tb.energy,
    chronotype: ['dawn|night', 'day|night', 'dawn|dusk'].includes(pairKey(ta.chronotype, tb.chronotype)),
    defense: ta.defense !== tb.defense,
  }
  // The "strong" complements carry the label; defence and energy only support it.
  const compScore = (comp.social ? 2 : 0) + (comp.temperament ? 2 : 0) + (comp.chronotype ? 1 : 0) + (comp.energy ? 1 : 0) + (comp.defense ? 1 : 0)
  return { shared, predatorPrey, clash, eraGap, samePeriod, comp, compScore }
}

// Tuned over all catalog pairs (see compat.test.js): every label lands between 12% and 40%.
const THRESH = { eraGap: 80, preyMax: 4, kindredShared: 4, balanceScore: 4, erasShared: 2 }

function pickKey(f) {
  if (!f.samePeriod && f.eraGap >= THRESH.eraGap) return 'eras'
  if ((f.predatorPrey && f.compScore < THRESH.preyMax) || f.clash) return 'spicy'
  if (f.shared.length >= THRESH.kindredShared) return 'kindred'
  if (f.compScore >= THRESH.balanceScore) return 'balance'
  if (f.shared.length <= THRESH.erasShared) return 'eras'
  return 'kindred'
}

const SHARED_PHRASE = {
  diet: { carnivore: 'You both go for the meat first', herbivore: 'You both are plant people at heart', omnivore: 'You will both try anything on the menu' },
  energy: { high: 'You both run on a full battery', low: 'You both pace yourselves' },
  mobility: { runner: 'You are both quick off the mark', walker: 'You both prefer a steady walk', swimmer: 'You both feel at home near water', flyer: 'You both like the view from above' },
  size: { tiny: 'You both travel light', small: 'You are both compact and quick', medium: 'You are both a comfortable size', large: 'You both fill a doorway', colossal: 'You both take up the whole lift' },
  social: { solo: 'You both recharge alone', pair: 'You both like one trusted sidekick', herd: 'You both love a crowd' },
  temperament: { fierce: 'You both mean business', bold: 'You are both decisive', calm: 'You both keep calm', curious: 'You both ask the wild questions', gentle: 'You are both kind first', stubborn: 'You both dig in your heels' },
  defense: { speed: 'You both solve trouble by moving fast', armor: 'You both build a fortress', size: 'You both win by being hard to move', weapons: 'You both come armed to a debate', stealth: 'You both know when to disappear', flight: 'You both rise above it' },
  chronotype: { dawn: 'You both start work before the coffee does', day: 'You both peak in the middle of the day', dusk: 'You both do your best work at golden hour', night: 'You both come alive after dark' },
}
const SHARED_ORDER = ['chronotype', 'social', 'temperament', 'energy', 'defense', 'diet', 'mobility', 'size']

function reasonsFor(key, a, b, f) {
  const ta = a.traits, tb = b.traits
  const out = []
  const push = (s) => { if (s && !out.includes(s) && out.length < 3) out.push(s) }
  const shared = () => { for (const k of SHARED_ORDER) if (f.shared.includes(k)) push(SHARED_PHRASE[k][ta[k]]) }
  const lone = (x, y) => (x.traits.social === 'solo' ? x : y)
  const crowd = (x, y) => (x.traits.social === 'herd' ? x : y)

  if (key === 'kindred') {
    shared()
  } else if (key === 'balance') {
    if (f.comp.social) push('One of you recharges alone, the other in a crowd')
    if (f.comp.temperament) push('One keeps the peace while the other pushes things forward')
    if (f.comp.chronotype) push('Between you, the whole day is covered')
    if (ta.energy !== tb.energy) push('One sets the pace, the other keeps it sustainable')
    if (f.comp.defense) push('You handle trouble in different ways, so you cover each other')
    shared()
  } else if (key === 'spicy') {
    if (f.predatorPrey) push('One of you hunts, the other would rather not be on the menu')
    if (f.clash) push('Two strong opinions, one meeting room')
    if (f.comp.social) push('Solo sprint meets crowd energy')
    if (ta.energy !== tb.energy) push('Different speeds, so expect some friction')
    shared()
  } else {
    if (f.eraGap >= THRESH.eraGap && !f.samePeriod) push('You come from very different stretches of prehistory')
    if (ta.diet !== tb.diet) push('Different diets, different lunch plans')
    if (ta.chronotype !== tb.chronotype) push('Your body clocks rarely line up')
    if (ta.social !== tb.social) push('You like to spend your time differently')
    if (ta.mobility !== tb.mobility) push('You get around in very different ways')
    shared()
  }
  // Always end up with at least two reasons.
  if (out.length < 2) {
    for (const k of SHARED_ORDER) if (f.shared.includes(k)) push(SHARED_PHRASE[k][ta[k]])
  }
  if (out.length < 2) push('A pairing worth getting to know')
  return out.slice(0, 3)
}

export function compatibility(a, b) {
  if (!a?.traits || !b?.traits) return null
  // Canonical order so the output is symmetric.
  const [x, y] = String(a.id ?? a.name) <= String(b.id ?? b.name) ? [a, b] : [b, a]
  const f = pairFacts(x, y)
  const key = pickKey(f)
  const { label, blurb } = COMPAT_LABELS[key]
  return { key, label, blurb, reasons: reasonsFor(key, x, y, f) }
}

const RANK = { spicy: 0, balance: 1, kindred: 2, eras: 3 }

/**
 * Every pair of people whose dinos have traits, most interesting first
 * (spicy, balance, kindred, eras; then A to Z by names).
 * @param persons Person[] ({ id, name, dinoName })
 * @param getDinoByName (name) => dino | null
 */
export function teamPairs(persons, getDinoByName) {
  const withDino = []
  for (const p of persons ?? []) {
    const d = p?.dinoName ? getDinoByName(p.dinoName) : null
    if (d?.traits) withDino.push({ p, d })
  }
  const pairs = []
  for (let i = 0; i < withDino.length; i++) {
    for (let j = i + 1; j < withDino.length; j++) {
      const result = compatibility(withDino[i].d, withDino[j].d)
      if (result) pairs.push({ a: withDino[i].p, b: withDino[j].p, result })
    }
  }
  const nm = (x) => `${x.a.name}|${x.b.name}`.toLowerCase()
  pairs.sort((x, y) => RANK[x.result.key] - RANK[y.result.key] || nm(x).localeCompare(nm(y)))
  return pairs
}
