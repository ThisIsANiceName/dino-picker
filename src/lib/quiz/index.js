// Dino Selector quiz engine. Pure JS, no Vue, runs under node --test.
//
//   TRAIT_AXES                 7 two-ended display axes
//   traitProfile(dino)         { [axisKey]: 1..5 } | null (no traits)
//   QUESTIONS                  14 questions, 4 options each
//   scoreQuiz(answers, dinos)  ranked [{ dino, score, matched, why }]
//   userProfile(answers)       same shape as traitProfile
//
// Answers are [{ q: questionId, a: optionId }] (a map { [questionId]: optionId } also works).
// Scoring: every answer adds weighted votes to trait values. Per dimension the votes become a
// distribution; a dino scores the similarity-weighted mass its own trait value earns
// (near neighbours like "large" for "colossal" earn partial credit), summed over dimensions with
// per-dimension weights. Ties are broken by a deterministic hash of the answers, so equal dinos
// share the wins instead of one always winning.

import { QUESTIONS } from './questions.js'

export { QUESTIONS }

export const TRAIT_KEYS = ['diet', 'energy', 'mobility', 'size', 'social', 'temperament', 'defense', 'chronotype']

export const TRAIT_AXES = [
  { key: 'energy', label: 'Energy', minLabel: 'Chill', maxLabel: 'Turbo' },
  { key: 'social', label: 'Social', minLabel: 'Lone wolf', maxLabel: 'Herd heart' },
  { key: 'boldness', label: 'Boldness', minLabel: 'Gentle soul', maxLabel: 'Fearless' },
  { key: 'size', label: 'Size', minLabel: 'Pocket-sized', maxLabel: 'Colossal' },
  { key: 'chronotype', label: 'Body clock', minLabel: 'Night owl', maxLabel: 'Early bird' },
  { key: 'defense', label: 'Under pressure', minLabel: 'Stand your ground', maxLabel: 'Slip away' },
  { key: 'diet', label: 'Appetite', minLabel: 'Plant-powered', maxLabel: 'Meat lover' },
]

// Axis value (1..5) of each trait value.
const AXIS_SCALE = {
  energy: { trait: 'energy', map: { low: 1.5, high: 4.5 } },
  social: { trait: 'social', map: { solo: 1, pair: 3, herd: 5 } },
  boldness: { trait: 'temperament', map: { gentle: 1, calm: 1.8, curious: 3, stubborn: 3.7, bold: 4.5, fierce: 5 } },
  size: { trait: 'size', map: { tiny: 1, small: 2, medium: 3, large: 4, colossal: 5 } },
  chronotype: { trait: 'chronotype', map: { night: 1, dusk: 2, day: 4, dawn: 5 } },
  defense: { trait: 'defense', map: { armor: 1, size: 1.6, weapons: 2.4, stealth: 3.8, speed: 4.4, flight: 5 } },
  diet: { trait: 'diet', map: { herbivore: 1, omnivore: 3, carnivore: 5 } },
}

const round1 = (n) => Math.round(n * 10) / 10

export function traitProfile(dino) {
  const t = dino?.traits
  if (!t || !t.diet) return null
  const out = {}
  for (const ax of TRAIT_AXES) {
    const { trait, map } = AXIS_SCALE[ax.key]
    out[ax.key] = map[t[trait]] ?? 3
  }
  return out
}

