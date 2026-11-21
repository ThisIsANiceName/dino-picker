// Placement tuning for accessories. The art files and manifests stay untouched; anything
// that needs a nudge after looking at the 12-body contact sheet lives here.
//
// Units: scale is a multiplier; dx/dy are in head-widths (120 * headScale dino units),
// so a tweak reads the same on a big-headed tyrannosaur and a tiny-headed sauropod.

/** Per body type: replace manifest anchors/headAngle/headScale, add neckAngle or per-slot fit. */
export const ANCHOR_OVERRIDES = {}

/** Per slot: how wide the piece sits relative to the head width, and where its art starts (top, in 200 units). */
export const SLOT_FIT = {
  hat: { scale: 0.66, top: 14, dy: 0.04 },
  eyewear: { scale: 0.54 },
  neck: { scale: 0.74 },
}

/** Per accessory id: { scale, dx, dy, rotate, top, byBody: { <bodyType>: { scale, dx, dy, rotate } } } */
export const ACCESSORY_FIT = {
  headphones: { scale: 1.3, dy: 0.5 },
  'chef-hat': { dy: 0.05 },
  'baseball-cap': { scale: 1.3 },
  beanie: { scale: 1.3 },
  'flower-crown': { scale: 1.9 },
  necktie: { scale: 0.42 },
  medal: { scale: 0.27, dy: 0.2 },
  'star-glasses': { scale: 1.25 },
}

/** Where "extra" props sit in the avatar square (fractions of the content box; w in 512 units = fitted width). */
export const EXTRA_SPOTS = {
  default: { x: 0.2, y: 0.78, w: 150 },
  balloon: { x: 0.2, y: 0.4, w: 100 },
  'speech-bubble': { x: 0.28, y: 0.27, w: 150 },
  'coffee-cup': { x: 0.8, y: 0.77, w: 84, rotate: 6 },
  'heart-sticker': { x: 0.24, y: 0.75, w: 150, rotate: -10 },
  'sparkle-cluster': { x: 0.27, y: 0.27, w: 160 },
  guitar: { x: 0.26, y: 0.72, w: 135 },
}
