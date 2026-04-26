import { useDinoStore } from '../stores/dinoStore.js'

const QUESTIONS = [
  // ── Nutrition ────────────────────────────────────────────────────────────────
  {
    text: 'Your perfect meal is…',
    options: [
      { label: 'A massive protein feast — nothing beats fresh meat',    traits: { diet: 'carnivore', energy: 'high' } },
      { label: 'A long, leisurely graze through fields and forests',    traits: { diet: 'herbivore', energy: 'low'  } },
      { label: 'A bit of everything — variety is the spice of life',    traits: { diet: 'omnivore'                  } },
      { label: 'Freshly caught fish, straight from the water',          traits: { diet: 'carnivore', mobility: 'swimmer' } },
    ],
  },
  // ── Activity ─────────────────────────────────────────────────────────────────
  {
    text: 'Your favourite way to get moving is…',
    options: [
      { label: 'Sprinting — the faster the better',                     traits: { mobility: 'runner', energy: 'high' } },
      { label: 'A steady long-distance walk or hike',                   traits: { mobility: 'walker', energy: 'low'  } },
      { label: 'Swimming laps — smooth and powerful',                   traits: { mobility: 'swimmer', energy: 'high' } },
      { label: 'Soaring — hang-gliding or paragliding above it all',    traits: { mobility: 'flyer',  energy: 'high' } },
    ],
  },
  // ── Nutrition ────────────────────────────────────────────────────────────────
  {
    text: 'When you\'re really hungry you…',
    options: [
      { label: 'Chase down whatever\'s available, no matter the effort', traits: { diet: 'carnivore', energy: 'high' } },
      { label: 'Patiently graze — there\'s always something nearby',    traits: { diet: 'herbivore', energy: 'low'  } },
      { label: 'Raid the fridge for whatever looks good',               traits: { diet: 'omnivore',  energy: 'high' } },
      { label: 'Wait it out — you can go ages without eating',          traits: { energy: 'low',     size: 'large'  } },
    ],
  },
  // ── Activity ─────────────────────────────────────────────────────────────────
  {
    text: 'Your dream trip looks like…',
    options: [
      { label: 'Trekking through dense jungle on foot',                 traits: { mobility: 'walker',  energy: 'high' } },
      { label: 'A leisurely coastal road trip',                         traits: { mobility: 'walker',  energy: 'low'  } },
      { label: 'A sailing or diving expedition',                        traits: { mobility: 'swimmer'                 } },
      { label: 'Skydiving or a scenic flight over mountain ranges',     traits: { mobility: 'flyer',   energy: 'high' } },
    ],
  },
  // ── Nutrition ────────────────────────────────────────────────────────────────
  {
    text: 'At a buffet you head straight for…',
    options: [
      { label: 'The meat and protein station',                          traits: { diet: 'carnivore'                  } },
      { label: 'The salad bar and vegetable spreads',                   traits: { diet: 'herbivore'                  } },
      { label: 'A heaped plate mixing absolutely everything',           traits: { diet: 'omnivore'                   } },
      { label: 'The seafood and fish section',                          traits: { diet: 'carnivore', mobility: 'swimmer' } },
    ],
  },
  // ── Activity ─────────────────────────────────────────────────────────────────
  {
    text: 'Your energy levels through the day are…',
    options: [
      { label: 'Always high — I have to keep moving',                   traits: { energy: 'high', mobility: 'runner' } },
      { label: 'Steady and consistent — slow but sure',                 traits: { energy: 'low',  mobility: 'walker' } },
      { label: 'Saved up for one explosive burst of effort',            traits: { energy: 'high', size: 'large'      } },
      { label: 'Minimal — I\'m a master of conserving energy',         traits: { energy: 'low',  size: 'small'      } },
    ],
  },
  // ── Nutrition ────────────────────────────────────────────────────────────────
  {
    text: 'Your portion sizes are…',
    options: [
      { label: 'Small and frequent — I graze all day',                  traits: { diet: 'herbivore', size: 'small'   } },
      { label: 'Huge, infrequent feasts',                               traits: { diet: 'carnivore', size: 'large'   } },
      { label: 'Moderate and balanced, three times a day',              traits: { diet: 'omnivore',  size: 'medium'  } },
      { label: 'Absolutely enormous — I have a truly vast appetite',    traits: { diet: 'herbivore', size: 'massive' } },
    ],
  },
  // ── Activity ─────────────────────────────────────────────────────────────────
  {
    text: 'You prefer to exercise…',
    options: [
      { label: 'Solo and at full intensity',                            traits: { energy: 'high', mobility: 'runner' } },
      { label: 'With a group — team energy keeps you going',           traits: { energy: 'high', mobility: 'walker' } },
      { label: 'In water — easy on the joints, hard on the core',      traits: { mobility: 'swimmer', energy: 'high' } },
      { label: 'Honestly, as little as possible',                       traits: { energy: 'low'                      } },
    ],
  },
  // ── Nutrition ────────────────────────────────────────────────────────────────
  {
    text: 'Your approach to diet is…',
    options: [
      { label: 'Strictly protein-focused — no carbs, no compromise',   traits: { diet: 'carnivore'                  } },
      { label: 'Plant-based all the way',                               traits: { diet: 'herbivore'                  } },
      { label: 'Flexible and adventurous — I\'ll try anything',        traits: { diet: 'omnivore',  energy: 'high'  } },
      { label: 'Bulk calories — I need serious fuel for my size',       traits: { diet: 'herbivore', size: 'massive' } },
    ],
  },
  // ── Activity ─────────────────────────────────────────────────────────────────
  {
    text: 'On a rest day you…',
    options: [
      { label: 'Can\'t sit still — you end up going for a run anyway', traits: { energy: 'high', mobility: 'runner'  } },
      { label: 'Take a long, slow walk to clear your head',            traits: { energy: 'low',  mobility: 'walker'  } },
      { label: 'Float in water for hours — total bliss',               traits: { mobility: 'swimmer', energy: 'low'  } },
      { label: 'Don\'t move unless absolutely necessary',              traits: { energy: 'low',  size: 'large'       } },
    ],
  },
  // ── Nutrition ────────────────────────────────────────────────────────────────
  {
    text: 'Your go-to snack is…',
    options: [
      { label: 'High-protein: meat, eggs, or jerky',                   traits: { diet: 'carnivore'                  } },
      { label: 'Fruit, veg, seeds, or nuts',                           traits: { diet: 'herbivore'                  } },
      { label: 'Whatever\'s nearest — you\'re not picky',             traits: { diet: 'omnivore'                   } },
      { label: 'Nothing — saving room for the next big meal',          traits: { diet: 'carnivore', size: 'large'   } },
    ],
  },
  // ── Activity ─────────────────────────────────────────────────────────────────
  {
    text: 'Your friends describe your energy as…',
    options: [
      { label: 'Like a cheetah — fast, intense, explosive bursts',     traits: { mobility: 'runner',  energy: 'high', size: 'small'   } },
      { label: 'Like a river — slow, steady, and utterly unstoppable', traits: { mobility: 'walker',  energy: 'low',  size: 'large'   } },
      { label: 'Like a dolphin — playful and always in motion',        traits: { mobility: 'swimmer', energy: 'high'                  } },
      { label: 'Like a mountain — unmovable and perfectly content',    traits: { energy: 'low',                       size: 'massive' } },
    ],
  },
]

