// Team composition facts (facts, not rankings).
import { BODY_TYPES, DIETS, PERIODS, lengthOf, dinoName, firstName, bodyTypePlural } from '../dinopedia/dinoUtils.js'

const DIET_WORD = {
  herbivore: ['herbivore', 'herbivores'], carnivore: ['carnivore', 'carnivores'], omnivore: ['omnivore', 'omnivores'],
  piscivore: ['fish eater', 'fish eaters'], insectivore: ['insect eater', 'insect eaters'],
}
export const dietWord = (d, n) => (DIET_WORD[d] ?? [d, `${d}s`])[n === 1 ? 0 : 1]

export function listText(parts) {
  if (parts.length <= 1) return parts.join('')
  return `${parts.slice(0, -1).join(', ')} and ${parts.at(-1)}`
}

/** rows: [{ person, dino }] */
export function teamStats(rows) {
  const withDino = rows.filter((r) => r.dino)
  const tally = (key) => {
    const m = {}
    for (const { dino } of withDino) if (dino[key]) m[dino[key]] = (m[dino[key]] ?? 0) + 1
    return m
  }
  const diets = tally('diet')
  const periods = tally('period')
  const bodies = tally('bodyType')

  const dietOrder = [...DIETS, ...Object.keys(diets).filter((d) => !DIETS.includes(d))]
  const dietRows = dietOrder.filter((d) => diets[d]).map((d) => ({ key: d, count: diets[d] }))
    .sort((a, b) => b.count - a.count)
  const dietLine = listText(dietRows.map((r) => `${r.count} ${dietWord(r.key, r.count)}`))

  const bodyRows = BODY_TYPES.filter((b) => bodies[b.value]).map((b) => ({ ...b, count: bodies[b.value] }))
    .sort((a, b) => b.count - a.count)

  const periodRows = PERIODS.map((p) => ({ ...p, count: periods[p.value] ?? 0 }))

  // Headline from the data
  let headline = 'A herd waiting to hatch'
  const n = withDino.length
  if (n) {
    const top = [...periodRows].sort((a, b) => b.count - a.count)[0]
    const topDiet = dietRows[0]
    if (periodRows.filter((p) => p.count).length === 1) headline = `An all-${top.label} crew`
    else if (top.count / n > 0.5) headline = `A mostly ${top.label} crew`
    else if (topDiet && topDiet.count / n > 0.6) headline = `A ${dietWord(topDiet.key, 1)}-heavy herd`
    else headline = 'A herd from across the ages'
  }

  // Herd stats
  const lengths = withDino.map((r) => ({ ...r, m: lengthOf(r.dino) })).filter((r) => r.m)
  const totalLength = lengths.reduce((s, r) => s + r.m, 0)
  const weights = withDino.filter((r) => r.dino.weightKg)
  const totalWeight = weights.reduce((s, r) => s + r.dino.weightKg, 0)
  const fastest = withDino.filter((r) => r.dino.speedKmh).sort((a, b) => b.dino.speedKmh - a.dino.speedKmh)[0] ?? null
  const oldest = withDino.filter((r) => r.dino.myaFrom != null).sort((a, b) => b.dino.myaFrom - a.dino.myaFrom)[0] ?? null
  const longest = [...lengths].sort((a, b) => b.m - a.m)[0] ?? null

  return {
    total: rows.length, withDino: n, eggs: rows.length - n,
    dietRows, dietLine, periodRows, bodyRows, headline,
    totalLength, totalWeight, fastest, oldest, longest,
    bodyLine: bodyRows.slice(0, 3).map((b) => `${b.count} ${bodyTypePlural(b.value, b.count)}`),
  }
}

export const who = (r) => `${firstName(r.person.name)}'s ${dinoName(r.dino)}`
