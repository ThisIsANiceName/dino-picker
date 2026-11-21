// Adapters for modules owned by the studio and quiz workstreams.
//
// We resolve them through import.meta.glob so this app keeps compiling (and
// degrades gracefully) while a contract file does not exist yet; Vite
// re-evaluates the glob as soon as the file appears.
import { defineAsyncComponent } from 'vue'

const dinoComponents = import.meta.glob('../dino/{DinoAvatar,DinoArt}.vue')
const libModules = import.meta.glob(['../../lib/compat.js', '../../lib/quiz/index.js'], { eager: true })

const compatMod = libModules['../../lib/compat.js'] ?? null
const quizMod = libModules['../../lib/quiz/index.js'] ?? null

/** Async DinoAvatar component, or null if the studio has not published it. */
export const DinoAvatarComponent = dinoComponents['../dino/DinoAvatar.vue']
  ? defineAsyncComponent(dinoComponents['../dino/DinoAvatar.vue'])
  : null

/** Async DinoArt component, or null if missing. */
export const DinoArtComponent = dinoComponents['../dino/DinoArt.vue']
  ? defineAsyncComponent(dinoComponents['../dino/DinoArt.vue'])
  : null

/** compatibility(dinoA, dinoB) -> { key, label, blurb, reasons } | null */
export function compatibility(a, b) {
  if (!compatMod?.compatibility || !a || !b) return null
  try {
    return compatMod.compatibility(a, b)
  } catch (err) {
    console.warn('[compat] compatibility failed', err)
    return null
  }
}

/** teamPairs(persons, getDinoByName) -> [{ a, b, result }] */
export function teamPairs(persons, getDinoByName) {
  if (!compatMod?.teamPairs) return []
  try {
    return compatMod.teamPairs(persons, getDinoByName) ?? []
  } catch (err) {
    console.warn('[compat] teamPairs failed', err)
    return []
  }
}

export const hasCompat = !!compatMod?.compatibility

/** Trait axes for bars: [{ key, label, minLabel, maxLabel }] */
export const TRAIT_AXES = quizMod?.TRAIT_AXES ?? []

/** traitProfile(dino) -> { [axisKey]: 1..5 } | null */
export function traitProfile(dino) {
  if (!quizMod?.traitProfile || !dino?.traits) return null
  try {
    return quizMod.traitProfile(dino)
  } catch (err) {
    console.warn('[quiz] traitProfile failed', err)
    return null
  }
}
