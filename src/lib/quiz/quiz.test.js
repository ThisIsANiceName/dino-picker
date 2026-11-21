import { test } from 'node:test'
import assert from 'node:assert/strict'
import { QUESTIONS, TRAIT_AXES, TRAIT_KEYS, scoreQuiz, traitProfile, userProfile } from './index.js'
import dinos from '../../data/catalog/dinos.js'

function rng(seed) {
  let a = seed
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const randomAnswers = (r) => QUESTIONS.map((q) => ({ q: q.id, a: q.options[Math.floor(r() * q.options.length)].id }))

test('14 questions with 4 options and valid weights', () => {
  assert.ok(QUESTIONS.length >= 12 && QUESTIONS.length <= 14)
  const ids = new Set()
  for (const q of QUESTIONS) {
    assert.ok(!ids.has(q.id)); ids.add(q.id)
    assert.equal(q.options.length, 4)
    assert.deepEqual(q.options.map((o) => o.id), ['a', 'b', 'c', 'd'])
    for (const o of q.options) {
      for (const [trait, vals] of Object.entries(o.weights)) {
        assert.ok(TRAIT_KEYS.includes(trait), `${q.id}: trait ${trait}`)
        for (const v of Object.keys(vals)) {
          assert.ok(dinos.some((d) => d.traits[trait] === v), `${q.id}: ${trait}=${v} exists in catalog`)
        }
      }
    }
  }
})

test('every trait dimension is covered by at least two questions', () => {
  for (const k of TRAIT_KEYS) {
    const n = QUESTIONS.filter((q) => q.options.some((o) => o.weights[k])).length
    assert.ok(n >= 2, `${k} covered by ${n}`)
  }
})

test('trait axes and profiles', () => {
  assert.ok(TRAIT_AXES.length >= 5 && TRAIT_AXES.length <= 7)
  for (const ax of TRAIT_AXES) assert.ok(ax.key && ax.label && ax.minLabel && ax.maxLabel)
  assert.equal(traitProfile({ name: 'x' }), null)
  for (const d of dinos) {
    const p = traitProfile(d)
    for (const ax of TRAIT_AXES) assert.ok(p[ax.key] >= 1 && p[ax.key] <= 5)
  }
  const u = userProfile(randomAnswers(rng(1)))
  assert.deepEqual(Object.keys(u), TRAIT_AXES.map((a) => a.key))
  for (const v of Object.values(u)) assert.ok(v >= 1 && v <= 5)
})

test('scoring is deterministic, ignores trait-less dinos and explains itself', () => {
  const ans = randomAnswers(rng(7))
  const withExtra = [...dinos, { name: 'Custom', id: 'custom' }]
  const a = scoreQuiz(ans, withExtra), b = scoreQuiz(ans, withExtra)
  assert.equal(a.length, dinos.length)
  assert.deepEqual(a.map((x) => x.dino.id), b.map((x) => x.dino.id))
  for (let i = 1; i < a.length; i++) assert.ok(a[i - 1].score >= a[i].score - 1e-9)
  assert.ok(a[0].why.length >= 2)
  for (const m of a[0].matched) assert.ok(TRAIT_KEYS.includes(m))
  assert.deepEqual(scoreQuiz([], dinos).length, dinos.length)
})

test('coherent answers land on a sensible dino', () => {
  const all = (letter) => scoreQuiz(QUESTIONS.map((q) => ({ q: q.id, a: letter })), dinos)[0].dino
  assert.equal(all('a').traits.diet, 'carnivore')
  assert.equal(all('b').traits.diet, 'herbivore')
  assert.equal(all('b').traits.mobility, 'walker')
})

test('simulation: 10,000 random answer sets spread across the catalog', () => {
  const r = rng(20260521)
  const N = 10000
  const counts = new Map()
  for (let i = 0; i < N; i++) {
    const top = scoreQuiz(randomAnswers(r), dinos)[0].dino.id
    counts.set(top, (counts.get(top) ?? 0) + 1)
  }
  const reachable = counts.size / dinos.length
  const max = Math.max(...counts.values()) / N
  const popular = dinos.filter((d) => d.isPopular)
  const popShare = popular.reduce((s, d) => s + (counts.get(d.id) ?? 0), 0) / N
  const fair = popular.length / dinos.length
  const popReach = popular.filter((d) => counts.has(d.id)).length / popular.length
  console.log(`quiz sim: reachable ${counts.size}/${dinos.length}, max share ${(max * 100).toFixed(1)}%, popular share ${(popShare * 100).toFixed(1)}% (fair ${(fair * 100).toFixed(1)}%), popular reachable ${(popReach * 100).toFixed(0)}%`)
  assert.ok(reachable >= 0.6, `reachable ${reachable}`)
  assert.ok(max <= 0.05, `max share ${max}`)
  assert.ok(popShare >= fair * 0.7, `popular share ${popShare} vs fair ${fair}`)
  assert.ok(popReach >= 0.8)
})
