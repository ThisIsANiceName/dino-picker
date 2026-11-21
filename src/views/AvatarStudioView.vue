<!--
  Avatar Studio (/people/:id/avatar). One AvatarConfig in a studio store (useStudio), live preview
  rendered by src/lib/art, tabbed controls, undo/redo, drafts, export. See docs/ux-spec.md 4.3.
-->
<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  UiButton, UiColorPicker, UiColorSwatch, UiEmptyState, UiIcon, UiModal, UiSegmented, UiSkeleton,
  prefersReducedMotion,
} from '../components/ui/index.js'
import StudioShell from '../components/studio/StudioShell.vue'
import TileGrid from '../components/studio/TileGrid.vue'
import PhotoCropper from '../components/studio/PhotoCropper.vue'
import { useStudio, useLeaveGuard, useStudioKeys, isMac } from '../components/studio/useStudio.js'
import { useAppData } from '../components/layout/useAppData.js'
import { setPageTitle } from '../components/layout/usePageTitle.js'
import { usePersonStore } from '../stores/personStore.js'
import { useToast } from '../composables/useToast.js'
import {
  ART, HOUSE_PALETTES, composeAvatarSvg, describeAvatar, deriveShade, downloadBlob, inlineSvgImages,
  kitSvg, resolveAvatarConfig, sceneColorsFor, slugify, svgDataUri, svgToPngBlob,
} from '../lib/art/index.js'
import { randomizeAvatar } from '../lib/art/random.js'

const route = useRoute()
const router = useRouter()
// UiButton's RouterLink mode drops the href; pass it explicitly so the link is focusable.
const hrefOf = (to) => router.resolve(to).href
const data = useAppData()
const personStore = usePersonStore()
const toast = useToast()

const personId = computed(() => String(route.params.id))
const person = computed(() => personStore.getPersonById(personId.value))
const dino = computed(() => data.dinoFor(person.value))
const firstName = computed(() => person.value?.name?.trim().split(/\s+/)[0] ?? 'teammate')
const dinoLabel = computed(() => dino.value?.displayName ?? dino.value?.name ?? '')

const studio = useStudio({ draftKey: () => `dino:draft:avatar:${personId.value}` })
const { config } = studio
const ready = ref(false)
const draft = ref(null)

function init() {
  if (!person.value || ready.value) return
  const cfg = resolveAvatarConfig(person.value, dino.value)
  studio.load(cfg)
  const d = studio.readDraft()
  const savedAt = Date.parse(person.value.updatedAt ?? '') || 0
  if (d && d.at > savedAt && JSON.stringify(d.config) !== JSON.stringify(cfg)) draft.value = d
  else if (d) studio.clearDraft()
  ready.value = true
  setPageTitle(`${firstName.value}'s avatar`)
}
watch([() => data.ready.value, person], () => { if (data.ready.value) init() }, { immediate: true })

const draftTime = computed(() =>
  draft.value ? new Date(draft.value.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
)
function restoreDraft() {
  const d = draft.value
  draft.value = null
  if (!d) return
  const merged = resolveAvatarConfig({ ...person.value, avatar: d.config }, dino.value)
  studio.commit('restore draft', () => { config.value = merged })
  studio.announce('Draft restored')
}
function discardDraft() {
  draft.value = null
  studio.clearDraft()
}

// ── Tabs ───────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'colours', label: 'Colours', icon: 'palette' },
  { id: 'gear', label: 'Gear', icon: 'sparkles' },
  { id: 'scene', label: 'Scene', icon: 'image' },
  { id: 'frame', label: 'Frame', icon: 'layers' },
  { id: 'photo', label: 'Photo', icon: 'user' },
]
const tab = ref('colours')

// ── Preview ────────────────────────────────────────────────────────────────
const shape = ref('square')
const stageSvg = computed(() => (config.value ? composeAvatarSvg(config.value, { size: 512 }) : ''))
const hasFrame = computed(() => !!config.value?.frame)
const isPhoto = computed(() => config.value?.display === 'photo' && !!config.value?.photo)
const hasDino = computed(() => !!config.value?.bodyType)

const summary = ref('')
let summaryTimer = null
watch(
  config,
  (c) => {
    clearTimeout(summaryTimer)
    summaryTimer = setTimeout(() => { summary.value = c ? describeAvatar(c, dinoLabel.value) : '' }, summary.value ? 1000 : 0)
  },
  { deep: true, immediate: true },
)
onBeforeUnmount(() => clearTimeout(summaryTimer))