// ── Similarity between values of one trait (1 = same, 0 = unrelated) ────────────────────
const sym = (pairs) => {
  const m = {}
  for (const [a, b, v] of pairs) { (m[a] ??= {})[b] = v; (m[b] ??= {})[a] = v }
  return m
}
const SIM = {
  diet: sym([['herbivore', 'omnivore', 0.35], ['carnivore', 'omnivore', 0.35]]),
  energy: {},
  mobility: sym([['runner', 'walker', 0.35], ['runner', 'flyer', 0.2], ['walker', 'swimmer', 0.15], ['walker', 'flyer', 0.1]]),
  size: sym(['tiny', 'small', 'medium', 'large', 'colossal'].flatMap((a, i, arr) =>
    arr.slice(i + 1).map((b, j) => [a, b, Math.max(0, 1 - 0.5 * (j + 1))]))),
  social: sym([['solo', 'pair', 0.45], ['pair', 'herd', 0.45]]),
  temperament: sym([
    ['fierce', 'bold', 0.5], ['bold', 'stubborn', 0.35], ['fierce', 'stubborn', 0.3], ['calm', 'gentle', 0.55],
    ['curious', 'gentle', 0.25], ['curious', 'bold', 0.25], ['curious', 'calm', 0.2], ['stubborn', 'calm', 0.1],
  ]),
  defense: sym([
    ['speed', 'flight', 0.35], ['speed', 'stealth', 0.3], ['flight', 'stealth', 0.2], ['armor', 'size', 0.45],
    ['size', 'weapons', 0.3], ['armor', 'weapons', 0.2], ['size', 'speed', 0.05],
  ]),
  chronotype: sym([['dawn', 'day', 0.45], ['day', 'dusk', 0.45], ['dusk', 'night', 0.45], ['night', 'dawn', 0.2]]),
}
const sim = (trait, a, b) => (a === b ? 1 : SIM[trait]?.[a]?.[b] ?? 0)

// Per-dimension importance. Tuned by the simulation in quiz.test.js.
const DIM_WEIGHT = {
  diet: 1.25, energy: 0.8, mobility: 1.1, size: 1.0, social: 0.85, temperament: 1.0, defense: 1.0, chronotype: 0.8,
}

const Q_BY_ID = new Map(QUESTIONS.map((q) => [q.id, q]))

export function normalizeAnswers(answers) {
  if (!answers) return []
  const list = Array.isArray(answers) ? answers : Object.entries(answers).map(([q, a]) => ({ q, a }))
  const out = []
  for (const x of list) {
    const q = Q_BY_ID.get(x?.q)
    const opt = q?.options.find((p) => p.id === x.a)
    if (q && opt) out.push({ q: q.id, a: opt.id, option: opt })
  }
  return out
}

/** votes[trait][value] = summed weight */
function tally(answers) {
  const votes = {}
  for (const k of TRAIT_KEYS) votes[k] = {}
  for (const { option } of normalizeAnswers(answers)) {
    for (const [trait, vals] of Object.entries(option.weights)) {
      for (const [v, w] of Object.entries(vals)) votes[trait][v] = (votes[trait][v] ?? 0) + w
    }
  }
  const dist = {}
  for (const k of TRAIT_KEYS) {
    const total = Object.values(votes[k]).reduce((s, n) => s + n, 0)
    dist[k] = total > 0 ? Object.fromEntries(Object.entries(votes[k]).map(([v, n]) => [v, n / total])) : null
  }
  return { votes, dist }
}

export function userProfile(answers) {
  const { dist } = tally(answers)
  const out = {}
  for (const ax of TRAIT_AXES) {
    const { trait, map } = AXIS_SCALE[ax.key]
    const d = dist[trait]
    if (!d) { out[ax.key] = 3; continue }
    let v = 0
    for (const [val, p] of Object.entries(d)) v += p * (map[val] ?? 3)
    out[ax.key] = round1(Math.min(5, Math.max(1, v)))
  }
  return out
}

function hash32(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) }
  h ^= h >>> 15; h = Math.imul(h, 2246822507); h ^= h >>> 13
  return (h >>> 0) / 4294967296
}

