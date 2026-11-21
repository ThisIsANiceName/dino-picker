// Filtering, faceting and sorting for the Dinopedia and the dino picker.
import { norm, searchText, sizeOf, lengthOf, dinoName } from './dinoUtils.js'

const textCache = new WeakMap()
function haystack(d) {
  let t = textCache.get(d)
  if (!t) { t = norm(searchText(d)); textCache.set(d, t) }
  return t
}

export function matchesQuery(d, q) {
  if (!q) return true
  const h = haystack(d)
  return norm(q).split(/\s+/).every((w) => h.includes(w))
}

/** f = { q, periods: [], diets: [], body: '', size: '' } ; omit = facet to ignore (for counts) */
export function matches(d, f, omit = null) {
  if (!matchesQuery(d, f.q)) return false
  if (omit !== 'periods' && f.periods?.length && !f.periods.includes(d.period)) return false
  if (omit !== 'diets' && f.diets?.length && !f.diets.includes(d.diet)) return false
  if (omit !== 'body' && f.body && d.bodyType !== f.body) return false
  if (omit !== 'size' && f.size && sizeOf(d) !== f.size) return false
  return true
}

export const SORTS = [
  { value: 'popular', label: 'Popular first' },
  { value: 'az', label: 'A to Z' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'biggest', label: 'Biggest first' },
]

const byName = (a, b) => dinoName(a).localeCompare(dinoName(b))
export function sortDinos(list, sort, popularity = null) {
  const out = [...list]
  if (sort === 'az') return out.sort(byName)
  if (sort === 'oldest') return out.sort((a, b) => (b.myaFrom ?? -1) - (a.myaFrom ?? -1) || byName(a, b))
  if (sort === 'biggest') return out.sort((a, b) => (lengthOf(b) ?? -1) - (lengthOf(a) ?? -1) || byName(a, b))
  // popular: team usage, then curated isPopular, then catalog before customs, then A to Z
  return out.sort((a, b) =>
    (popularity?.get(b.name) ?? 0) - (popularity?.get(a.name) ?? 0)
    || Number(!!b.isPopular) - Number(!!a.isPopular)
    || byName(a, b))
}

export function countBy(list, f, facet, keyOf) {
  const counts = {}
  for (const d of list) {
    if (!matches(d, f, facet)) continue
    const k = keyOf(d)
    if (k) counts[k] = (counts[k] ?? 0) + 1
  }
  return counts
}
