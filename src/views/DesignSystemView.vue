<!--
  DesignSystemView: kitchen sink for the "Specimen Sticker" design system.
  Route: /#/design-system. Renders full-bleed over the legacy shell on purpose
  (it also previews the new top bar and mobile tab bar).
-->
<script setup>
import { ref, computed, onMounted } from 'vue'
import {
  UiBadge, UiBottomSheet, UiButton, UiCard, UiChip, UiColorPicker, UiColorSwatch, UiEmptyState,
  UiField, UiIcon, UiIconButton, UiInput, UiModal, UiProgress, UiSegmented, UiSelect, UiSkeleton,
  UiSlider, UiStatBar, UiTabs, UiTextarea, UiToast, UiTooltip, ICON_NAMES, contrastRatio,
  prefersReducedMotion, setMotionPreference,
} from '../components/ui/index.js'
import { useToast } from '../composables/useToast.js'

const toast = useToast()

// Optional art from the asset agents (may be empty while they work)
const dinoArt = import.meta.glob('../assets/art/dinos/*.svg', { eager: true, query: '?raw', import: 'default' })
const spotArt = import.meta.glob('../assets/art/kit/**/{empty-roster,empty-search,quiz-hero,error-meteor}*.svg', {
  eager: true, query: '?url', import: 'default',
})
const rexSvg = computed(() => dinoArt['../assets/art/dinos/tyrannosaur.svg'] ?? Object.values(dinoArt)[0] ?? '')
const raptorSvg = computed(() => dinoArt['../assets/art/dinos/raptor.svg'] ?? rexSvg.value)
const emptyRosterUrl = computed(() => Object.entries(spotArt).find(([k]) => k.includes('empty-roster'))?.[1] ?? '')

const sections = [
  { id: 'colour', label: 'Colour' },
  { id: 'type', label: 'Type' },
  { id: 'shape', label: 'Shape and depth' },
  { id: 'motion', label: 'Motion' },
  { id: 'icons', label: 'Icons' },
  { id: 'buttons', label: 'Buttons' },
  { id: 'forms', label: 'Forms' },
  { id: 'colourpick', label: 'Colour picking' },
  { id: 'labels', label: 'Badges and chips' },
  { id: 'nav', label: 'Tabs and segments' },
  { id: 'cards', label: 'Cards' },
  { id: 'data', label: 'Traits and progress' },
  { id: 'overlays', label: 'Overlays and feedback' },
  { id: 'empty', label: 'Empty and loading' },
]

// ── Colour data ─────────────────────────────────────────────
const semantic = [
  { name: 'bg', cls: 'bg-bg', note: 'Lichen paper' },
  { name: 'surface', cls: 'bg-surface', note: 'Bone card' },
  { name: 'surface-sunken', cls: 'bg-surface-sunken', note: 'Wells, stage' },
  { name: 'ink', cls: 'bg-ink', note: '13.9 : 1' },
  { name: 'ink-muted', cls: 'bg-ink-muted', note: '7.0 : 1' },
  { name: 'ink-subtle', cls: 'bg-ink-subtle', note: '4.7 : 1' },
  { name: 'line-strong', cls: 'bg-line-strong', note: 'UI edges 3.4 : 1' },
  { name: 'primary', cls: 'bg-primary', note: 'Resin amber' },
  { name: 'accent', cls: 'bg-accent', note: 'Magma' },
  { name: 'focus', cls: 'bg-focus', note: 'Focus ring' },
  { name: 'success', cls: 'bg-success', note: '' },
  { name: 'danger', cls: 'bg-danger', note: '' },
]
const scales = {
  lichen: ['#F7F8F1', '#EEF0E5', '#E2E5D6', '#CDD2BE', '#A9B09B', '#7F8875', '#5D6657', '#434B40', '#2D342C', '#1E2420', '#141915'],
  jungle: ['#E8F3EF', '#C9E3DA', '#97C8B8', '#5FA893', '#368873', '#1F6B5C', '#17574C', '#12463F', '#0F3934', '#0B2B28', '#071D1B'],
  resin: ['#FFF7E6', '#FFEBC2', '#FFD98A', '#FBC458', '#F5AE36', '#E8951A', '#C47410', '#9A5710', '#743F12', '#4F2C0E'],
  magma: ['#FDEEF2', '#FAD3DE', '#F4A3BA', '#EC7394', '#E34E77', '#D2335F', '#B0234D', '#8B1C3E', '#661630', '#430F20'],
  lagoon: ['#EAF5FA', '#CBE6F2', '#97CCE4', '#5FADD1', '#3A91BA', '#27779D', '#1F5F7E', '#1A4B63', '#153A4C', '#0F2835'],
  fern: ['#EEF7EC', '#D4ECCF', '#A9D8A0', '#7BBF70', '#56A44C', '#3E8A37', '#316F2D', '#285826', '#1F421F', '#152D16'],
  plum: ['#F2F0FA', '#DEDAF2', '#BEB6E4', '#9A8ED2', '#7A6CBE', '#6254A6', '#4E4388', '#3D356A', '#2D284E', '#1E1B33'],
}
const steps = (n) => (n === 11 ? [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950] : [50, 100, 200, 300, 400, 500, 600, 700, 800, 900])
const textOn = (hex) => (contrastRatio(hex, '#1E2420') > contrastRatio(hex, '#FFFFFF') ? '#1E2420' : '#FFFFFF')

const fonts = [
  { family: 'Caprasimo', cls: 'font-display', role: 'Display: headings, names, big numbers', sample: 'Trudi the Triceratops', weights: '400' },
  { family: 'Schibsted Grotesk', cls: 'font-sans', role: 'UI and body text', sample: 'Steady under pressure, suspicious of stairs.', weights: '400 500 600 700 800, 400 italic' },
  { family: 'Graduate', cls: 'font-varsity', role: 'Shirt Studio: varsity', sample: 'DINO DEPT. 26', weights: '400' },
  { family: 'Fredoka', cls: 'font-rounded font-semibold', role: 'Shirt Studio: rounded, friendly', sample: 'Snack-powered herbivore', weights: '500 700' },
  { family: 'Big Shoulders Display', cls: 'font-condensed font-black', role: 'Shirt Studio: condensed', sample: 'TEAM OFFSITE 2026', weights: '700 900' },
]
const typeScale = [
  { token: 'display-2xl', px: 76 }, { token: 'display-xl', px: 60 }, { token: 'display-lg', px: 48 },
  { token: 'display-md', px: 38 }, { token: 'display-sm', px: 30 }, { token: 'display-xs', px: 24 },
]
const bodyScale = [
  { token: 'xl', px: 20 }, { token: 'lg', px: 18 }, { token: 'base', px: 16 }, { token: 'sm', px: 14 }, { token: 'xs', px: 12 }, { token: '2xs', px: 11 },
]