const stageEl = ref(null)
const stageAnim = ref('')
function playStage(name) {
  if (prefersReducedMotion()) return
  stageAnim.value = ''
  requestAnimationFrame(() => { stageAnim.value = name })
}
async function popSlot(slot) {
  if (prefersReducedMotion()) return
  await nextTick()
  const el = stageEl.value?.querySelector(`[data-slot="${slot}"]`)
  if (!el?.animate) return
  el.style.transformBox = 'fill-box'
  el.style.transformOrigin = slot === 'hat' ? '50% 100%' : '50% 50%'
  el.animate(
    [
      { transform: 'translateY(-18%) scale(0.6)', opacity: 0 },
      { transform: 'translateY(0) scale(1.06)', opacity: 1, offset: 0.6 },
      { transform: 'translateY(0) scale(1)', opacity: 1 },
    ],
    { duration: 360, easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
  )
}

// ── Colours ────────────────────────────────────────────────────────────────
const palettePresets = computed(() => {
  const list = []
  const p = dino.value?.palette
  if (p?.body) list.push({ name: `${dinoLabel.value || 'Dino'} original`, body: p.body, belly: p.belly, accent: p.accent })
  for (const h of HOUSE_PALETTES) list.push(h)
  return list.map((x) => ({ ...x, body: x.body.toUpperCase(), belly: x.belly.toUpperCase(), accent: x.accent.toUpperCase() }))
})
const isPreset = (p) =>
  config.value.colors.body === p.body && config.value.colors.belly === p.belly && config.value.colors.accent === p.accent
function applyPalette(p) {
  studio.commit('palette', (c) => { c.colors = { ...c.colors, body: p.body, belly: p.belly, accent: p.accent } })
}
const uniq = (list) => [...new Set(list.filter(Boolean).map((h) => h.toUpperCase()))]
const channelPresets = computed(() => ({
  body: uniq(palettePresets.value.map((p) => p.body)).slice(0, 8),
  belly: uniq([...palettePresets.value.map((p) => p.belly), '#FFFFFF']).slice(0, 8),
  accent: uniq([...palettePresets.value.map((p) => p.accent), '#1E2420']).slice(0, 8),
}))
const CHANNELS = [
  { key: 'body', label: 'Body' },
  { key: 'belly', label: 'Belly' },
  { key: 'accent', label: 'Accent' },
]
const moreOpen = ref(false)
const customShade = computed(() => !!config.value?.colors.shade)
function toggleShade(on) {
  studio.commit('custom shade', (c) => { c.colors.shade = on ? deriveShade(c.colors.body) : null })
}

// ── Gear ───────────────────────────────────────────────────────────────────
const KIT_PRESETS = ['#1E2420', '#FFFFFF', '#D2335F', '#F5AE36', '#56A44C', '#3A91BA', '#7A6CBE', '#F472B6']
const TOKEN_LABELS = ['Main', 'Trim', 'Detail']
const thumbCache = new Map()
function thumb(svg) {
  let uri = thumbCache.get(svg)
  if (!uri) {
    uri = svgDataUri(svg)
    if (thumbCache.size > 500) thumbCache.clear()
    thumbCache.set(svg, uri)
  }
  return uri
}
const gearTiles = computed(() => {
  const c = config.value
  const out = {}
  for (const slot of ART.slots) {
    out[slot] = [
      { id: null, label: `No ${ART.slotLabels[slot].toLowerCase()}`, icon: 'x' },
      ...ART.accessories[slot].map((a) => {
        const svg = hasDino.value
          ? composeAvatarSvg(
            {
              ...c,
              display: 'dino',
              frame: null,
              accessories: { hat: null, eyewear: null, neck: null, extra: null, [slot]: { id: a.id, colors: c.accessories[slot]?.id === a.id ? c.accessories[slot].colors : {} } },
            },
            { size: 144, background: false },
          )
          : kitSvg(a, {}, { size: 144 })
        return { id: a.id, label: a.label, src: thumb(svg) }
      }),
    ]
  }
  return out
})
function setAccessory(slot, id) {
  if ((config.value.accessories[slot]?.id ?? null) === id) return
  const label = id ? ART.accessoryById[id].label.toLowerCase() : `no ${ART.slotLabels[slot].toLowerCase()}`
  studio.commit(label, (c) => { c.accessories[slot] = id ? { id, colors: {} } : null })
  if (id) popSlot(slot)
}
function pieceTokens(piece, lookup) {
  const item = piece && lookup[piece.id]
  if (!item) return []
  return Object.keys(item.defaults).map((key, i) => ({
    key,
    label: TOKEN_LABELS[i] ?? `Colour ${i + 1}`,
    value: piece.colors?.[key] ?? item.defaults[key],
    presets: uniq([item.defaults[key], ...KIT_PRESETS]).slice(0, 8),
  }))
}
function setPieceColor(target, key, hex) {
  target.colors = { ...(target.colors ?? {}), [key]: hex }
}

// ── Scene ──────────────────────────────────────────────────────────────────
const SCENE_LABELS = ['Base', 'Pattern', 'Highlight']
const sceneTiles = computed(() =>
  ART.backgrounds.map((b) => ({
    id: b.id,
    label: b.label,
    src: thumb(kitSvg(b, config.value.background?.id === b.id ? config.value.background.colors : {}, { size: 144 })),
  })),
)
function setScene(id) {
  if (config.value.background?.id === id) return
  studio.commit(`${ART.backgroundById[id].label.toLowerCase()} background`, (c) => { c.background = { id, colors: {} } })
}
function matchScene() {
  studio.commit('scene colours', (c) => { c.background = { ...c.background, colors: sceneColorsFor(c.background.id, c.colors) } })
}
const sceneTokens = computed(() =>
  pieceTokens(config.value.background, ART.backgroundById).map((t, i) => ({ ...t, label: SCENE_LABELS[i] ?? t.label })),
)

// ── Frame ──────────────────────────────────────────────────────────────────
const FRAME_LABELS = ['Frame', 'Trim']
const frameTiles = computed(() => [
  { id: null, label: 'No frame', icon: 'x' },
  ...ART.frames.map((f) => ({
    id: f.id,
    label: f.label,
    src: thumb(composeAvatarSvg(
      { ...config.value, display: 'dino', frame: { id: f.id, colors: config.value.frame?.id === f.id ? config.value.frame.colors : {} } },
      { size: 144 },
    )),
  })),
])
function setFrame(id) {
  if ((config.value.frame?.id ?? null) === id) return
  studio.commit(id ? `${ART.frameById[id].label.toLowerCase()} frame` : 'no frame', (c) => { c.frame = id ? { id, colors: {} } : null })
}
const frameTokens = computed(() =>
  pieceTokens(config.value.frame, ART.frameById).map((t, i) => ({ ...t, label: FRAME_LABELS[i] ?? t.label })),
)

// ── Photo ──────────────────────────────────────────────────────────────────
const MAX_SOURCE = 8 * 1024 * 1024
const MAX_UPLOAD = 5 * 1024 * 1024
const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const fileInput = ref(null)
const cropFile = ref(null)
const cropOpen = ref(false)
const uploading = ref(false)
const photoError = ref('')

function choosePhoto() {
  photoError.value = ''
  fileInput.value?.click()
}
function onFile(e) {
  const file = e.target.files?.[0]
  e.target.value = ''
  if (!file) return
  if (!PHOTO_TYPES.includes(file.type)) {
    photoError.value = "That file isn't a picture we can use. Use a JPG, PNG or WebP under 8 MB."
    return
  }
  if (file.size > MAX_SOURCE) {
    photoError.value = 'That file is too big. Use a JPG, PNG or WebP under 8 MB.'
    return
  }
  cropFile.value = file
  cropOpen.value = true
}
async function onCropped(blob) {
  if (blob.size > MAX_UPLOAD) {
    cropOpen.value = false
    photoError.value = 'That file is too big. Use a JPG, PNG or WebP under 8 MB.'
    return
  }
  uploading.value = true
  try {
    const saved = await personStore.uploadPhoto(personId.value, blob)
    studio.commit('photo', (c) => {
      c.photo = { url: saved.photoUrl, crop: { x: 0, y: 0, size: 1 } }
      c.display = 'photo'
    })
    cropOpen.value = false
    toast.success('Photo added', 'Save to profile to show it everywhere.')
  } catch (err) {
    cropOpen.value = false
    photoError.value = /too large|413/i.test(err.message)
      ? 'That file is too big. Use a JPG, PNG or WebP under 8 MB.'
      : "Couldn't reach the server. Try the upload again."
  } finally {
    uploading.value = false
  }
}
function onCropError(message) { photoError.value = message }
function setDisplay(mode) {
  if (config.value.display === mode) return
  studio.commit(mode === 'photo' ? 'show photo' : 'show dino', (c) => { c.display = mode })
}
const removeOpen = ref(false)
const removing = ref(false)
async function removePhoto() {
  removing.value = true
  try {
    await personStore.removePhoto(personId.value)
    studio.commit('remove photo', (c) => { c.photo = null; c.display = 'dino' })
    removeOpen.value = false
    toast.show({ title: 'Photo removed' })
  } catch {
    removeOpen.value = false
    toast.error("Couldn't reach the server", 'The photo is still there. Try again.')
  } finally {
    removing.value = false
  }
}

// ── Stage actions ──────────────────────────────────────────────────────────
function randomise() {
  if (!config.value) return
  const next = randomizeAvatar(config.value)
  studio.commit('randomise', () => { config.value = next })
  playStage('wiggle')
}
const resetOpen = ref(false)
function askReset() {
  if (!studio.dirty.value) return
  if (studio.stepsSinceSave.value > 3) resetOpen.value = true
  else studio.reset()
}
function confirmReset() {
  resetOpen.value = false
  studio.reset()
}

// ── Save ───────────────────────────────────────────────────────────────────
const saving = ref(false)
const stamped = ref(false)
let stampTimer = null
async function save() {
  if (saving.value || !config.value) return false
  saving.value = true
  const snapshot = JSON.parse(JSON.stringify(config.value))
  try {
    await personStore.saveAvatar(personId.value, snapshot)
    studio.markSaved(snapshot)
    draft.value = null
    toast.success('Avatar saved')
    playStage('slap')
    stamped.value = true
    clearTimeout(stampTimer)
    stampTimer = setTimeout(() => { stamped.value = false }, 2200)
    return true
  } catch {
    toast.show({
      tone: 'error',
      title: "Couldn't reach the server",
      message: 'Your changes are kept on this device.',
      action: { label: 'Try again', onClick: save },
    })
    return false
  } finally {
    saving.value = false
  }
}
onBeforeUnmount(() => clearTimeout(stampTimer))

const guard = useLeaveGuard(studio.dirty, { save, discard: () => studio.clearDraft() })

// ── Export ─────────────────────────────────────────────────────────────────
const exportOpen = ref(false)
const exportFormat = ref('png')
const exportSize = ref(512)
const exportShape = ref('square')
const exportTransparent = ref(false)
const exporting = ref(false)
const exportSvg = computed(() =>
  config.value ? composeAvatarSvg(config.value, { size: 512, background: !(exportTransparent.value && exportFormat.value === 'png') }) : '',
)
const fileBase = computed(() => `${slugify(person.value?.name, 'teammate')}-avatar`)
const exportName = computed(() =>
  exportFormat.value === 'png' ? `${fileBase.value}-${exportSize.value}.png` : `${fileBase.value}.svg`,
)
function openExport() {
  exportShape.value = shape.value
  exportOpen.value = true
}
async function doExport() {
  exporting.value = true
  try {
    if (exportFormat.value === 'png') {
      const svg = composeAvatarSvg(config.value, { size: exportSize.value, background: !exportTransparent.value })
      downloadBlob(await svgToPngBlob(svg, exportSize.value), exportName.value)
    } else {
      const svg = await inlineSvgImages(composeAvatarSvg(config.value, { size: 1024 }))
      downloadBlob(new Blob([svg], { type: 'image/svg+xml' }), exportName.value)
    }
    exportOpen.value = false
    toast.success(`Downloaded ${exportName.value}`)
  } catch {
    toast.error('Export failed', 'The picture could not be drawn. Try again.')
  } finally {
    exporting.value = false
  }
}

// ── Keyboard ───────────────────────────────────────────────────────────────
const helpOpen = ref(false)
const mod = isMac() ? '⌘' : 'Ctrl'
const SHORTCUTS = [
  {
    title: 'Editing',
    items: [
      [[mod, 'Z'], 'Undo'],
      [[mod, 'Shift', 'Z'], 'Redo'],
      [['R'], 'Randomise'],
      [['1', '–', '5'], 'Switch tab'],
    ],
  },
  {
    title: 'File',
    items: [
      [[mod, 'S'], 'Save to profile'],
      [[mod, 'E'], 'Export'],
      [['?'], 'This list'],
    ],
  },
]
const tabKeys = Object.fromEntries(TABS.map((t, i) => [String(i + 1), () => { tab.value = t.id }]))
useStudioKeys({
  undo: () => studio.undo(),
  redo: () => studio.redo(),
  save,
  export: () => { if (ready.value) openExport() },
  help: () => { helpOpen.value = true },
  keys: { r: randomise, ...tabKeys },
})

const backTo = computed(() => `/people/${personId.value}`)
</script>

<template>
  <!-- Loading -->
  <div v-if="!ready && !data.failed.value && (data.loading.value || person)" class="fixed inset-0 z-[45] bg-bg flex flex-col" aria-busy="true">
    <div class="theme-jungle h-14 bg-bg border-b-[1.5px] border-jungle-950" />
    <div class="flex-1 grid lg:grid-cols-[1fr_440px]">
      <div class="theme-jungle bg-specimen grid place-items-center p-8"><UiSkeleton shape="rect" width="min(360px, 70vw)" height="min(360px, 70vw)" /></div>
      <div class="hidden lg:block p-5 space-y-4 bg-surface border-l-[1.5px] border-ink">
        <UiSkeleton shape="rect" height="44px" /><UiSkeleton :lines="3" /><UiSkeleton shape="rect" height="120px" />
      </div>
    </div>
  </div>

  <!-- Error / missing -->
  <div v-else-if="!ready" class="min-h-dvh grid place-items-center p-6">
    <UiEmptyState
      v-if="data.failed.value"
      tone="error"
      title="Couldn't reach the server"
      text="Check your connection and try again."
    >
      <template #action><UiButton @click="data.retry()">Try again</UiButton></template>
    </UiEmptyState>
    <UiEmptyState v-else title="This teammate went extinct" text="We can't find that person. They may have been removed.">
      <template #action><UiButton to="/" :href="hrefOf('/')">Back to the team</UiButton></template>
    </UiEmptyState>
  </div>

  <StudioShell
    v-else
    v-model:tab="tab"
    v-model:help-open="helpOpen"
    title="Avatar Studio"
    :back-to="backTo"
    :back-label="`Back to ${firstName}`"
    :back-short="firstName"
    :tabs="TABS"
    :can-undo="studio.canUndo.value"
    :can-redo="studio.canRedo.value"
    :dirty="studio.dirty.value"
    :saving="saving"
    save-label="Save to profile"
    save-short="Save"
    :announcement="studio.announcement.value"
    :leave-open="guard.open.value"
    :shortcuts="SHORTCUTS"
    panel-label="Avatar controls"
    id-prefix="avatar"
    @undo="studio.undo()"
    @redo="studio.redo()"
    @export="openExport"
    @save="save"
    @leave="guard.choose"
  >
    <template #banner>
      <div v-if="draft" class="shrink-0 flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 bg-warning-soft text-ink border-b border-line-strong" role="status">
        <p class="text-sm font-medium flex-1 min-w-[12rem]">You have unsaved changes from {{ draftTime }}.</p>
        <div class="flex gap-2">
          <UiButton size="sm" variant="secondary" @click="restoreDraft">Restore</UiButton>
          <UiButton size="sm" variant="ghost" @click="discardDraft">Discard</UiButton>
        </div>
      </div>
    </template>

    <template #stage>
      <div class="flex-1 min-h-0 flex flex-col items-center justify-center gap-3 lg:gap-6 px-4 py-3 lg:py-8">
        <div class="relative flex-1 min-h-0 w-full flex items-center justify-center lg:flex-none lg:h-[min(52vh,440px)]">
          <div class="relative h-full max-h-[440px] aspect-square max-w-full">
            <div
              ref="stageEl"
              role="img"
              :aria-label="`${firstName}'s avatar preview: ${summary}`"
              :class="[
                'avatar-stage w-full h-full',
                hasFrame ? 'avatar-stage--framed' : shape === 'circle' ? 'avatar-stage--circle' : 'avatar-stage--square',
                stageAnim === 'wiggle' ? 'animate-wiggle' : '',
                stageAnim === 'slap' ? 'animate-sticker-slap' : '',
              ]"
              style="--tilt: 0deg"
              @animationend="stageAnim = ''"
              v-html="stageSvg"
            />
            <span
              v-if="stamped"
              class="absolute -top-2 -right-2 lg:-right-10 px-3 py-1 rounded-md bg-primary text-on-primary font-display text-base border-[1.5px] border-jungle-950 shadow-sticker-sm animate-stamp"
              aria-hidden="true"
            >Saved</span>
          </div>
          <div class="hidden xl:flex absolute right-6 bottom-0 flex-col items-center gap-3" aria-hidden="true">
            <div class="avatar-mini" style="width: 96px; height: 96px" v-html="stageSvg" />
            <div class="avatar-mini avatar-mini--circle" style="width: 48px; height: 48px" v-html="stageSvg" />
            <span class="text-2xs font-semibold text-ink-subtle">96 · 48</span>
          </div>
        </div>

        <div class="shrink-0 flex flex-wrap items-center justify-center gap-2">
          <UiSegmented
            v-model="shape"
            label="Preview crop"
            size="sm"
            :options="[{ value: 'square', label: 'Square' }, { value: 'circle', label: 'Circle' }]"
          />
          <UiButton variant="secondary" size="sm" icon="shuffle" @click="randomise">Randomise</UiButton>
          <UiButton variant="ghost" size="sm" :disabled="!studio.dirty.value" @click="askReset">Reset</UiButton>
        </div>
      </div>
    </template>

    <template #panel>
      <!-- Colours -->
      <div v-if="tab === 'colours'" class="space-y-6">
        <div v-if="!hasDino" class="rounded-lg border border-line bg-surface-sunken p-4 text-sm">
          <p class="font-semibold">No dino yet. Take the quiz or pick one yourself.</p>
          <div class="mt-3 flex flex-wrap gap-2">
            <UiButton size="sm" :to="{ path: '/quiz', query: { for: personId } }" :href="hrefOf({ path: '/quiz', query: { for: personId } })">Take the quiz</UiButton>
            <UiButton size="sm" variant="secondary" :to="`/people/${personId}`" :href="hrefOf(`/people/${personId}`)">Pick one myself</UiButton>
          </div>
        </div>
        <template v-else>
          <p v-if="isPhoto" class="text-sm text-ink-muted flex gap-2"><UiIcon name="info" :size="18" class="shrink-0 mt-0.5" />The avatar shows the photo right now. Colours apply to the dino.</p>
          <section>
            <h2 class="panel-h">Palette presets</h2>
            <div role="radiogroup" aria-label="Palette presets" class="flex flex-wrap gap-2.5">
              <UiColorSwatch
                v-for="p in palettePresets"
                :key="p.name"
                :colors="[p.body, p.belly, p.accent]"
                :name="`${p.name} palette`"
                :selected="isPreset(p)"
                size="lg"
                @click="applyPalette(p)"
              />
            </div>
          </section>
          <UiColorPicker
            v-for="ch in CHANNELS"
            :key="ch.key"
            :model-value="config.colors[ch.key]"
            :label="ch.label"
            :presets="channelPresets[ch.key]"
            @update:model-value="config.colors[ch.key] = $event"
            @change="studio.commit(`${ch.label.toLowerCase()} colour`)"
          />
          <section class="border-t border-line pt-4">
            <button
              type="button"
              class="flex items-center gap-1.5 text-sm font-semibold text-ink-muted hover:text-ink"
              :aria-expanded="String(moreOpen)"
              aria-controls="avatar-more"
              @click="moreOpen = !moreOpen"
            >
              <UiIcon :name="moreOpen ? 'chevron-down' : 'chevron-right'" :size="16" />More
            </button>
            <div v-show="moreOpen" id="avatar-more" class="mt-3 space-y-4">
              <label class="flex items-start gap-3 text-sm cursor-pointer">
                <input type="checkbox" class="mt-0.5 h-4 w-4 accent-[rgb(var(--c-ink))]" :checked="customShade" @change="toggleShade($event.target.checked)" />
                <span><span class="font-semibold">Custom shade</span><span class="block text-ink-muted">Shadows and back markings normally follow the body colour.</span></span>
              </label>
              <UiColorPicker
                v-if="customShade"
                :model-value="config.colors.shade"
                label="Shade"
                :presets="[deriveShade(config.colors.body), '#1E2420', '#0B2B28']"
                size="sm"
                @update:model-value="config.colors.shade = $event"
                @change="studio.commit('shade colour')"
              />
            </div>
          </section>
        </template>
      </div>

      <!-- Gear -->
      <div v-else-if="tab === 'gear'" class="space-y-7">
        <p v-if="isPhoto" class="text-sm text-ink-muted flex gap-2"><UiIcon name="info" :size="18" class="shrink-0 mt-0.5" />Gear is worn by the dino. Switch to the dino in the Photo tab to see it.</p>
        <p v-else-if="!hasDino" class="text-sm text-ink-muted">No dino yet. Gear shows up once {{ firstName }} has one.</p>
        <section v-for="slot in ART.slots" :key="slot">
          <h2 class="panel-h">{{ ART.slotLabels[slot] }}</h2>
          <TileGrid
            :model-value="config.accessories[slot]?.id ?? null"
            :items="gearTiles[slot]"
            :label="ART.slotLabels[slot]"
            :size="72"
            checker
            @update:model-value="setAccessory(slot, $event)"
          />
          <div v-if="config.accessories[slot]" class="mt-4 space-y-4 pl-3 border-l-2 border-line">
            <UiColorPicker
              v-for="t in pieceTokens(config.accessories[slot], ART.accessoryById)"
              :key="t.key"
              :model-value="t.value"
              :label="`${ART.accessoryById[config.accessories[slot].id].label}: ${t.label.toLowerCase()}`"
              :presets="t.presets"
              size="sm"
              @update:model-value="setPieceColor(config.accessories[slot], t.key, $event)"
              @change="studio.commit(`${ART.slotLabels[slot].toLowerCase()} colour`)"
            />
          </div>
        </section>
      </div>

      <!-- Scene -->
      <div v-else-if="tab === 'scene'" class="space-y-6">
        <section>
          <h2 class="panel-h">Background</h2>
          <TileGrid :model-value="config.background?.id ?? null" :items="sceneTiles" label="Background" :size="72" @update:model-value="setScene" />
        </section>
        <UiButton v-if="hasDino" variant="secondary" size="sm" icon="palette" @click="matchScene">Match my dino</UiButton>
        <UiColorPicker
          v-for="t in sceneTokens"
          :key="t.key"
          :model-value="t.value"
          :label="t.label"
          :presets="t.presets"
          size="sm"
          @update:model-value="setPieceColor(config.background, t.key, $event)"
          @change="studio.commit('background colour')"
        />
      </div>

      <!-- Frame -->
      <div v-else-if="tab === 'frame'" class="space-y-6">
        <section>
          <h2 class="panel-h">Frame</h2>
          <TileGrid :model-value="config.frame?.id ?? null" :items="frameTiles" label="Frame" :size="72" checker @update:model-value="setFrame" />
          <p class="mt-3 text-sm text-ink-muted">Round and shaped frames crop the picture to their outline.</p>
        </section>
        <UiColorPicker
          v-for="t in frameTokens"
          :key="t.key"
          :model-value="t.value"
          :label="t.label"
          :presets="t.presets"
          size="sm"
          @update:model-value="setPieceColor(config.frame, t.key, $event)"
          @change="studio.commit('frame colour')"
        />
      </div>

      <!-- Photo -->
      <div v-else class="space-y-5">
        <section>
          <h2 class="panel-h">Use a photo instead</h2>
          <p class="text-sm text-ink-muted">Put your face where the dino is. The scene and frame still apply.</p>
        </section>
        <input ref="fileInput" type="file" accept="image/jpeg,image/png,image/webp" class="sr-only" tabindex="-1" aria-hidden="true" @change="onFile" />

        <div v-if="config.photo" class="space-y-5">
          <div class="flex items-center gap-4">
            <img :src="config.photo.url" alt="Uploaded photo" class="w-20 h-20 rounded-lg object-cover border-[1.5px] border-ink" />
            <div class="flex flex-wrap gap-2">
              <UiButton variant="secondary" size="sm" icon="upload" @click="choosePhoto">Replace photo</UiButton>
              <UiButton variant="ghost" size="sm" icon="trash" @click="removeOpen = true">Remove</UiButton>
            </div>
          </div>
          <div>
            <p id="avatar-display-label" class="panel-h">Avatar shows</p>
            <UiSegmented
              :model-value="config.display"
              label="Avatar shows"
              block
              :options="[{ value: 'dino', label: 'Show dino', disabled: !hasDino }, { value: 'photo', label: 'Show photo' }]"
              @update:model-value="setDisplay"
            />
          </div>
        </div>
        <div v-else>
          <UiButton variant="secondary" icon="upload" @click="choosePhoto">Upload a photo</UiButton>
          <p class="mt-2 text-xs text-ink-subtle">JPG, PNG or WebP up to 8 MB. It is cropped and resized on this device first.</p>
        </div>
        <p v-if="photoError" role="alert" class="flex gap-2 text-sm font-medium text-danger"><UiIcon name="warning" :size="18" class="shrink-0 mt-0.5" />{{ photoError }}</p>
      </div>
    </template>
  </StudioShell>

  <PhotoCropper v-model="cropOpen" :file="cropFile" :busy="uploading" @confirm="onCropped" @error="onCropError" />

  <!-- Export -->
  <UiModal v-model="exportOpen" title="Export avatar" size="md">
    <div class="grid gap-6 sm:grid-cols-[176px_1fr]">
      <div class="flex flex-col items-center gap-3">
        <div class="bg-checker rounded-lg border border-line p-2">
          <div
            :class="['avatar-mini', exportShape === 'circle' && !hasFrame ? 'avatar-mini--circle' : 'avatar-mini--plain']"
            style="width: 160px; height: 160px"
            role="img"
            aria-label="Export preview"
            v-html="exportSvg"
          />
        </div>
        <UiSegmented
          v-model="exportShape"
          label="Preview crop"
          size="sm"
          :options="[{ value: 'square', label: 'Square' }, { value: 'circle', label: 'Circle' }]"
        />
      </div>
      <div class="space-y-5 min-w-0">
        <div>
          <p class="panel-h">Format</p>
          <UiSegmented v-model="exportFormat" label="Format" :options="[{ value: 'png', label: 'PNG' }, { value: 'svg', label: 'SVG' }]" />
        </div>
        <div v-if="exportFormat === 'png'">
          <p class="panel-h">Size</p>
          <UiSegmented v-model="exportSize" label="Size" size="sm" :options="[128, 256, 512, 1024].map((v) => ({ value: v, label: `${v}` }))" />
          <p class="mt-2 text-xs text-ink-subtle">512 suits Slack and Discord, 1024 for everything else.</p>
        </div>
        <p v-else class="text-sm text-ink-muted">A vector file that stays sharp at any size. Good for posters and print.</p>
        <label v-if="exportFormat === 'png'" class="flex items-center gap-3 text-sm cursor-pointer">
          <input v-model="exportTransparent" type="checkbox" class="h-4 w-4 accent-[rgb(var(--c-ink))]" />
          <span class="font-semibold">Transparent background</span>
        </label>
        <p class="text-xs text-ink-subtle break-all">File: {{ exportName }}</p>
      </div>
    </div>
    <template #footer>
      <UiButton variant="ghost" @click="exportOpen = false">Cancel</UiButton>
      <UiButton icon="download" :loading="exporting" data-autofocus @click="doExport">Download {{ exportFormat.toUpperCase() }}</UiButton>
    </template>
  </UiModal>

  <!-- Reset confirm -->
  <UiModal v-model="resetOpen" title="Reset to the saved avatar?" :description="`This undoes ${studio.stepsSinceSave.value} changes. You can still undo the reset.`" size="sm" role="alertdialog">
    <template #footer>
      <UiButton variant="secondary" data-autofocus @click="resetOpen = false">Keep editing</UiButton>
      <UiButton variant="danger" @click="confirmReset">Reset</UiButton>
    </template>
  </UiModal>

  <!-- Remove photo confirm -->
  <UiModal v-model="removeOpen" title="Remove this photo?" description="The photo is deleted from the server. The dino avatar stays." size="sm" role="alertdialog">
    <template #footer>
      <UiButton variant="secondary" data-autofocus @click="removeOpen = false">Keep photo</UiButton>
      <UiButton variant="danger" icon="trash" :loading="removing" @click="removePhoto">Remove photo</UiButton>
    </template>
  </UiModal>
</template>

<style scoped>
.panel-h {
  font-size: 0.8125rem;
  font-weight: 700;
  color: rgb(var(--c-ink));
  margin-bottom: 0.6rem;
}
.avatar-stage :deep(svg),
.avatar-mini :deep(svg) { display: block; width: 100%; height: 100%; }
.avatar-stage--square :deep(svg) {
  border-radius: 26px;
  box-shadow: 0 0 0 5px rgb(var(--c-keyline)), 6px 8px 0 5px rgb(var(--c-shadow) / 0.9);
}
.avatar-stage--circle :deep(svg) {
  border-radius: 50%;
  box-shadow: 0 0 0 5px rgb(var(--c-keyline)), 6px 8px 0 5px rgb(var(--c-shadow) / 0.9);
}
.avatar-stage--framed :deep(svg) { filter: drop-shadow(5px 7px 0 rgb(var(--c-shadow) / 0.9)); overflow: visible; }
.avatar-mini { overflow: hidden; border-radius: 18%; box-shadow: 0 0 0 3px rgb(var(--c-keyline)); }
.avatar-mini--circle { border-radius: 50%; }
.avatar-mini--plain { border-radius: 0; box-shadow: none; }
</style>
