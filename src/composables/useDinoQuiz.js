import { useDinoStore } from '../stores/dinoStore.js'

const QUESTIONS = [
  {
    text: 'At a party, you are most likely to…',
    options: [
      { label: 'Hunt for the best snacks alone',              traits: { diet: 'carnivore', style: 'solitary' } },
      { label: 'Graze the buffet with your whole squad',      traits: { diet: 'herbivore', style: 'pack' } },
      { label: 'Do whatever everyone else is doing',          traits: { diet: 'omnivore',  style: 'pack' } },
      { label: 'Leave early and find a quiet corner',         traits: { style: 'solitary', size: 'small' } },
    ],
  },
  {
    text: 'Your ideal weekend looks like…',
    options: [
      { label: 'Sprinting through a forest trail',            traits: { diet: 'carnivore', size: 'medium' } },
      { label: 'A long, peaceful countryside walk',           traits: { diet: 'herbivore', size: 'large' } },
      { label: 'Staying home with snacks and a movie',        traits: { diet: 'herbivore', style: 'slow-and-steady' } },
      { label: 'An underground cave adventure',               traits: { diet: 'omnivore',  style: 'ambush' } },
    ],
  },
  {
    text: 'When something goes wrong at work, you…',
    options: [
      { label: 'Charge straight at the problem',              traits: { diet: 'carnivore', style: 'ambush' } },
      { label: 'Rally the team and tackle it together',       traits: { style: 'pack',     diet: 'omnivore' } },
      { label: 'Take your time and plan carefully',           traits: { style: 'slow-and-steady', size: 'large' } },
      { label: 'Adapt on the fly',                            traits: { diet: 'omnivore',  size: 'medium' } },
    ],
  },
  {
    text: 'Your fashion sense is best described as…',
    options: [
      { label: 'Bold and spiky',                              traits: { diet: 'carnivore', style: 'solitary' } },
      { label: 'Armored and dependable',                      traits: { diet: 'herbivore', size: 'large' } },
      { label: 'Long, elegant, understated',                  traits: { diet: 'herbivore', style: 'slow-and-steady' } },
      { label: 'Compact and agile',                           traits: { diet: 'carnivore', size: 'medium' } },
    ],
  },
  {
    text: 'Favorite movie genre?',
    options: [
      { label: 'Thriller / Action',                           traits: { diet: 'carnivore', style: 'ambush' } },
      { label: 'Documentary / Nature',                        traits: { diet: 'herbivore', style: 'slow-and-steady' } },
      { label: 'Comedy with friends',                         traits: { style: 'pack',     diet: 'omnivore' } },
      { label: 'Sci-Fi from a forgotten era',                 traits: { era: 'triassic',   style: 'solitary' } },
    ],
  },
  {
    text: 'Pick your superpower:',
    options: [
      { label: 'Super speed',                                 traits: { size: 'small',     diet: 'carnivore' } },
      { label: 'Invincible armor',                            traits: { size: 'large',     diet: 'herbivore' } },
      { label: 'Mind control',                                traits: { style: 'solitary', style2: 'ambush' } },
      { label: 'Healing factor',                              traits: { diet: 'omnivore',  style: 'pack' } },
    ],
  },
  {
    text: 'How do you handle a long queue?',
    options: [
      { label: 'Push to the front — time is prey',           traits: { diet: 'carnivore', style: 'ambush' } },
      { label: 'Queue patiently; good things take time',     traits: { diet: 'herbivore', style: 'slow-and-steady' } },
      { label: 'Chat with everyone around you',              traits: { diet: 'omnivore',  style: 'pack' } },
      { label: 'Go find a different route entirely',         traits: { style: 'solitary', size: 'medium' } },
    ],
  },
]

// Maps the dominant diet/size/style score to a dino that best matches
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

  // Accumulate trait counts
  const scores = {
    diet:  { herbivore: 0, carnivore: 0, omnivore: 0 },
    size:  { small: 0, medium: 0, large: 0, massive: 0 },
    era:   { triassic: 0, jurassic: 0, cretaceous: 0 },
    style: { solitary: 0, pack: 0, ambush: 0, 'slow-and-steady': 0 },
  }

  for (const answer of answers) {
    const { traits } = answer
    if (traits.diet  && scores.diet[traits.diet]  !== undefined) scores.diet[traits.diet]++
    if (traits.size  && scores.size[traits.size]  !== undefined) scores.size[traits.size]++
    if (traits.era   && scores.era[traits.era]    !== undefined) scores.era[traits.era]++
    if (traits.style && scores.style[traits.style] !== undefined) scores.style[traits.style]++
  }

  const dominant = (obj) => Object.entries(obj).sort((a, b) => b[1] - a[1])[0][0]

  const dominantDiet  = dominant(scores.diet)
  const dominantSize  = dominant(scores.size)
  const dominantEra   = dominant(scores.era)

  const dinos = dinoStore.dinos
  if (!dinos.length) return null

  // Filter by diet first, then era
  let candidates = dinos.filter((d) => d.diet?.toLowerCase() === dominantDiet)
  if (candidates.length === 0) candidates = dinos

  // Filter by era if we have a strong era signal
  const eraMax = Math.max(...Object.values(scores.era))
  if (eraMax > 0) {
    const byEra = candidates.filter((d) => d.period?.toLowerCase() === dominantEra)
    if (byEra.length > 0) candidates = byEra
  }

  // Sort by closest size match
  const SIZE_ORDER = ['small', 'medium', 'large', 'massive']
  const targetIdx = SIZE_ORDER.indexOf(dominantSize)
  candidates.sort((a, b) => {
    const aIdx = SIZE_ORDER.indexOf(sizeCategory(a))
    const bIdx = SIZE_ORDER.indexOf(sizeCategory(b))
    return Math.abs(aIdx - targetIdx) - Math.abs(bIdx - targetIdx)
  })

  // Return top result (prefer popular if tied in size)
  const top3 = candidates.slice(0, 3)
  return top3.find((d) => d.isPopular) ?? top3[0]
}

export function useQuiz() {
  return {
    questions: QUESTIONS,
    computeResult,
  }
}