// ── Motion demo ─────────────────────────────────────────────
const motionDemos = [
  { name: 'pop-in', dur: '360ms spring', use: 'Selection, new item' },
  { name: 'sticker-slap', dur: '420ms spring', use: 'Avatar saved, card added' },
  { name: 'stamp', dur: '480ms spring', use: 'Saved, Applied badge' },
  { name: 'wiggle', dur: '400ms', use: 'Randomise, invalid' },
]
const playing = ref({})
function play(name) {
  playing.value = { ...playing.value, [name]: false }
  requestAnimationFrame(() => requestAnimationFrame(() => (playing.value = { ...playing.value, [name]: true })))
}
const hatch = ref('idle') // idle | wobble | crack | done
let hatchTimers = []
function runHatch() {
  hatchTimers.forEach(clearTimeout)
  if (prefersReducedMotion()) { hatch.value = 'done'; return }
  hatch.value = 'idle'
  requestAnimationFrame(() => {
    hatch.value = 'wobble'
    hatchTimers = [setTimeout(() => (hatch.value = 'crack'), 1200), setTimeout(() => (hatch.value = 'done'), 1300)]
  })
}
const confetti = Array.from({ length: 14 }, (_, i) => ({
  left: 8 + ((i * 53) % 84),
  drift: ((i % 2 ? 1 : -1) * (10 + (i * 7) % 40)) + 'px',
  delay: (i % 5) * 60,
  color: ['#F5AE36', '#D2335F', '#3A91BA', '#56A44C', '#7A6CBE'][i % 5],
  shape: i % 3,
}))
const reduceMotion = ref(false)
onMounted(() => (reduceMotion.value = document.documentElement.dataset.motion === 'reduce'))
function toggleMotion() {
  reduceMotion.value = !reduceMotion.value
  setMotionPreference(reduceMotion.value ? 'reduce' : null)
}

// ── Controls state ──────────────────────────────────────────
const loading = ref(false)
function fakeSave() {
  loading.value = true
  setTimeout(() => { loading.value = false; toast.success('Avatar saved', 'Mira looks fantastic in the top hat.') }, 1200)
}
const name = ref('Mira Okafor')
const nameError = computed(() => (name.value.trim() ? '' : 'Give them a name first.'))
const team = ref('Data Platform')
const note = ref('Async first. Ping me before 11, after lunch I am in deep-work mode. Bring snacks to retros.')
const role = ref('')
const search = ref('stego')
const size = ref(70)
const rotate = ref(-4)
const side = ref('front')
const exportSize = ref(512)
const crop = ref('circle')

const bodyColour = ref('#56A44C')
const bellyColour = ref('#FFEBC2')
const accentColour = ref('#D2335F')
const textColour = ref('#1F6B5C')
const garment = ref('#1E2420')
const garments = [
  { hex: '#FFFFFF', name: 'White' }, { hex: '#1E2420', name: 'Black' }, { hex: '#1D2B4F', name: 'Navy' },
  { hex: '#B9BCB5', name: 'Heather grey' }, { hex: '#24452F', name: 'Forest green' },
]
const bodyPresets = [
  { hex: '#56A44C', name: 'Fern' }, { hex: '#3A91BA', name: 'Lagoon' }, { hex: '#E8951A', name: 'Resin' },
  { hex: '#D2335F', name: 'Magma' }, { hex: '#7A6CBE', name: 'Plum' }, { hex: '#7F8875', name: 'Lichen' },
]
const palettePresets = [
  { name: 'Moss and cream', colors: ['#56A44C', '#FFEBC2', '#D2335F'] },
  { name: 'Lagoon', colors: ['#3A91BA', '#CBE6F2', '#F5AE36'] },
  { name: 'Sunset', colors: ['#E8951A', '#FFF7E6', '#7A6CBE'] },
  { name: 'Volcano', colors: ['#B0234D', '#F4A3BA', '#1E2420'] },
]
const palette = ref(0)
function applyPalette(i) {
  palette.value = i
  ;[bodyColour.value, bellyColour.value, accentColour.value] = palettePresets[i].colors
}

const filters = ref({ herbivore: true, carnivore: false, omnivore: false, jurassic: false, cretaceous: true })
const activeFilters = ref(['Cretaceous', 'Under 5 m'])

const pageTab = ref('about')
const studioTab = ref('colours')
const pageTabs = [
  { id: 'about', label: 'About', icon: 'user' },
  { id: 'traits', label: 'Traits', icon: 'chart' },
  { id: 'team', label: 'Compatibility', icon: 'users', badge: 3 },
]
const studioTabs = [
  { id: 'colours', label: 'Colours', icon: 'palette' },
  { id: 'gear', label: 'Gear', icon: 'sparkles' },
  { id: 'scene', label: 'Scene', icon: 'image' },
  { id: 'frame', label: 'Frame', icon: 'layers' },
]

const quizStep = ref(7)
const modalOpen = ref(false)
const confirmOpen = ref(false)
const sheetOpen = ref(false)
const dockSnap = ref('half')
const showDock = ref(false)

const iconQuery = ref('')
const icons = computed(() => ICON_NAMES.filter((n) => n.includes(iconQuery.value.toLowerCase().trim())))

const avatarStyle = computed(() => ({
  '--dino-body': bodyColour.value,
  '--dino-belly': bellyColour.value,
  '--dino-accent': accentColour.value,
  '--dino-shade': 'color-mix(in srgb, ' + bodyColour.value + ' 70%, #0B2B28)',
}))
</script>

<!-- Tailwind safelist for dynamic classes below:
  text-display-2xl text-display-xl text-display-lg text-display-md text-display-sm text-display-xs
  text-xl text-lg text-base text-sm text-xs text-2xs
  rounded-xs rounded-sm rounded-md rounded-lg rounded-xl rounded-2xl rounded-full rounded-blob
  shadow-sticker-sm shadow-sticker shadow-sticker-lg shadow-diecut-sm shadow-diecut shadow-lift
  animate-pop-in animate-sticker-slap animate-stamp animate-wiggle