// ── "Why you matched" sentences, concrete and about behaviour ───────────────────────────
const WHY = {
  diet: {
    carnivore: 'You both go for the meat first',
    herbivore: 'You are both happiest with a plate full of plants',
    omnivore: 'You both will happily try a bit of everything',
  },
  energy: {
    high: 'You both run on a full battery',
    low: 'You both pace yourselves and save your energy',
  },
  mobility: {
    runner: 'Your first move is a sprint, and so is theirs',
    walker: 'You both prefer steady steps to a sprint',
    swimmer: 'You both feel most at home near water',
    flyer: 'You both like the view from above',
  },
  size: {
    tiny: 'You both take up very little space and still get noticed',
    small: 'You are both compact and quick on your feet',
    medium: 'You are both a comfortable, middle-sized presence',
    large: 'You both fill a doorway when you walk in',
    colossal: 'You both take up the whole lift',
  },
  social: {
    solo: 'You both recharge alone',
    pair: 'You both do best with one trusted sidekick',
    herd: 'You are both happiest in a crowd',
  },
  temperament: {
    fierce: 'You both have a short fuse and a long reach',
    bold: 'You both say "let us just decide" and decide',
    calm: 'You both stay calm when the room does not',
    curious: 'You both ask the question nobody planned for',
    gentle: 'You both show up with snacks when a friend needs it',
    stubborn: 'You both repeat the point a fourth time, politely',
  },
  defense: {
    speed: 'Speed is your first answer to trouble',
    armor: 'You both build a fortress when things get rough',
    size: 'You both win by being very hard to move',
    weapons: 'You both come to a debate armed',
    stealth: 'You both know exactly when to disappear',
    flight: 'You both prefer to rise above it',
  },
  chronotype: {
    dawn: 'You are both up before the sun',
    day: 'You both do your best work in the middle of the day',
    dusk: 'Golden hour is your hour, and theirs',
    night: 'You both come alive after dark',
  },
}

// ── Scoring ───────────────────────────────────────────────────────────────────────────
/**
 * Rank dinos for a set of answers. Dinos without `traits` are ignored.
 * @returns [{ dino, score (0..1, do not show), matched: traitKeys[], why: string[] }]
 */
export function scoreQuiz(answers, dinos) {
  const norm = normalizeAnswers(answers)
  const { dist } = tally(norm)
  const seed = norm.map((x) => x.q + x.a).sort().join('|')
  const wSum = TRAIT_KEYS.reduce((s, k) => s + (dist[k] ? DIM_WEIGHT[k] : 0), 0) || 1

  const ranked = []
  for (const dino of dinos ?? []) {
    const t = dino?.traits
    if (!t) continue
    let score = 0
    const dims = []
    for (const k of TRAIT_KEYS) {
      const d = dist[k]
      if (!d) continue
      let s = 0
      for (const [val, p] of Object.entries(d)) s += p * sim(k, val, t[k])
      score += DIM_WEIGHT[k] * s
      dims.push({ key: k, s, exact: d[t[k]] ?? 0 })
    }
    score /= wSum
    const jitter = hash32(seed + '#' + (dino.id ?? dino.name)) * 1e-4
    ranked.push({ dino, score, rank: score + jitter, dims })
  }
  ranked.sort((a, b) => b.rank - a.rank)

  return ranked.map(({ dino, score, dims }) => {
    // Dimensions where the person's answers actually point at this dino's value, strongest first.
    const strong = dims
      .filter((d) => d.exact >= 0.3)
      .sort((a, b) => b.exact * DIM_WEIGHT[b.key] - a.exact * DIM_WEIGHT[a.key])
    const matched = strong.map((d) => d.key)
    const why = strong.slice(0, 4).map((d) => WHY[d.key][dino.traits[d.key]]).filter(Boolean)
    if (why.length < 2) {
      for (const d of [...dims].sort((a, b) => b.s - a.s)) {
        if (why.length >= 2) break
        const line = WHY[d.key][dino.traits[d.key]]
        if (line && !why.includes(line) && d.s >= 0.2) why.push(line.replace(/^You both/, 'You are close on this: you both'))
      }
    }
    return { dino, score: Math.round(score * 1000) / 1000, matched, why }
  })
}

// ── Identity helpers: catalog entries have `id`, store dinos only a lowercase `name` ────
export const dinoKey = (d) => d?.id ?? String(d?.name ?? '').toLowerCase()
export const dinoLabel = (d) => d?.displayName ?? (d?.name ? d.name[0].toUpperCase() + d.name.slice(1) : '')