function sizeCategory(dino) {
  const len = parseFloat(dino.length)
  if (isNaN(len)) return 'medium'
  if (len < 3)  return 'small'
  if (len < 8)  return 'medium'
  if (len < 20) return 'large'
  return 'massive'
}

function computeResult(answers) {
  const dinoStore = useDinoStore()

  const scores = {
    diet:     { herbivore: 0, carnivore: 0, omnivore: 0 },
    size:     { small: 0, medium: 0, large: 0, massive: 0 },
    mobility: { runner: 0, flyer: 0, swimmer: 0, walker: 0 },
    energy:   { high: 0, low: 0 },
  }

  for (const answer of answers) {
    for (const [key, val] of Object.entries(answer.traits)) {
      if (scores[key]?.[val] !== undefined) scores[key][val]++
    }
  }

  const dominant = (obj) => Object.entries(obj).sort((a, b) => b[1] - a[1])[0][0]

  const dominantDiet     = dominant(scores.diet)
  const dominantSize     = dominant(scores.size)
  const dominantMobility = dominant(scores.mobility)
  const dominantEnergy   = dominant(scores.energy)

  const dinos = dinoStore.dinos
  if (!dinos.length) return null

  // 1. Filter by dominant diet
  let candidates = dinos.filter((d) => d.diet?.toLowerCase() === dominantDiet)
  if (candidates.length === 0) candidates = [...dinos]

  // 2. Apply mobility filter using dino's type field
  const mobilityTotal = Object.values(scores.mobility).reduce((a, b) => a + b, 0)
  if (mobilityTotal > 0) {
    const byMobility = candidates.filter((d) => {
      const t = (d.type ?? '').toLowerCase()
      if (dominantMobility === 'flyer')   return t.includes('fly') || t.includes('aerial') || t.includes('ptero')
      if (dominantMobility === 'swimmer') return t.includes('aquatic') || t.includes('swim') || t.includes('marine') || t.includes('semi')
      if (dominantMobility === 'runner')  return t.includes('terrestrial') && ['small', 'medium'].includes(sizeCategory(d))
      if (dominantMobility === 'walker')  return t.includes('terrestrial') && ['large', 'massive'].includes(sizeCategory(d))
      return false
    })
    if (byMobility.length > 0) candidates = byMobility
  }

  // 3. Sort by size (if no explicit size votes, infer from energy)
  const SIZE_ORDER = ['small', 'medium', 'large', 'massive']
  const hasExplicitSize = Object.values(scores.size).some((v) => v > 0)
  const targetSize = hasExplicitSize
    ? dominantSize
    : dominantEnergy === 'high' ? 'small' : 'large'
  const targetIdx = SIZE_ORDER.indexOf(targetSize)

  candidates.sort((a, b) => {
    const aIdx = SIZE_ORDER.indexOf(sizeCategory(a))
    const bIdx = SIZE_ORDER.indexOf(sizeCategory(b))
    return Math.abs(aIdx - targetIdx) - Math.abs(bIdx - targetIdx)
  })

  // Prefer a popular dino in the top 3 if available
  const top3 = candidates.slice(0, 3)
  return top3.find((d) => d.isPopular) ?? top3[0]
}

export function useQuiz() {
  return {
    questions: QUESTIONS,
    computeResult,
  }
}