-->
<template>
  <div class="ds fixed inset-0 z-[45] overflow-y-auto bg-bg text-ink font-sans" style="scroll-padding-top: 88px">
    <!-- ── Preview of the new top bar ───────────────────────────── -->
    <header class="theme-jungle sticky top-0 z-nav bg-bg/95 backdrop-blur border-b-[1.5px] border-jungle-950">
      <div class="mx-auto max-w-[1240px] h-16 px-4 sm:px-6 flex items-center gap-6">
        <RouterLink to="/" class="flex items-center gap-2.5 shrink-0" aria-label="Dino Selector home">
          <span class="w-9 h-9 rounded-full bg-primary border-[1.5px] border-jungle-950 shadow-sticker-sm grid place-items-center text-on-primary">
            <UiIcon name="egg" :size="20" />
          </span>
          <span class="font-display text-xl leading-none">Dino Selector</span>
        </RouterLink>
        <nav aria-label="Main" class="hidden md:flex items-center gap-1 text-[0.9375rem] font-semibold">
          <a v-for="(l, i) in ['Team', 'Quiz', 'Dinopedia', 'Insights']" :key="l" href="#"
             :class="['px-3 h-9 inline-flex items-center rounded-full', i === 0 ? 'bg-ink text-ink-inverse' : 'text-ink-muted hover:text-ink']"
             :aria-current="i === 0 ? 'page' : undefined" @click.prevent>{{ l }}</a>
        </nav>
        <div class="ml-auto flex items-center gap-2">
          <UiBadge variant="solid" size="sm" class="hidden sm:inline-flex !bg-primary !text-on-primary !border-jungle-950">Design system</UiBadge>
          <UiButton size="sm" icon="plus" class="hidden sm:inline-flex">Add teammate</UiButton>
        </div>
      </div>
    </header>

    <!-- ── Hero ───────────────────────────────────────────────── -->
    <section class="theme-jungle bg-bg border-b-[1.5px] border-jungle-950 overflow-hidden">
      <div class="mx-auto max-w-[1240px] px-4 sm:px-6 py-12 sm:py-16 grid md:grid-cols-[1.15fr_1fr] gap-10 items-center">
        <div>
          <p class="text-ink-subtle font-semibold mb-4">Dino Selector design system, v1</p>
          <h1 class="font-display text-display-lg sm:text-display-2xl text-ink max-w-[12ch]">Specimen Sticker</h1>
          <p class="mt-5 text-lg text-ink-muted max-w-[46ch]">
            Natural-history poster colours, die-cut sticker physics. Paper by day, jungle at the stage.
            Everything here is a token or a <code class="text-primary font-semibold">Ui*</code> component the builders can use as is.
          </p>
          <div class="mt-7 flex flex-wrap gap-3">
            <UiButton href="#buttons" icon="sparkles">See components</UiButton>
            <UiButton variant="ghost" href="#colour" class="!border-ink-subtle hover:!bg-white/10">Tokens</UiButton>
          </div>
        </div>
        <div class="relative h-[300px] sm:h-[360px]" aria-hidden="true">
          <div class="absolute left-[6%] top-[4%] w-[58%] aspect-square rounded-full bg-primary border-[1.5px] border-jungle-950" />
          <div class="absolute right-[4%] bottom-[2%] w-[26%] aspect-square rounded-blob bg-accent border-[1.5px] border-jungle-950" />
          <div class="absolute left-[14%] top-[10%] w-[62%] aspect-square sticker bg-[#FFF7E6] overflow-hidden" style="--tilt:-5deg" :style="avatarStyle">
            <div v-if="rexSvg" data-art class="w-full h-full" v-html="rexSvg" />
            <div v-else class="w-full h-full grid place-items-center text-jungle-800"><UiIcon name="egg" :size="96" /></div>
          </div>
          <div class="absolute right-[2%] top-[0%] w-[34%] aspect-square sticker bg-lagoon-100 overflow-hidden" style="--tilt:7deg; --dino-body:#7A6CBE; --dino-belly:#DEDAF2; --dino-accent:#F5AE36; --dino-shade:#4E4388">
            <div v-if="raptorSvg" data-art class="w-full h-full" v-html="raptorSvg" />
          </div>
          <div class="absolute left-[2%] bottom-[6%] sticker bg-[#FFF7E6] px-4 py-2.5 font-display text-lg text-lichen-900" style="--tilt:-3deg">Apex snacker</div>
          <div class="absolute right-[10%] bottom-[30%] sticker bg-primary px-3 py-1.5 font-condensed font-black text-xl tracking-wide text-lichen-900" style="--tilt:4deg">TEAM 26</div>
        </div>
      </div>
    </section>

    <div class="mx-auto max-w-[1240px] px-4 sm:px-6 py-10 lg:grid lg:grid-cols-[200px_1fr] lg:gap-12">
      <!-- TOC -->
      <nav aria-label="Design system sections" class="hidden lg:block">
        <ol class="sticky top-24 space-y-0.5 text-sm">
          <li v-for="s in sections" :key="s.id">
            <a :href="`#${s.id}`" class="block px-3 py-1.5 rounded-sm text-ink-muted hover:text-ink hover:bg-ink/[0.06] font-medium">{{ s.label }}</a>
          </li>
          <li class="pt-4 px-3">
            <button type="button" class="text-sm font-semibold link" :aria-pressed="String(reduceMotion)" @click="toggleMotion">
              {{ reduceMotion ? 'Turn motion back on' : 'Reduce motion' }}
            </button>
          </li>
        </ol>
      </nav>

      <main class="min-w-0 space-y-20 pb-24">
        <!-- ── Colour ─────────────────────────────────────────── -->
        <section id="colour" aria-labelledby="h-colour">
          <h2 id="h-colour" class="font-display text-display-md">Colour</h2>
          <p class="mt-2 text-ink-muted max-w-[60ch]">Semantic tokens are CSS variables, so <code>.theme-jungle</code> flips any subtree to the dark scope. Ink ratios are measured on <code>bg</code>.</p>

          <div class="mt-8 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">
            <div v-for="c in semantic" :key="c.name" class="flex items-center gap-3">
              <span :class="['w-14 h-14 rounded-md border-[1.5px] border-ink shrink-0', c.cls]" />
              <span class="min-w-0">
                <span class="block font-semibold text-sm truncate">{{ c.name }}</span>
                <span class="block text-xs text-ink-subtle">{{ c.note }}</span>
              </span>
            </div>
          </div>

          <div class="mt-10 space-y-3">
            <div v-for="(hexes, scale) in scales" :key="scale" class="grid grid-cols-[72px_1fr] items-center gap-3">
              <span class="text-sm font-semibold capitalize">{{ scale }}</span>
              <div class="flex rounded-md overflow-hidden border-[1.5px] border-ink">
                <span v-for="(hex, i) in hexes" :key="hex" class="flex-1 h-11 flex items-end p-1 text-[10px] font-semibold tabular" :style="{ background: hex, color: textOn(hex) }">
                  <span class="hidden sm:inline">{{ steps(hexes.length)[i] }}</span>
                </span>
              </div>
            </div>
          </div>

          <div class="mt-10 grid sm:grid-cols-2 gap-6">
            <UiCard variant="flat">
              <h3 class="font-sans font-bold text-base mb-3">Diet</h3>
              <div class="flex flex-wrap gap-2">
                <UiBadge v-for="d in ['herbivore', 'carnivore', 'omnivore', 'piscivore', 'insectivore']" :key="d" variant="diet" :value="d" dot />
              </div>
            </UiCard>
            <UiCard variant="flat">
              <h3 class="font-sans font-bold text-base mb-3">Period</h3>
              <div class="flex flex-wrap gap-2">
                <UiBadge v-for="p in ['triassic', 'jurassic', 'cretaceous']" :key="p" variant="period" :value="p" dot />
              </div>
            </UiCard>
          </div>
        </section>

        <!-- ── Type ───────────────────────────────────────────── -->
        <section id="type" aria-labelledby="h-type">
          <h2 id="h-type" class="font-display text-display-md">Type</h2>
          <p class="mt-2 text-ink-muted max-w-[60ch]">All self-hosted with @fontsource. Use these exact family names on canvas in the Shirt Studio.</p>
          <div class="mt-8 divide-y-[1.5px] divide-line border-y-[1.5px] border-line">
            <div v-for="f in fonts" :key="f.family" class="py-5 grid md:grid-cols-[220px_1fr] gap-2 md:gap-6 items-baseline">
              <div>
                <p class="font-bold text-sm">{{ f.family }}</p>
                <p class="text-xs text-ink-subtle mt-0.5">{{ f.role }}</p>
                <p class="text-xs text-ink-subtle tabular">{{ f.weights }}</p>
              </div>
              <p :class="[f.cls, 'text-display-xs sm:text-display-sm leading-tight text-ink break-words']">{{ f.sample }}</p>
            </div>
          </div>
          <div class="mt-10 grid md:grid-cols-[1.4fr_1fr] gap-10">
            <div class="space-y-3">
              <div v-for="t in typeScale" :key="t.token" class="flex items-baseline gap-4">
                <span class="w-24 shrink-0 text-xs text-ink-subtle tabular">{{ t.token }} · {{ t.px }}</span>
                <span :class="['font-display truncate', `text-${t.token}`]">Stegosaurus</span>
              </div>
            </div>
            <div class="space-y-3">
              <div v-for="t in bodyScale" :key="t.token" class="flex items-baseline gap-4">
                <span class="w-16 shrink-0 text-xs text-ink-subtle tabular">{{ t.token }} · {{ t.px }}</span>
                <span :class="[`text-${t.token}`]">Plated, patient, quietly armoured.</span>
              </div>
            </div>
          </div>
        </section>

        <!-- ── Shape ──────────────────────────────────────────── -->
        <section id="shape" aria-labelledby="h-shape">
          <h2 id="h-shape" class="font-display text-display-md">Shape and depth</h2>
          <p class="mt-2 text-ink-muted max-w-[60ch]">Depth is a hard offset in deep jungle ink, never a grey blur. Soft <code>shadow-lift</code> is reserved for overlays.</p>
          <div class="mt-8 flex flex-wrap gap-5 items-end">
            <div v-for="r in ['xs', 'sm', 'md', 'lg', 'xl', '2xl', 'full', 'blob']" :key="r" class="text-center">
              <div :class="['w-20 h-20 bg-primary-soft border-[1.5px] border-ink', `rounded-${r}`]" />
              <p class="mt-2 text-xs font-semibold">{{ r }}</p>
            </div>
          </div>
          <div class="mt-10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-6">
            <div v-for="s in ['sticker-sm', 'sticker', 'sticker-lg', 'diecut-sm', 'diecut', 'lift']" :key="s" class="text-center">
              <div :class="['h-20 rounded-lg bg-surface-raised', s.startsWith('sticker') ? 'border-[1.5px] border-ink' : '', `shadow-${s}`]" />
              <p class="mt-3 text-xs font-semibold">shadow-{{ s }}</p>
            </div>
          </div>
        </section>

        <!-- ── Motion ─────────────────────────────────────────── -->
        <section id="motion" aria-labelledby="h-motion">
          <h2 id="h-motion" class="font-display text-display-md">Motion</h2>
          <p class="mt-2 text-ink-muted max-w-[60ch]">
            Motion answers an action. Durations: instant 80, fast 140, base 220, slow 360, reveal 700 ms. Easings: out, in-out, spring.
            All of it collapses under reduced motion (OS setting or the in-app toggle).
          </p>
          <div class="mt-8 grid md:grid-cols-[1fr_320px] gap-6">
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 self-start">
              <button
                v-for="m in motionDemos" :key="m.name" type="button"
                class="group text-left paper-card p-4 flex flex-col justify-start hover:-translate-y-0.5 transition-transform duration-fast"
                @click="play(m.name)"
              >
                <span class="h-20 grid place-items-center">
                  <span :class="['w-12 h-12 rounded-md bg-primary border-[1.5px] border-ink', playing[m.name] ? `animate-${m.name}` : '']" />
                </span>
                <span class="block font-semibold text-sm mt-2">{{ m.name }}</span>
                <span class="block text-xs text-ink-subtle">{{ m.dur }}</span>
                <span class="block text-xs text-ink-muted mt-1">{{ m.use }}</span>
              </button>
            </div>
            <!-- Egg hatch -->
            <UiCard variant="jungle" padding="none" class="overflow-hidden">
              <div class="relative h-56 bg-specimen !bg-surface-sunken grid place-items-center overflow-hidden">
                <div class="relative w-28 h-36">
                  <template v-if="hatch !== 'done'">
                    <svg viewBox="0 0 112 144" :class="['absolute inset-0 origin-bottom', hatch === 'wobble' ? 'animate-egg-wobble' : '']" aria-hidden="true">
                      <g :class="hatch === 'crack' ? 'animate-shell-left' : ''" style="transform-origin: 30% 60%">
                        <path d="M56 6C30 6 8 52 8 86c0 30 21 52 48 52V6z" fill="#FFF7E6" stroke="#071D1B" stroke-width="3" />
                        <circle cx="30" cy="70" r="6" fill="#97C8B8" /><circle cx="22" cy="100" r="4" fill="#97C8B8" />
                      </g>
                      <g :class="hatch === 'crack' ? 'animate-shell-right' : ''" style="transform-origin: 70% 60%">
                        <path d="M56 6c26 0 48 46 48 80 0 30-21 52-48 52V6z" fill="#FFF7E6" stroke="#071D1B" stroke-width="3" />
                        <circle cx="80" cy="56" r="7" fill="#97C8B8" /><circle cx="86" cy="96" r="5" fill="#97C8B8" />
                      </g>
                      <path v-if="hatch === 'wobble'" d="M30 78l12 8 10-10 10 10 10-8 12 8" fill="none" stroke="#071D1B" stroke-width="3" stroke-linejoin="round" />
                    </svg>
                  </template>
                  <div v-else class="absolute -inset-6 animate-hatch-pop" :style="avatarStyle">
                    <div v-if="rexSvg" data-art class="w-full h-full" v-html="rexSvg" />
                    <UiIcon v-else name="star" :size="120" class="text-primary" />
                  </div>
                </div>
                <template v-if="hatch === 'done'">
                  <span
                    v-for="(c, i) in confetti" :key="i"
                    class="absolute top-6 w-2.5 h-2.5 animate-confetti-fall"
                    :class="c.shape === 0 ? 'rounded-full' : c.shape === 1 ? 'rounded-[2px]' : 'rounded-[1px] h-1 w-3'"
                    :style="{ left: `${c.left}%`, background: c.color, '--drift': c.drift, animationDelay: `${c.delay}ms` }"
                    aria-hidden="true"
                  />
                </template>
              </div>
              <div class="p-4 flex items-center justify-between gap-3">
                <div>
                  <p class="font-semibold text-sm">Egg hatch reveal</p>
                  <p class="text-xs text-ink-subtle">Quiz result. 1.8 s total, instant when reduced.</p>
                </div>
                <UiButton size="sm" icon="egg" @click="runHatch">{{ hatch === 'done' ? 'Again' : 'Hatch' }}</UiButton>
              </div>
            </UiCard>
          </div>
        </section>

        <!-- ── Icons ──────────────────────────────────────────── -->
        <section id="icons" aria-labelledby="h-icons">
          <div class="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 id="h-icons" class="font-display text-display-md">Icons</h2>
              <p class="mt-2 text-ink-muted">{{ ICON_NAMES.length }} hand-drawn 24 px stroke icons. <code>&lt;UiIcon name="shuffle" /&gt;</code></p>
            </div>
            <div class="w-full sm:w-64">
              <UiInput v-model="iconQuery" type="search" placeholder="Filter icons" aria-label="Filter icons" size="sm" clearable />
            </div>
          </div>
          <ul class="mt-6 grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 xl:grid-cols-10 gap-2">
            <li v-for="n in icons" :key="n" class="flex flex-col items-center gap-2 py-4 rounded-md bg-surface border border-line">
              <UiIcon :name="n" :size="24" />
              <span class="text-[11px] text-ink-subtle">{{ n }}</span>
            </li>
          </ul>
        </section>

        <!-- ── Buttons ────────────────────────────────────────── -->
        <section id="buttons" aria-labelledby="h-buttons">
          <h2 id="h-buttons" class="font-display text-display-md">Buttons</h2>
          <p class="mt-2 text-ink-muted max-w-[60ch]">One primary per view. Buttons press down into their shadow. Labels say exactly what happens.</p>
          <div class="mt-8 space-y-6">
            <div class="flex flex-wrap items-center gap-3">
              <UiButton icon="check">Save avatar</UiButton>
              <UiButton variant="accent" icon="sparkles">Reveal my dino</UiButton>
              <UiButton variant="secondary" icon="shuffle">Randomise</UiButton>
              <UiButton variant="ghost" icon="undo">Undo</UiButton>
              <UiButton variant="danger" icon="trash">Remove</UiButton>
            </div>
            <div class="flex flex-wrap items-center gap-3">
              <UiButton size="sm">Small</UiButton>
              <UiButton>Medium</UiButton>
              <UiButton size="lg" icon-right="arrow-right">Start the quiz</UiButton>
              <UiButton :loading="loading" @click="fakeSave">Save with toast</UiButton>
              <UiButton disabled>Disabled</UiButton>
            </div>
            <div class="flex flex-wrap items-center gap-2">
              <UiTooltip text="Undo" shortcut="Ctrl Z"><UiIconButton icon="undo" label="Undo" /></UiTooltip>
              <UiTooltip text="Redo" shortcut="Ctrl Shift Z"><UiIconButton icon="redo" label="Redo" /></UiTooltip>
              <UiTooltip text="Randomise" shortcut="R"><UiIconButton icon="shuffle" label="Randomise" variant="secondary" /></UiTooltip>
              <UiIconButton icon="download" label="Export" variant="primary" />
              <UiIconButton icon="eye" label="Show safe area" :pressed="true" />
              <UiIconButton icon="trash" label="Delete design" variant="danger" />
              <UiIconButton icon="plus" label="Add" size="sm" variant="secondary" />
              <UiIconButton icon="plus" label="Add" size="lg" variant="secondary" />
            </div>
          </div>
        </section>

        <!-- ── Forms ──────────────────────────────────────────── -->
        <section id="forms" aria-labelledby="h-forms">
          <h2 id="h-forms" class="font-display text-display-md">Forms</h2>
          <div class="mt-8 grid md:grid-cols-2 gap-x-8 gap-y-6">
            <UiField label="Name" required :error="nameError" :count="name.length" :max="50">
              <UiInput v-model="name" maxlength="60" autocomplete="off" />
            </UiField>
            <UiField label="Team name" help="Shown on shirts and the poster." optional>
              <UiInput v-model="team" icon="users" />
            </UiField>
            <UiField label="How to work with me" optional :count="note.length" :max="280" class="md:row-span-2">
              <UiTextarea v-model="note" :rows="4" />
            </UiField>
            <UiField label="Team role">
              <UiSelect v-model="role" placeholder="Pick a role" :options="['Navigator', 'Builder', 'Guardian', 'Spark', 'Diplomat']" />
            </UiField>
            <UiField label="Search the Dinopedia">
              <UiInput v-model="search" type="search" placeholder="Name, group or region" clearable />
            </UiField>
            <div class="grid grid-cols-2 gap-6">
              <UiSlider v-model="size" label="Size" :min="20" :max="120" :format="(v) => `${v}%`" />
              <UiSlider v-model="rotate" label="Rotate" :min="-30" :max="30" :format="(v) => `${v}°`" />
            </div>
          </div>
        </section>

        <!-- ── Colour picking ─────────────────────────────────── -->
        <section id="colourpick" aria-labelledby="h-colourpick">
          <h2 id="h-colourpick" class="font-display text-display-md">Colour picking</h2>
          <div class="mt-8 grid lg:grid-cols-[1fr_280px] gap-8 items-start">
            <div class="space-y-7">
              <div>
                <p class="text-sm font-semibold mb-2">Palette presets</p>
                <div role="radiogroup" aria-label="Palette presets" class="flex flex-wrap gap-3">
                  <UiColorSwatch v-for="(p, i) in palettePresets" :key="p.name" :colors="p.colors" :name="p.name" size="lg" :selected="palette === i" @click="applyPalette(i)" />
                </div>
              </div>
              <UiColorPicker v-model="bodyColour" label="Body" :presets="bodyPresets" />
              <UiColorPicker v-model="textColour" label="Text colour on a black shirt" :presets="['#FFFFFF', '#F5AE36', '#1F6B5C', '#D2335F']" :contrast-with="garment" />
            </div>
            <UiCard variant="sticker" padding="none" class="overflow-hidden w-full max-w-[300px] mx-auto lg:mx-0" :tilt="-1.5">
              <div class="aspect-square bg-primary-soft" :style="avatarStyle">
                <div v-if="rexSvg" data-art class="w-full h-full" v-html="rexSvg" />
              </div>
              <div class="px-4 py-3 flex items-center justify-between">
                <span class="font-display text-lg">Live preview</span>
                <UiBadge variant="neutral" size="sm">{{ bodyColour }}</UiBadge>
              </div>
            </UiCard>
          </div>
        </section>

        <!-- ── Labels ─────────────────────────────────────────── -->
        <section id="labels" aria-labelledby="h-labels">
          <h2 id="h-labels" class="font-display text-display-md">Badges and chips</h2>
          <div class="mt-8 space-y-6">
            <div class="flex flex-wrap gap-2">
              <UiBadge>Neutral</UiBadge>
              <UiBadge variant="primary">Popular</UiBadge>
              <UiBadge variant="accent">New</UiBadge>
              <UiBadge variant="success" dot>Saved</UiBadge>
              <UiBadge variant="warning" dot>Low contrast</UiBadge>
              <UiBadge variant="danger">Upload failed</UiBadge>
              <UiBadge variant="info">Late Jurassic</UiBadge>
              <UiBadge variant="solid">Team edition</UiBadge>
              <UiBadge size="sm" variant="primary">sm</UiBadge>
            </div>
            <div class="flex flex-wrap gap-2" role="group" aria-label="Diet and period filters">
              <UiChip v-model="filters.herbivore" tone="herbivore" :count="48">Herbivore</UiChip>
              <UiChip v-model="filters.carnivore" tone="carnivore" :count="39">Carnivore</UiChip>
              <UiChip v-model="filters.omnivore" tone="omnivore" :count="11">Omnivore</UiChip>
              <UiChip v-model="filters.jurassic" tone="jurassic">Jurassic</UiChip>
              <UiChip v-model="filters.cretaceous" tone="cretaceous">Cretaceous</UiChip>
              <UiChip icon="filter">More filters</UiChip>
            </div>
            <div class="flex flex-wrap gap-2">
              <UiChip v-for="f in activeFilters" :key="f" removable @remove="activeFilters = activeFilters.filter((x) => x !== f)">{{ f }}</UiChip>
              <button v-if="activeFilters.length" type="button" class="text-sm font-semibold link ml-1" @click="activeFilters = []">Clear all</button>
              <button v-else type="button" class="text-sm font-semibold link" @click="activeFilters = ['Cretaceous', 'Under 5 m']">Restore filters</button>
            </div>
          </div>
        </section>

        <!-- ── Tabs & segmented ───────────────────────────────── -->
        <section id="nav" aria-labelledby="h-nav">
          <h2 id="h-nav" class="font-display text-display-md">Tabs and segments</h2>
          <div class="mt-8 grid lg:grid-cols-2 gap-8">
            <UiTabs v-model="pageTab" :tabs="pageTabs" label="Profile sections">
              <template #panel-about><p class="pt-4 text-ink-muted">Underline tabs for page sections. Arrow keys move, Home and End jump.</p></template>
              <template #panel-traits><p class="pt-4 text-ink-muted">Trait bars live here on the profile.</p></template>
              <template #panel-team><p class="pt-4 text-ink-muted">Three teammates share your chronotype.</p></template>
            </UiTabs>
            <div class="space-y-5">
              <UiTabs v-model="studioTab" :tabs="studioTabs" variant="pill" label="Avatar Studio controls" />
              <div class="flex flex-wrap gap-4 items-center">
                <UiSegmented v-model="side" label="Print side" :options="[{ value: 'front', label: 'Front' }, { value: 'back', label: 'Back' }]" />
                <UiSegmented v-model="crop" label="Preview crop" :options="[{ value: 'square', label: 'Square', icon: 'image' }, { value: 'circle', label: 'Circle', icon: 'user' }]" />
              </div>
              <UiSegmented v-model="exportSize" label="Export size" size="sm" :options="[128, 256, 512, 1024].map((v) => ({ value: v, label: `${v} px` }))" />
            </div>
          </div>
        </section>

        <!-- ── Cards ──────────────────────────────────────────── -->
        <section id="cards" aria-labelledby="h-cards">
          <h2 id="h-cards" class="font-display text-display-md">Cards</h2>
          <p class="mt-2 text-ink-muted max-w-[60ch]">Radius follows hierarchy: controls are pills, content cards 18 px, stickers 26 px with a white die-cut edge.</p>
          <div class="mt-8 grid sm:grid-cols-2 xl:grid-cols-4 gap-6">
            <UiCard><h3 class="font-display text-xl">Paper</h3><p class="text-sm text-ink-muted mt-1">Default container. Ink outline, hard shadow.</p></UiCard>
            <UiCard variant="flat"><h3 class="font-display text-xl">Flat</h3><p class="text-sm text-ink-muted mt-1">Secondary groupings inside paper.</p></UiCard>
            <UiCard variant="sunken"><h3 class="font-display text-xl">Sunken</h3><p class="text-sm text-ink-muted mt-1">Wells, studio trays, empty slots.</p></UiCard>
            <UiCard variant="jungle"><h3 class="font-display text-xl">Jungle</h3><p class="text-sm text-ink-muted mt-1">Dark scope for stages and reveals.</p></UiCard>
          </div>

          <!-- Composed: roster wall preview -->
          <h3 class="font-sans font-bold text-base mt-12 mb-4">Composed: roster cards</h3>
          <ul class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-x-5 gap-y-8">
            <li v-for="(p, i) in [
              { n: 'Mira Okafor', d: 'Stegosaurus', a: 'The Quiet Fortress', bg: '#FFEBC2', body: '#56A44C', belly: '#FFF7E6', acc: '#D2335F', t: -2 },
              { n: 'Jonas Leitner', d: 'Velociraptor', a: 'The Swift Fixer', bg: '#CBE6F2', body: '#7A6CBE', belly: '#DEDAF2', acc: '#F5AE36', t: 1.5 },
              { n: 'Priya Raman', d: 'Triceratops', a: 'The Steady Shield', bg: '#FAD3DE', body: '#E8951A', belly: '#FFF7E6', acc: '#1F6B5C', t: -1 },
              { n: 'Lukas Gruber', d: 'Spinosaurus', a: 'The Deep Diver', bg: '#D4ECCF', body: '#27779D', belly: '#CBE6F2', acc: '#E34E77', t: 2 },
            ]" :key="p.n">
              <UiCard variant="paper" padding="none" to="/design-system" class="group" :tilt="p.t">
                <div class="p-3 pb-0">
                  <div class="aspect-square rounded-md border-[1.5px] border-ink overflow-hidden" :style="{ background: p.bg, '--dino-body': p.body, '--dino-belly': p.belly, '--dino-accent': p.acc, '--dino-shade': `color-mix(in srgb, ${p.body} 70%, #0B2B28)` }">
                    <div v-if="(i % 2 ? raptorSvg : rexSvg)" data-art class="w-full h-full" v-html="i % 2 ? raptorSvg : rexSvg" />
                  </div>
                </div>
                <div class="px-4 pt-3 pb-4">
                  <p class="font-display text-xl leading-tight truncate">{{ p.n }}</p>
                  <p class="text-sm text-ink-muted truncate">{{ p.d }}</p>
                  <p class="mt-2 inline-block text-xs font-semibold bg-primary-soft border border-resin-400 rounded-full px-2 py-0.5 text-resin-800">{{ p.a }}</p>
                </div>
              </UiCard>
            </li>
          </ul>
        </section>

        <!-- ── Data ───────────────────────────────────────────── -->
        <section id="data" aria-labelledby="h-data">
          <h2 id="h-data" class="font-display text-display-md">Traits and progress</h2>
          <div class="mt-8 grid lg:grid-cols-2 gap-8">
            <UiCard>
              <h3 class="font-display text-xl mb-5">Mira's traits</h3>
              <div class="space-y-5">
                <UiStatBar label="Energy" :value="2" />
                <UiStatBar label="Social" :value="4" :compare="2" color="#3A91BA" />
                <UiStatBar label="Defence" :value="5" color="#56A44C" />
                <UiStatBar label="Chronotype" :value="1.5" min-label="Night owl" max-label="Early bird" color="#7A6CBE" />
                <UiStatBar label="Temperament" :value="3.8" min-label="Calm" max-label="Fiery" color="#D2335F" />
              </div>
            </UiCard>
            <div class="space-y-8">
              <UiCard>
                <UiProgress :value="quizStep" :max="12" variant="steps" label="Question" show-value />
                <div class="mt-4 flex gap-2">
                  <UiButton size="sm" variant="secondary" icon="chevron-left" :disabled="quizStep <= 1" @click="quizStep--">Back</UiButton>
                  <UiButton size="sm" icon-right="chevron-right" :disabled="quizStep >= 12" @click="quizStep++">Next</UiButton>
                </div>
              </UiCard>
              <UiCard>
                <UiProgress :value="62" label="Exporting team shirts" show-value tone="accent" />
                <p class="mt-2 text-sm text-ink-subtle">5 of 8 people done</p>
              </UiCard>
              <UiCard variant="flat">
                <h3 class="font-sans font-bold text-base mb-3">Team diet mix</h3>
                <div class="space-y-3">
                  <UiStatBar label="Herbivores" :value="5" :max="9" color="#3E8A37" :format="(v, m) => `${v} of ${m}`" />
                  <UiStatBar label="Carnivores" :value="3" :max="9" color="#D2335F" :format="(v, m) => `${v} of ${m}`" />
                  <UiStatBar label="Omnivores" :value="1" :max="9" color="#E8951A" :format="(v, m) => `${v} of ${m}`" />
                </div>
              </UiCard>
            </div>
          </div>
        </section>

        <!-- ── Overlays ───────────────────────────────────────── -->
        <section id="overlays" aria-labelledby="h-overlays">
          <h2 id="h-overlays" class="font-display text-display-md">Overlays and feedback</h2>
          <div class="mt-8 flex flex-wrap gap-3">
            <UiButton variant="secondary" icon="download" @click="modalOpen = true">Export dialog</UiButton>
            <UiButton variant="secondary" icon="trash" @click="confirmOpen = true">Confirm removal</UiButton>
            <UiButton variant="secondary" icon="menu" @click="sheetOpen = true">Bottom sheet</UiButton>
            <UiButton variant="secondary" icon="layers" @click="showDock = !showDock">{{ showDock ? 'Hide' : 'Show' }} docked studio sheet</UiButton>
          </div>
          <div class="mt-4 flex flex-wrap gap-3">
            <UiButton variant="ghost" size="sm" icon="check" @click="toast.success('Shirt design saved', 'Find it under Mira > Shirts.')">Success toast</UiButton>
            <UiButton variant="ghost" size="sm" icon="info" @click="toast.show({ title: 'Removed Jonas', message: 'His avatar and 2 shirts went too.', action: { label: 'Undo', onClick: () => toast.info('Jonas is back') } })">Toast with undo</UiButton>
            <UiButton variant="ghost" size="sm" icon="warning" @click="toast.warning('Low contrast', 'Dark green text will vanish on a forest green shirt.')">Warning toast</UiButton>
            <UiButton variant="ghost" size="sm" icon="x" @click="toast.error('Upload failed', 'Use a JPG, PNG or WebP under 8 MB.')">Error toast</UiButton>
          </div>
        </section>

        <!-- ── Empty / loading ────────────────────────────────── -->
        <section id="empty" aria-labelledby="h-empty">
          <h2 id="h-empty" class="font-display text-display-md">Empty and loading</h2>
          <div class="mt-8 grid lg:grid-cols-2 gap-8">
            <UiCard variant="sunken" class="bg-specimen">
              <UiEmptyState title="No teammates yet" text="Add the first person and give them a spirit dinosaur." compact :image="emptyRosterUrl">
                <template v-if="!emptyRosterUrl" #image>
                  <div class="aspect-square rounded-full bg-primary border-[1.5px] border-ink grid place-items-center text-on-primary"><UiIcon name="egg" :size="56" :stroke="1.6" /></div>
                </template>
                <template #action><UiButton icon="plus">Add teammate</UiButton></template>
              </UiEmptyState>
            </UiCard>
            <div aria-busy="true" aria-label="Loading roster" class="grid grid-cols-2 gap-5 items-start">
              <div v-for="i in 2" :key="i" class="paper-card p-3 space-y-3">
                <UiSkeleton shape="rect" height="140px" />
                <UiSkeleton width="70%" height="1.1em" />
                <UiSkeleton :lines="2" />
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>

    <!-- ── Preview of mobile tab bar ──────────────────────────── -->
    <nav aria-label="Main (mobile preview)" class="theme-jungle md:hidden fixed bottom-0 inset-x-0 z-nav bg-bg border-t-[1.5px] border-jungle-950 safe-bottom">
      <ul class="grid grid-cols-5 h-16">
        <li v-for="(t, i) in [{ l: 'Team', i: 'users' }, { l: 'Quiz', i: 'egg' }, { l: 'Add', i: 'plus' }, { l: 'Dinopedia', i: 'book' }, { l: 'Insights', i: 'chart' }]" :key="t.l">
          <a href="#" :aria-current="i === 0 ? 'page' : undefined" class="h-full flex flex-col items-center justify-center gap-0.5 text-[11px] font-semibold" :class="i === 0 ? 'text-primary' : 'text-ink-muted'" @click.prevent>
            <span v-if="t.l === 'Add'" class="w-11 h-11 -mt-5 rounded-full bg-primary text-on-primary border-[1.5px] border-jungle-950 shadow-sticker-sm grid place-items-center"><UiIcon name="plus" :size="22" :stroke="2.5" /></span>
            <UiIcon v-else :name="t.i" :size="22" />
            <span :class="t.l === 'Add' ? 'sr-only' : ''">{{ t.l === 'Add' ? 'Add teammate' : t.l }}</span>
          </a>
        </li>
      </ul>
    </nav>

    <!-- ── Overlays ───────────────────────────────────────────── -->
    <UiModal v-model="modalOpen" title="Export avatar" description="PNG for chat apps, SVG for print and the poster.">
      <div class="grid sm:grid-cols-[140px_1fr] gap-6 items-start">
        <div :class="['aspect-square border-[1.5px] border-ink overflow-hidden bg-primary-soft', crop === 'circle' ? 'rounded-full' : 'rounded-md']" :style="avatarStyle">
          <div v-if="rexSvg" data-art class="w-full h-full" v-html="rexSvg" />
        </div>
        <div class="space-y-5">
          <div>
            <p class="text-sm font-semibold mb-2">Format</p>
            <UiSegmented v-model="side" label="Format" :options="[{ value: 'front', label: 'PNG' }, { value: 'back', label: 'SVG' }]" />
          </div>
          <div>
            <p class="text-sm font-semibold mb-2">Size</p>
            <UiSegmented v-model="exportSize" label="Size" size="sm" :options="[128, 256, 512, 1024].map((v) => ({ value: v, label: `${v}` }))" />
            <p class="mt-2 text-xs text-ink-subtle">512 suits Slack and Discord, 1024 for everything else.</p>
          </div>
          <div>
            <p class="text-sm font-semibold mb-2">Preview crop</p>
            <UiSegmented v-model="crop" label="Preview crop" size="sm" :options="[{ value: 'square', label: 'Square' }, { value: 'circle', label: 'Circle' }]" />
          </div>
        </div>
      </div>
      <template #footer>
        <UiButton variant="ghost" @click="modalOpen = false">Cancel</UiButton>
        <UiButton icon="download" data-autofocus @click="modalOpen = false; toast.success('Downloaded mira-okafor-512.png')">Download PNG</UiButton>
      </template>
    </UiModal>

    <UiModal v-model="confirmOpen" title="Remove Jonas from the team?" size="sm" role="alertdialog">
      <p class="text-ink-muted">His avatar, quiz result and 2 shirt designs go too. You can undo for a few seconds.</p>
      <template #footer>
        <UiButton variant="ghost" data-autofocus @click="confirmOpen = false">Keep Jonas</UiButton>
        <UiButton variant="danger" icon="trash" @click="confirmOpen = false; toast.show({ title: 'Removed Jonas', action: { label: 'Undo', onClick: () => {} } })">Remove</UiButton>
      </template>
    </UiModal>

    <UiBottomSheet v-model="sheetOpen" title="Assign result to">
      <ul class="divide-y divide-line">
        <li v-for="n in ['Mira Okafor', 'Jonas Leitner', 'Priya Raman', 'Lukas Gruber']" :key="n">
          <button type="button" class="w-full flex items-center gap-3 py-3 text-left font-semibold hover:text-accent" @click="sheetOpen = false; toast.success(`Applied to ${n}`)">
            <UiIcon name="user" /> {{ n }}
          </button>
        </li>
      </ul>
    </UiBottomSheet>

    <UiBottomSheet v-if="showDock" docked v-model:snap="dockSnap" title="Avatar controls">
      <template #header><UiTabs v-model="studioTab" :tabs="studioTabs" variant="pill" label="Avatar controls" fitted /></template>
      <div class="space-y-6 pt-2">
        <UiColorPicker v-model="bodyColour" label="Body" :presets="bodyPresets" size="sm" />
        <UiColorPicker v-model="bellyColour" label="Belly" :presets="['#FFF7E6', '#FFEBC2', '#CBE6F2', '#DEDAF2']" size="sm" />
        <UiColorPicker v-model="accentColour" label="Accent" :presets="['#D2335F', '#F5AE36', '#1F6B5C', '#1E2420']" size="sm" />
      </div>
    </UiBottomSheet>

    <UiToast />
  </div>
</template>

<style scoped>
.ds code { font-family: inherit; font-weight: 600; font-size: 0.92em; }
.ds [data-art] :deep(svg) { display: block; width: 100%; height: 100%; }
</style>
