import { test } from 'node:test'
import assert from 'node:assert/strict'
import { compatibility, teamPairs, COMPAT_LABELS } from './compat.js'
import dinos from '../data/catalog/dinos.js'

// Node 22 treats a directory argument as a module, so pull the quiz suite in here too:
// `node --test src/lib/quiz/ src/lib/compat.test.js` then runs everything.
import './quiz/quiz.test.js'
const LABELS = Object.values(COMPAT_LABELS).map((x) => x.label)
const by = (id) => dinos.find((d) => d.id === id)

function distribution(list) {
  const c = { kindred: 0, balance: 0, spicy: 0, eras: 0 }
  let n = 0
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) { c[compatibility(list[i], list[j]).key]++; n++ }
  return Object.fromEntries(Object.entries(c).map(([k, v]) => [k, v / n]))
}

test('labels are exactly the four in the spec', () => {
  assert.deepEqual(LABELS, ['Kindred spirits', 'Great balance', 'Spicy combo', 'Different eras'])
})

test('null when either dino lacks traits', () => {
  assert.equal(compatibility(by('tyrannosaurus'), { name: 'Custom' }), null)
  assert.equal(compatibility(null, by('tyrannosaurus')), null)
})

test('deterministic, symmetric, 2-3 reasons, no digits shown', () => {
  for (let i = 0; i < dinos.length; i += 3) {
    for (let j = i + 1; j < dinos.length; j += 4) {
      const ab = compatibility(dinos[i], dinos[j]), ba = compatibility(dinos[j], dinos[i])
      assert.deepEqual(ab, ba)
      assert.ok(LABELS.includes(ab.label))
      assert.ok(ab.reasons.length >= 2 && ab.reasons.length <= 3)
      assert.ok(ab.blurb)
      assert.ok(!/\d/.test(ab.label + ab.blurb + ab.reasons.join(' ')))
    }
  }
})

test('labels follow the documented logic', () => {
  assert.equal(compatibility(by('tyrannosaurus'), by('triceratops')).key, 'spicy')
  assert.equal(compatibility(by('coelophysis'), by('tyrannosaurus')).key, 'eras')
  const twins = compatibility(by('ankylosaurus'), by('euoplocephalus'))
  assert.ok(['kindred', 'balance'].includes(twins.key))
})

test('healthy label mix over all catalog pairs and popular pairs', () => {
  for (const [name, list] of [['all', dinos], ['popular', dinos.filter((d) => d.isPopular)]]) {
    const d = distribution(list)
    console.log(`compat ${name}:`, Object.entries(d).map(([k, v]) => `${k} ${(v * 100).toFixed(1)}%`).join(', '))
    for (const [k, v] of Object.entries(d)) assert.ok(v >= 0.12 && v <= 0.4, `${name} ${k} ${v}`)
  }
})

test('teamPairs skips people without trait-bearing dinos and sorts spicy first', () => {
  const persons = [
    { id: '1', name: 'Mira', dinoName: 'stegosaurus' },
    { id: '2', name: 'Jonas', dinoName: 'velociraptor' },
    { id: '3', name: 'Priya', dinoName: 'triceratops' },
    { id: '4', name: 'Sam', dinoName: 'someone-custom' },
    { id: '5', name: 'Egg', dinoName: null },
  ]
  const lookup = (n) => (n === 'someone-custom' ? { name: 'x' } : dinos.find((d) => d.name.toLowerCase() === n) ?? null)
  const pairs = teamPairs(persons, lookup)
  assert.equal(pairs.length, 3)
  const rank = { spicy: 0, balance: 1, kindred: 2, eras: 3 }
  for (let i = 1; i < pairs.length; i++) assert.ok(rank[pairs[i - 1].result.key] <= rank[pairs[i].result.key])
  assert.ok(pairs.every((p) => p.a.id && p.b.id && p.result.label))
  assert.deepEqual(teamPairs([], lookup), [])
})
