// Quiz questions. Each option adds weighted votes to trait values:
//   weights: { <traitKey>: { <value>: <weight> } }
// Trait keys/values are exactly the catalog's (diet, energy, mobility, size, social,
// temperament, defense, chronotype). Every dimension is covered by at least two questions.
// Option ids are 'a'..'d' (keys 1-4 / A-D in the UI). Question ids are stable: they are
// persisted in person.quiz.answers as { q, a }.

const o = (id, label, weights) => ({ id, label, weights })

export const QUESTIONS = [
  {
    id: 'morning',
    text: 'It is 7:30 on a Tuesday morning. Where are you?',
    options: [
      o('a', 'Already back from a run, slightly smug about it', { chronotype: { dawn: 2 }, energy: { high: 1.5 } }),
      o('b', 'At your desk, first coffee, calendar open', { chronotype: { day: 2 }, energy: { high: 0.5 } }),
      o('c', 'Answering Slack from bed with your eyes closed', { chronotype: { dusk: 1.5, night: 0.5 }, energy: { low: 1 } }),
      o('d', 'Asleep. This hour is a rumour.', { chronotype: { night: 2 }, energy: { low: 1.5 } }),
    ],
  },
  {
    id: 'lunch',
    text: 'Someone is ordering team lunch. What do you hope they pick?',
    options: [
      o('a', 'A grill. Nobody asks about the vegetarian option.', { diet: { carnivore: 2 } }),
      o('b', 'A big green spread with seeds on everything', { diet: { herbivore: 2 } }),
      o('c', 'A buffet. All of it. Twice.', { diet: { omnivore: 2 } }),
      o('d', 'A sushi counter, taken very seriously', { diet: { carnivore: 1.5 }, mobility: { swimmer: 1 } }),
    ],
  },
  {
    id: 'weekend',
    text: 'You get a free Saturday and a travel pass. You…',
    options: [
      o('a', 'Run a trail race nobody signed you up for', { mobility: { runner: 2 }, energy: { high: 1 } }),
      o('b', 'Hike with a backpack and an optimistic map', { mobility: { walker: 2 }, temperament: { curious: 0.5 } }),
      o('c', 'Book a boat, a lake and absolutely no plans', { mobility: { swimmer: 2 }, energy: { low: 0.5 } }),
      o('d', 'Take the cable car up and stare at the whole valley', { mobility: { flyer: 2 }, defense: { flight: 0.5 } }),
    ],
  },
  {
    id: 'workspace',
    text: 'Your ideal workspace is…',
    options: [
      o('a', 'A closed door, headphones and one loyal plant', { social: { solo: 2 } }),
      o('b', 'A quiet corner with one trusted desk buddy', { social: { pair: 2 } }),
      o('c', 'Open plan, buzzing, people walking past all day', { social: { herd: 2 } }),
      o('d', 'Anywhere with a window and a decent view of the door', { social: { solo: 1 }, defense: { stealth: 0.5, flight: 0.5 } }),
    ],
  },
  {
    id: 'lift',
    text: 'You are in a packed lift. How much of it are you?',
    options: [
      o('a', 'As little as physically possible', { size: { tiny: 2 }, defense: { stealth: 0.5 } }),
      o('b', 'A polite, normal amount', { size: { small: 1, medium: 1 } }),
      o('c', 'More than my share, and I will not apologise', { size: { large: 2 }, temperament: { bold: 0.5 } }),
      o('d', 'The whole lift. Mind the doors.', { size: { colossal: 2 } }),
    ],
  },
  {
    id: 'parking',
    text: 'Someone takes the parking spot you were about to take. You…',
    options: [
      o('a', 'Wait behind them. Calmly. For as long as it takes.', { temperament: { stubborn: 2 } }),
      o('b', 'Shrug. Somewhere there is a nicer spot.', { temperament: { calm: 2 } }),
      o('c', 'Have a word. Loudly, and with eye contact.', { temperament: { fierce: 2 } }),
      o('d', 'Wonder who they are and why they were in such a hurry', { temperament: { curious: 2 } }),
    ],
  },
  {
    id: 'trouble',
    text: 'A project goes sideways. Your first instinct is to…',
    options: [
      o('a', 'Move now, move fast, fix it before anyone notices', { defense: { speed: 2 } }),
      o('b', 'Build a fortress of process, docs and guardrails', { defense: { armor: 2 } }),
      o('c', 'Argue your case with your sharpest points', { defense: { weapons: 2 }, temperament: { bold: 0.5 } }),
      o('d', 'Quietly vanish until the dust settles', { defense: { stealth: 2 } }),
    ],
  },
  {
    id: 'battery',
    text: 'How does your battery behave over a full day?',
    options: [
      o('a', 'Full from breakfast to bedtime, then some', { energy: { high: 2 } }),
      o('b', 'A steady glow with a dip after lunch', { energy: { low: 1, high: 0.5 } }),
      o('c', 'Sprint, collapse, repeat', { energy: { high: 1.5 }, mobility: { runner: 1 } }),
      o('d', 'Eco mode. Every step is a decision.', { energy: { low: 2 } }),
    ],
  },
  {
    id: 'best-hour',
    text: 'The best hour of your day is…',
    options: [
      o('a', 'Sunrise, before anyone else has opinions', { chronotype: { dawn: 2 } }),
      o('b', 'Mid-morning, when everything is humming', { chronotype: { day: 2 } }),
      o('c', 'Golden hour, when the work is done', { chronotype: { dusk: 2 } }),
      o('d', 'After midnight, when the world goes quiet', { chronotype: { night: 2 } }),
    ],
  },
  {
    id: 'rough-week',
    text: 'A friend is having a rough week. You…',
    options: [
      o('a', 'Bring snacks and sit with them for as long as it takes', { temperament: { gentle: 2 }, social: { pair: 1 } }),
      o('b', 'Gather the whole gang and turn up together', { social: { herd: 2 }, temperament: { bold: 0.5 } }),
      o('c', 'Send exactly the right message, then give them space', { social: { solo: 1.5 }, temperament: { calm: 1 } }),
      o('d', 'Drag them somewhere new to take their mind off it', { temperament: { curious: 1.5 }, social: { pair: 1 } }),
    ],
  },
  {
    id: 'superpower',
    text: 'Pick a superpower, no catches.',
    options: [
      o('a', 'Invisibility', { defense: { stealth: 2 }, size: { tiny: 1 } }),
      o('b', 'Super speed', { defense: { speed: 2 }, mobility: { runner: 1 } }),
      o('c', 'Flight', { defense: { flight: 2 }, mobility: { flyer: 1.5 } }),
      o('d', 'Growing to the size of a building', { defense: { size: 2 }, size: { colossal: 1 } }),
    ],
  },
  {
    id: 'commute',
    text: 'Your dream commute is…',
    options: [
      o('a', 'A run. Obviously.', { mobility: { runner: 2 } }),
      o('b', 'A long walk, the scenic way, with a podcast', { mobility: { walker: 2 } }),
      o('c', 'A ferry, with water views and nowhere to be', { mobility: { swimmer: 2 } }),
      o('d', 'A window seat, ideally somewhere above the clouds', { mobility: { flyer: 2 } }),
    ],
  },
  {
    id: 'brainstorm',
    text: 'In a team brainstorm, you are the one who…',
    options: [
      o('a', 'Asks the wild question nobody planned for', { temperament: { curious: 2 } }),
      o('b', 'Settles the room when it gets heated', { temperament: { calm: 1, gentle: 1 }, social: { herd: 0.5 } }),
      o('c', 'Says "let us just decide" and then decides', { temperament: { bold: 2 }, social: { herd: 0.5 } }),
      o('d', 'Makes the same point a fourth time, kindly but firmly', { temperament: { stubborn: 2 } }),
    ],
  },
  {
    id: 'midnight-fridge',
    text: 'Midnight. You open the fridge and hope to find…',
    options: [
      o('a', 'Last night\'s steak, cold, no plate', { diet: { carnivore: 2 } }),
      o('b', 'Half a cucumber, some hummus, a lonely tomato', { diet: { herbivore: 2 } }),
      o('c', 'Whatever is there, assembled into something ambitious', { diet: { omnivore: 2 } }),
      o('d', 'A little of everything, eaten standing up', { diet: { omnivore: 1.5, herbivore: 0.5 }, energy: { high: 0.5 } }),
    ],
  },
]
