<!--
  Shirt Studio (/people/:id/shirts/:designId, /team-shirt/:designId with mode="team").
  One ShirtConfig in a studio store (useStudio), drawn by src/lib/shirt for both the preview
  and every export. See docs/ux-spec.md 4.4.
-->
<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  UiButton, UiColorPicker, UiColorSwatch, UiEmptyState, UiIcon, UiIconButton, UiInput, UiModal, UiProgress,
  UiSegmented, UiSelect, UiSkeleton, UiSlider, prefersReducedMotion, contrastRatio, LOW_CONTRAST_THRESHOLD,
} from '../components/ui/index.js'
import StudioShell from '../components/studio/StudioShell.vue'
import ShirtStage from '../components/studio/ShirtStage.vue'
import TileGrid from '../components/studio/TileGrid.vue'
import DinoAvatar from '../components/dino/DinoAvatar.vue'
import { useStudio, useLeaveGuard, useStudioKeys, useIsDesktop, isMac } from '../components/studio/useStudio.js'
import { useAppData } from '../components/layout/useAppData.js'
import { setPageTitle } from '../components/layout/usePageTitle.js'
import { usePersonStore } from '../stores/personStore.js'
import { useDesignStore } from '../stores/designStore.js'
import { useTeamStore } from '../stores/teamStore.js'
import { useToast } from '../composables/useToast.js'
import { ART, downloadBlob, kitSvg, slugify, svgDataUri } from '../lib/art/index.js'
import {
  FONTS, GARMENTS, GARMENT_COLORS, MAX_TEXT, MIN_TEXT, PLACEMENTS, TEMPLATES, TOKENS,
  avatarLayer, blankDesign, buildTemplate, contrastIssues, contrastMessage, decorLayer, dinoLayer, effectiveFont,
  exportMockupPng, exportPrintPng, exportShirtSvg, fixContrast, fontByFamily, garmentById, inksFor, isEmptyDesign,
  layerGeometry, layerId, layerLabel, mockupThumb, normalizeShirtConfig, resolveText, shirtEnv, templateById,
  textLayer, unsupportedChars, artBox,
} from '../lib/shirt/index.js'

const props = defineProps({ mode: { type: String, default: 'person' } })

const route = useRoute()
const router = useRouter()
// UiButton's RouterLink mode drops the href; pass it explicitly so the link is focusable.
const hrefOf = (to) => router.resolve(to).href
const data = useAppData()
const personStore = usePersonStore()
const designStore = useDesignStore()
const teamStore = useTeamStore()
const toast = useToast()
const desktop = useIsDesktop()

const isTeam = computed(() => props.mode === 'team')
const designId = computed(() => String(route.params.designId))
const isNew = computed(() => designId.value === 'new')
const ownerId = computed(() => (isTeam.value ? null : String(route.params.id)))
const owner = computed(() => (ownerId.value ? personStore.getPersonById(ownerId.value) : null))
const people = computed(() => [...personStore.persons].sort((a, b) => a.name.localeCompare(b.name)))

// Who the preview shows: the owner, or (team edition) any teammate.
const previewId = ref(null)
const person = computed(() => (isTeam.value ? personStore.getPersonById(previewId.value) ?? people.value[0] ?? null : owner.value))
const firstName = computed(() => owner.value?.name?.trim().split(/\s+/)[0] ?? 'teammate')
const team = computed(() => ({ name: teamStore.name, year: teamStore.year }))
const roster = computed(() => people.value.map((p) => p.name))
const envFor = (p) => shirtEnv({ person: p, dino: data.dinoFor(p), team: team.value, roster: roster.value })
const env = computed(() => envFor(person.value))

const studio = useStudio({
  draftKey: () => `dino:draft:shirt:${isNew.value ? `new:${ownerId.value ?? 'team'}` : designId.value}`,
})
const { config } = studio
const ready = ref(false)
const missing = ref(false)
const draft = ref(null)
const name = ref('')
const savedName = ref('')
const side = ref('front')
const selectedId = ref(null)

async function init() {
  if (ready.value || missing.value) return
  if (!isTeam.value && !owner.value) { missing.value = true; return }
  let cfg
  let updatedAt = 0
  if (isNew.value) {
    const wanted = templateById(String(route.query.template ?? ''))?.id ?? (isTeam.value ? 'varsity' : 'classic-badge')
    cfg = normalizeShirtConfig(buildTemplate(wanted, { personId: ownerId.value }))
    name.value = isTeam.value ? `${team.value.name} ${team.value.year}` : `${firstName.value}'s ${templateById(wanted).label.toLowerCase()}`
    side.value = templateById(wanted).startSide ?? 'front'
  } else {
    let design = designStore.getDesignById(designId.value)
    if (!design) {
      try { await designStore.fetchDesigns(ownerId.value) } catch { /* handled below */ }
      design = designStore.getDesignById(designId.value)
    }
    if (!design || (design.personId ?? null) !== ownerId.value) { missing.value = true; return }
    cfg = normalizeShirtConfig(design.config)
    name.value = design.name || 'Untitled design'
    updatedAt = Date.parse(design.updatedAt ?? '') || 0
    if (!cfg.sides.front.layers.length && cfg.sides.back.layers.length) side.value = 'back'
  }
  savedName.value = name.value
  studio.load(cfg)
  const d = studio.readDraft()
  if (d && d.at > updatedAt && JSON.stringify(d.config) !== JSON.stringify(cfg)) draft.value = d
  else if (d) studio.clearDraft()
  if (isTeam.value) previewId.value = people.value[0]?.id ?? null
  ready.value = true
  setPageTitle(name.value)
}
watch(() => data.ready.value, (ok) => { if (ok) init() }, { immediate: true })

const draftTime = computed(() =>
  draft.value ? new Date(draft.value.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
)
function restoreDraft() {
  const d = draft.value
  draft.value = null
  if (!d) return
  const merged = normalizeShirtConfig(d.config)
  studio.commit('restore draft', () => { config.value = merged })
  studio.announce('Draft restored')
}
function discardDraft() {
  draft.value = null
  studio.clearDraft()
}

// ── Layers ─────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'template', label: 'Template', icon: 'copy' },
  { id: 'text', label: 'Text', icon: 'type' },
  { id: 'art', label: 'Art', icon: 'image' },
  { id: 'colours', label: 'Colours', icon: 'palette' },
  { id: 'garment', label: 'Garment', icon: 'shirt' },
]
const tab = ref('template')
const layers = computed(() => config.value?.sides[side.value].layers ?? [])
const selected = computed(() => layers.value.find((l) => l.id === selectedId.value) ?? null)
const box = computed(() => artBox(config.value.sides[side.value].placement))
watch([layers, side], () => {
  if (selectedId.value && !layers.value.some((l) => l.id === selectedId.value)) selectedId.value = null
})

function select(id, { fromStage = false } = {}) {
  selectedId.value = id
  const layer = layers.value.find((l) => l.id === id)
  if (!layer) return
  if (fromStage && ['template', 'text', 'art'].includes(tab.value)) tab.value = layer.kind === 'text' ? 'text' : 'art'
  else if (!fromStage) tab.value = layer.kind === 'text' ? 'text' : 'art'
}
function patchLayer(id, patch) {
  const layer = layers.value.find((l) => l.id === id)
  if (layer) Object.assign(layer, patch)
}
const KIND_ICON = { text: 'type', avatar: 'user', dino: 'egg', decor: 'star' }
const labelOf = (layer) => layerLabel(layer, config.value, env.value)

function addLayer(layer, label) {
  // Drop new layers near the middle, nudged so a second one does not hide the first.
  const n = layers.value.length
  layer.y = Math.min(0.85, (layer.y ?? 0.5) + (n % 4) * 0.03)
  studio.commit(label, (c) => { c.sides[side.value].layers.push(layer) })
  selectedId.value = layer.id
}
function addText() {
  const ink = inksFor(config.value.garment.color)
  const small = box.value.w < 2000
  addLayer(textLayer({ text: 'Your text', font: 'Caprasimo', size: small ? 140 : 320, color: ink.main, y: 0.5 }), 'add text')
  tab.value = 'text'
  nextTick(() => document.getElementById(`shirt-text-${selectedId.value}`)?.focus())
}
function addAvatar() { addLayer(avatarLayer({ y: 0.4, w: 0.5 }), 'add avatar') }
function addDino() { addLayer(dinoLayer({ y: 0.4, w: 0.6 }), 'add dino') }
function addDecor(id) {
  if (!id) return
  const item = ART.decorById[id]
  const ink = inksFor(config.value.garment.color)
  const first = Object.keys(item.defaults)[0]
  const colors = contrastRatio(item.defaults[first], config.value.garment.color) < LOW_CONTRAST_THRESHOLD ? { [first]: ink.accent } : {}
  addLayer(decorLayer(id, { colors, y: 0.5, w: 0.22 }), `add ${item.label.toLowerCase()}`)
}
function removeLayer(id = selectedId.value) {
  const layer = layers.value.find((l) => l.id === id)
  if (!layer) return
  const label = labelOf(layer)
  studio.commit(`remove ${label}`, (c) => {
    c.sides[side.value].layers = c.sides[side.value].layers.filter((l) => l.id !== id)
  })
  if (selectedId.value === id) selectedId.value = null
  studio.announce(`Removed ${label}`)
}
function duplicateLayer(id = selectedId.value) {
  const layer = layers.value.find((l) => l.id === id)
  if (!layer) return
  const copy = { ...JSON.parse(JSON.stringify(layer)), id: layerId(), x: Math.min(1.1, layer.x + 0.04), y: Math.min(1.1, layer.y + 0.04) }
  studio.commit('duplicate layer', (c) => {
    const list = c.sides[side.value].layers
    list.splice(list.findIndex((l) => l.id === id) + 1, 0, copy)
  })
  selectedId.value = copy.id
}
function moveLayer(dir, id = selectedId.value) {
  const list = layers.value
  const i = list.findIndex((l) => l.id === id)
  const j = i + dir
  if (i === -1 || j < 0 || j >= list.length) return
  studio.commit(dir > 0 ? 'bring forward' : 'send backward', (c) => {
    const arr = c.sides[side.value].layers
    const [item] = arr.splice(i, 1)
    arr.splice(j, 0, item)
  })
  studio.announce(dir > 0 ? 'Moved forward' : 'Moved backward')
}
function toggleHidden(id = selectedId.value) {
  const layer = layers.value.find((l) => l.id === id)
  if (!layer) return
  studio.commit(layer.hidden ? 'show layer' : 'hide layer', () => { layer.hidden = !layer.hidden })
}

let nudgeTimer = null
function nudge(dx, dy) {
  const layer = selected.value
  if (!layer) return false
  layer.x = Math.round(Math.min(1.3, Math.max(-0.3, layer.x + dx)) * 1000) / 1000
  layer.y = Math.round(Math.min(1.3, Math.max(-0.3, layer.y + dy)) * 1000) / 1000
  clearTimeout(nudgeTimer)
  nudgeTimer = setTimeout(() => studio.commit('nudge layer'), 450)
  return true
}
function flushNudge() {
  if (!nudgeTimer) return
  clearTimeout(nudgeTimer)
  nudgeTimer = null
  studio.commit('nudge layer')
}
function centre(axis) {
  if (!selected.value) return
  studio.commit('centre layer', () => { selected.value[axis] = 0.5 })
}
function undo() { flushNudge(); studio.undo() }
function redo() { flushNudge(); studio.redo() }

// ── Text controls ──────────────────────────────────────────────────────────
const textLayers = computed(() => layers.value.filter((l) => l.kind === 'text'))
const fontOptions = FONTS.map((f) => ({ value: f.family, label: f.label }))
function setFont(layer, family) {
  const font = fontByFamily(family)
  studio.commit('font', () => {
    layer.font = font.family
    if (!font.weights.includes(layer.weight)) layer.weight = font.weights[font.weights.length - 1]
  })
}
const weightLabel = (w) => ({ 400: 'Regular', 500: 'Medium', 600: 'Semibold', 700: 'Bold', 800: 'Extra bold', 900: 'Black' }[w] ?? String(w))
function insertToken(layer, token) {
  const el = document.getElementById(`shirt-text-${layer.id}`)
  const at = el && document.activeElement === el ? el.selectionStart : layer.text.length
  studio.commit('text', () => { layer.text = `${layer.text.slice(0, at)}${token}${layer.text.slice(at)}`.slice(0, 400) })
}
const resolved = (layer) => resolveText(layer, config.value, env.value)
function graduateHint(layer) {
  if (!fontByFamily(layer.font).latin1Only) return ''
  const bad = unsupportedChars(resolved(layer))
  return bad.length ? `Graduate can't draw ${bad.slice(0, 3).join(' ')}. Pick another font for this line.` : ''
}
function shrunk(layer) {
  const g = layerGeometry(layer, config.value, side.value, env.value)
  return g.layout && g.layout.scale < 0.995
}
const usesNumber = computed(() => ['front', 'back'].some((s) => config.value.sides[s].layers.some((l) => l.kind === 'text' && l.text.includes('{number}'))))
const numberValue = computed(() => config.value.numbers?.[person.value?.id] ?? '')
function setNumber(v) {
  if (!person.value) return
  const clean = String(v).replace(/[^0-9A-Za-z]/g, '').slice(0, 3)
  config.value.numbers = { ...config.value.numbers, [person.value.id]: clean }
}
const textInks = computed(() => {
  const ink = inksFor(config.value.garment.color)
  return [...new Set([ink.main, ink.accent, ink.second, '#FFFFFF', '#1E2420', '#F5AE36', '#D2335F', '#1F6B5C'])].slice(0, 8)
})

// ── Art controls ───────────────────────────────────────────────────────────
const decorTiles = computed(() => ART.decor.map((d) => ({ id: d.id, label: d.label, src: svgDataUri(kitSvg(d, {}, { size: 96 })) })))
const DECOR_LABELS = ['Main', 'Detail']
function decorTokens(layer) {
  const item = ART.decorById[layer.decorId]
  if (!item) return []
  return Object.keys(item.defaults).map((key, i) => ({
    key,
    label: DECOR_LABELS[i] ?? `Colour ${i + 1}`,
    value: layer.colors?.[key] ?? item.defaults[key],
    presets: [...new Set([item.defaults[key], ...textInks.value])].slice(0, 8),
  }))
}
const percent = (v) => `${Math.round(v)} percent`

// ── Colours tab: every colour used on this side, editable in one place ─────
const usedColours = computed(() => {
  const map = new Map()
  for (const layer of layers.value) {
    if (layer.kind === 'text') {
      if (!map.has(layer.color)) map.set(layer.color, [])
      map.get(layer.color).push({ layer, key: 'color' })
    } else if (layer.kind === 'decor') {
      const item = ART.decorById[layer.decorId]
      for (const key of Object.keys(item?.defaults ?? {})) {
        const hex = layer.colors?.[key] ?? item.defaults[key]
        if (!map.has(hex)) map.set(hex, [])
        map.get(hex).push({ layer, key })
      }
    }
  }
  return [...map.entries()].map(([hex, uses], i) => ({
    id: i,
    hex,
    uses,
    label: [...new Set(uses.map((x) => labelOf(x.layer)))].slice(0, 3).join(', '),
  }))
})
function recolour(entry, hex) {
  for (const use of entry.uses) {
    if (use.key === 'color') use.layer.color = hex
    else use.layer.colors = { ...(use.layer.colors ?? {}), [use.key]: hex }
  }
}

// ── Contrast ───────────────────────────────────────────────────────────────
const issues = computed(() => (config.value ? contrastIssues(config.value, side.value) : []))
const issueText = computed(() => (issues.value.length ? contrastMessage(issues.value[0], config.value.garment.color) : ''))
function fixIt() {
  studio.commit('fix contrast', (c) => { fixContrast(c, side.value) })
  studio.announce('Colours swapped for ones that read on this garment')
}

// ── Template ───────────────────────────────────────────────────────────────
const templateThumbs = ref({})
let thumbRun = 0
async function refreshThumbs() {
  if (!config.value || tab.value !== 'template') return
  const run = ++thumbRun
  for (const t of TEMPLATES) {
    const cfg = normalizeShirtConfig(buildTemplate(t.id, { garment: config.value.garment, personId: person.value?.id }))
    try {
      const url = await mockupThumb(cfg, t.startSide ?? 'front', env.value, 300, { focus: 1.5 })
      if (run !== thumbRun) return
      templateThumbs.value = { ...templateThumbs.value, [t.id]: url }
    } catch { /* thumbnail is optional */ }
  }
}
watch([tab, () => config.value?.garment.color, () => config.value?.garment.type, () => person.value?.id, ready], refreshThumbs, { immediate: true })
const templateTiles = computed(() => TEMPLATES.map((t) => ({ id: t.id, label: t.label, src: templateThumbs.value[t.id] })))
const pendingTemplate = ref(null)
function chooseTemplate(id) {
  if (!id) return
  if (isEmptyDesign(config.value)) applyTemplate(id)
  else pendingTemplate.value = id
}
function applyTemplate(id) {
  pendingTemplate.value = null
  const t = templateById(id)
  const next = normalizeShirtConfig(buildTemplate(id, { garment: config.value.garment, personId: person.value?.id, numbers: config.value.numbers }))
  studio.commit(`${t.label} template`, () => { config.value = next })
  side.value = t.startSide ?? 'front'
  selectedId.value = null
  studio.announce(`Applied the ${t.label} template`)
}
function startBlank() {
  const next = normalizeShirtConfig(blankDesign(config.value.garment))
  studio.commit('blank design', () => { config.value = next })
  selectedId.value = null
}

// ── Garment ────────────────────────────────────────────────────────────────
function setGarmentType(type) {
  studio.commit('garment', (c) => { c.garment.type = type })
}
const placementOptions = computed(() =>
  Object.entries(PLACEMENTS).filter(([, p]) => p.sides.includes(side.value)).map(([value, p]) => ({ value, label: p.label })),
)
function setPlacement(value) {
  studio.commit('print area', (c) => { c.sides[side.value].placement = value })
}
const garmentNote = computed(() => (side.value === 'back' ? garmentById(config.value.garment.type).note ?? '' : ''))

// ── Stage ──────────────────────────────────────────────────────────────────
const zoom = ref('art')
const showSafe = ref(true)
const stageLabel = computed(() => {
  if (!config.value) return 'Shirt preview'
  const g = garmentById(config.value.garment.type).label
  const names = layers.value.filter((l) => !l.hidden).map(labelOf)
  return `${g}, ${side.value}. ${names.length ? `Layers: ${names.join(', ')}` : 'No layers on this side yet'}.`
})
function switchSide(s) {
  side.value = s
  selectedId.value = null
}
function stepPerson(dir) {
  const list = people.value
  if (!list.length) return
  const i = list.findIndex((p) => p.id === person.value?.id)
  previewId.value = list[(i + dir + list.length) % list.length].id
}

// ── Name ───────────────────────────────────────────────────────────────────
const renaming = ref(false)
const nameInput = ref(null)
function startRename() {
  renaming.value = true
  nextTick(() => { nameInput.value?.focus(); nameInput.value?.select() })
}
function endRename() {
  renaming.value = false
  name.value = name.value.trim().slice(0, 60) || savedName.value || 'Untitled design'
  setPageTitle(name.value)
}

// ── Save ───────────────────────────────────────────────────────────────────
const saving = ref(false)
const dirty = computed(() => studio.dirty.value || name.value !== savedName.value)
async function save() {
  if (saving.value || !config.value) return false
  flushNudge()
  saving.value = true
  const snapshot = JSON.parse(JSON.stringify(config.value))
  const title = name.value.trim().slice(0, 60) || 'Untitled design'
  try {
    if (isNew.value) {
      const created = await designStore.createDesign({ personId: ownerId.value, name: title, kind: 'shirt', config: snapshot })
      studio.markSaved(snapshot)
      savedName.value = title
      toast.success('Design saved')
      guard.allowNext()
      await router.replace(isTeam.value ? `/team-shirt/${created.id}` : `/people/${ownerId.value}/shirts/${created.id}`)
    } else {
      await designStore.updateDesign(designId.value, { name: title, config: snapshot })
      studio.markSaved(snapshot)
      savedName.value = title
      toast.success('Design saved')
    }
    draft.value = null
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
const guard = useLeaveGuard(dirty, { save, discard: () => studio.clearDraft() })

// ── Export ─────────────────────────────────────────────────────────────────
const exportOpen = ref(false)
const exportKind = ref('print')
const exportBusy = ref(false)
const exportPreview = ref('')
const EXPORT_KINDS = [
  { value: 'print', title: 'Print file', detail: 'PNG, 4500×5400, transparent, 300 DPI. Hard edges, ready for a print shop.' },
  { value: 'svg', title: 'Vector', detail: 'SVG, text as outlines. For a local printer or further editing.' },
  { value: 'mockup', title: 'Mockup preview', detail: 'PNG, 1600×1600. The garment with your design, for sharing.' },
]
const designSlug = computed(() => slugify(name.value, 'design'))
const sidesWithArt = computed(() => ['front', 'back'].filter((s) => config.value.sides[s].layers.some((l) => !l.hidden)))
const exportSides = ref('current')
const exportSideList = computed(() => (exportSides.value === 'both' ? sidesWithArt.value : [side.value]))
const fileName = (p, s, kind) => {
  const ext = kind === 'svg' ? 'svg' : 'png'
  const suffix = kind === 'mockup' ? `${s}-mockup` : s
  return `${slugify(p?.name, 'teammate')}-${designSlug.value}-${suffix}.${ext}`
}
async function openExport() {
  if (!ready.value) return
  flushNudge()
  exportSides.value = 'current'
  exportOpen.value = true
  try { exportPreview.value = await mockupThumb(config.value, side.value, env.value, 360) } catch { exportPreview.value = '' }
}
async function exportOne(kind, s, e) {
  if (kind === 'print') return { blob: await exportPrintPng(config.value, s, e) }
  if (kind === 'mockup') return { blob: await exportMockupPng(config.value, s, e) }
  const out = await exportShirtSvg(config.value, s, e)
  return { blob: new Blob([out.svg], { type: 'image/svg+xml' }), outlined: out.outlined, missing: out.missingGlyphs }
}
const pause = (ms) => new Promise((r) => setTimeout(r, ms))
async function doExport() {
  exportBusy.value = true
  try {
    let liveText = false
    let last = ''
    for (const s of exportSideList.value) {
      const out = await exportOne(exportKind.value, s, env.value)
      if (out.outlined === false) liveText = true
      last = fileName(person.value, s, exportKind.value)
      downloadBlob(out.blob, last)
      await pause(250)
    }
    exportOpen.value = false
    if (liveText) toast.warning('Text is still live text', 'The font files could not be read, so the printer needs the fonts installed.')
    else toast.success(exportSideList.value.length > 1 ? `${exportSideList.value.length} files ready` : `Downloaded ${last}`)
    burst()
  } catch {
    toast.error('Export failed', 'The design could not be drawn. Try again.')
  } finally {
    exportBusy.value = false
  }
}

// Team edition: one print file per person.
const batch = ref({ open: false, done: 0, total: 0, current: '', cancelled: false })
async function exportEveryone() {
  const list = people.value
  if (!list.length) return
  flushNudge()
  exportOpen.value = false
  const sides = sidesWithArt.value.length ? sidesWithArt.value : [side.value]
  batch.value = { open: true, done: 0, total: list.length, current: '', cancelled: false }
  let files = 0
  try {
    for (const p of list) {
      if (batch.value.cancelled) break
      batch.value.current = p.name
      const e = envFor(p)
      for (const s of sides) {
        const blob = await exportPrintPng(config.value, s, e)
        const base = `${designSlug.value}-${slugify(p.name, `teammate-${String(p.id).slice(0, 6)}`)}`
        downloadBlob(blob, sides.length > 1 ? `${base}-${s}.png` : `${base}.png`)
        files += 1
        await pause(350) // browsers drop downloads fired in the same tick
      }
      batch.value.done += 1
    }
    const stopped = batch.value.cancelled
    batch.value.open = false
    if (stopped) toast.show({ title: `Stopped after ${files} print files` })
    else {
      toast.success(`${files} print files ready`)
      burst()
    }
  } catch {
    batch.value.open = false
    toast.error('Export failed', `Stopped at ${batch.value.current}. Try again.`)
  }
}

// Confetti: 8 pieces, 1.2 s, skipped under reduced motion.
const confetti = ref([])
function burst() {
  if (prefersReducedMotion()) return
  const colours = ['#F5AE36', '#D2335F', '#56A44C', '#3A91BA', '#FFF7E6']
  confetti.value = Array.from({ length: 8 }, (_, i) => ({
    id: `${Date.now()}-${i}`,
    left: 50 + (i - 3.5) * 5,
    drift: `${(i - 3.5) * 26}px`,
    color: colours[i % colours.length],
    delay: `${i * 30}ms`,
  }))
  setTimeout(() => { confetti.value = [] }, 1500)
}

// ── Keyboard ───────────────────────────────────────────────────────────────
const helpOpen = ref(false)
const mod = isMac() ? '⌘' : 'Ctrl'
const SHORTCUTS = [
  {
    title: 'Layers',
    items: [
      [['←', '↑', '→', '↓'], 'Nudge 1% of the print area'],
      [['Shift', '←'], 'Nudge 5%'],
      [['['], 'Move layer down'],
      [[']'], 'Move layer up'],
      [['Delete'], 'Remove layer'],
      [['Esc'], 'Deselect'],
    ],
  },
  {
    title: 'Studio',
    items: [
      [['F'], 'Front'],
      [['B'], 'Back'],
      [['1', '–', '5'], 'Switch tab'],
      [[mod, 'Z'], 'Undo'],
      [[mod, 'Shift', 'Z'], 'Redo'],
      [[mod, 'S'], 'Save design'],
      [[mod, 'E'], 'Export'],
      [['?'], 'This list'],
    ],
  },
]
const arrow = (dx, dy) => (e) => {
  // Arrow keys belong to sliders, radios and tabs when one of those has focus.
  const t = e.target
  if (t?.closest?.('[role="radiogroup"],[role="tablist"],input,select,[role="application"]')) return false
  const step = e.shiftKey ? 0.05 : 0.01
  return nudge(dx * step, dy * step)
}
const tabKeys = Object.fromEntries(TABS.map((t, i) => [String(i + 1), () => { tab.value = t.id }]))
useStudioKeys({
  undo,
  redo,
  save,
  export: openExport,
  help: () => { helpOpen.value = true },
  keys: {
    ...tabKeys,
    f: () => switchSide('front'),
    b: () => switchSide('back'),
    '[': () => moveLayer(-1),
    ']': () => moveLayer(1),
    Delete: () => (selected.value ? removeLayer() : false),
    Backspace: () => (selected.value ? removeLayer() : false),
    Escape: () => { if (!selectedId.value) return false; selectedId.value = null },
    ArrowLeft: arrow(-1, 0),
    ArrowRight: arrow(1, 0),
    ArrowUp: arrow(0, -1),
    ArrowDown: arrow(0, 1),
  },
})
onBeforeUnmount(() => clearTimeout(nudgeTimer))

const backTo = computed(() => (isTeam.value ? '/insights' : `/people/${ownerId.value}/shirts`))
const backLabel = computed(() => (isTeam.value ? 'Back to insights' : `${firstName.value}'s shirts`))
</script>

<template>
  <!-- Loading -->
  <div v-if="!ready && !missing && !data.failed.value" class="fixed inset-0 z-[45] bg-bg flex flex-col" aria-busy="true">
    <div class="theme-jungle h-14 bg-bg border-b-[1.5px] border-jungle-950" />
    <div class="flex-1 grid lg:grid-cols-[1fr_440px]">
      <div class="theme-jungle bg-specimen grid place-items-center p-8"><UiSkeleton shape="rect" width="min(380px, 70vw)" height="min(440px, 60vh)" /></div>
      <div class="hidden lg:block p-5 space-y-4 bg-surface border-l-[1.5px] border-ink">
        <UiSkeleton shape="rect" height="44px" /><UiSkeleton :lines="3" /><UiSkeleton shape="rect" height="160px" />
      </div>
    </div>
  </div>

  <div v-else-if="!ready" class="min-h-dvh grid place-items-center p-6">
    <UiEmptyState v-if="data.failed.value" tone="error" title="Couldn't reach the server" text="Check your connection and try again.">
      <template #action><UiButton @click="data.retry()">Try again</UiButton></template>
    </UiEmptyState>
    <UiEmptyState v-else title="This design went extinct" text="We can't find that shirt design. It may have been deleted.">
      <template #action><UiButton :to="isTeam ? '/' : ownerId && owner ? `/people/${ownerId}/shirts` : '/'" :href="hrefOf(isTeam ? '/' : ownerId && owner ? `/people/${ownerId}/shirts` : '/')">{{ owner ? `Back to ${firstName}'s shirts` : 'Back to the team' }}</UiButton></template>
    </UiEmptyState>
  </div>

  <StudioShell
    v-else
    v-model:tab="tab"
    v-model:help-open="helpOpen"
    :title="name"
    :back-to="backTo"
    :back-label="backLabel"
    :back-short="isTeam ? 'Back' : 'Shirts'"
    :tabs="TABS"
    :can-undo="studio.canUndo.value"
    :can-redo="studio.canRedo.value"
    :dirty="dirty"
    :saving="saving"
    save-label="Save design"
    save-short="Save"
    :announcement="studio.announcement.value"
    :leave-open="guard.open.value"
    :shortcuts="SHORTCUTS"
    panel-label="Shirt controls"
    id-prefix="shirt"
    @undo="undo"
    @redo="redo"
    @export="openExport"
    @save="save"
    @leave="guard.choose"
  >
    <template #title>
      <span v-if="!renaming" class="inline-flex items-center gap-1 min-w-0 max-w-full">
        <span class="truncate">{{ name }}</span>
        <UiIconButton icon="edit" label="Rename design" size="sm" class="shrink-0" @click="startRename" />
      </span>
      <input
        v-else
        ref="nameInput"
        v-model="name"
        type="text"
        maxlength="60"
        aria-label="Design name"
        class="name-input"
        @blur="endRename"
        @keydown.enter.prevent="endRename"
        @keydown.esc.stop.prevent="name = savedName; endRename()"
      />
    </template>

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
      <div class="flex-1 min-h-0 flex flex-col">
        <!-- stage toolbar -->
        <div class="shrink-0 flex flex-wrap items-center gap-2 px-3 pt-3 lg:px-5 lg:pt-4">
          <UiSegmented
            :model-value="side"
            label="Print side"
            size="sm"
            :options="[{ value: 'front', label: 'Front' }, { value: 'back', label: 'Back' }]"
            @update:model-value="switchSide"
          />
          <div v-if="isTeam && people.length" class="flex items-center gap-1 min-w-0">
            <UiIconButton icon="chevron-left" label="Previous teammate" size="sm" @click="stepPerson(-1)" />
            <div class="w-40 sm:w-48">
              <UiSelect
                :model-value="person?.id"
                size="sm"
                aria-label="Preview as"
                :options="people.map((p) => ({ value: p.id, label: p.name }))"
                @update:model-value="previewId = $event"
              />
            </div>
            <UiIconButton icon="chevron-right" label="Next teammate" size="sm" @click="stepPerson(1)" />
          </div>
          <div class="ml-auto flex items-center gap-1">
            <UiIconButton icon="eye" :label="showSafe ? 'Hide safe area' : 'Show safe area'" size="sm" :pressed="showSafe" @click="showSafe = !showSafe" />
            <UiSegmented
              v-model="zoom"
              label="Zoom"
              size="sm"
              :options="[{ value: 'art', label: 'Design' }, { value: 'garment', label: 'Garment' }]"
            />
          </div>
        </div>

        <!-- team filmstrip -->
        <div v-if="isTeam && people.length > 1" class="shrink-0 hidden sm:flex gap-2 px-5 pt-3 overflow-x-auto" role="group" aria-label="Preview a teammate">
          <button
            v-for="p in people"
            :key="p.id"
            type="button"
            :aria-pressed="String(p.id === person?.id)"
            :aria-label="`Preview ${p.name}`"
            :title="p.name"
            :class="['film', p.id === person?.id ? 'film--on' : '']"
            @click="previewId = p.id"
          >
            <DinoAvatar :person="p" :dino="data.dinoFor(p)" :size="36" shape="circle" />
          </button>
        </div>

        <div class="flex-1 min-h-0 px-2 py-2 lg:px-6 lg:py-4">
          <ShirtStage
            :config="config"
            :side="side"
            :env="env"
            :selected-id="selectedId"
            :zoom="zoom"
            :show-safe="showSafe"
            :handles="desktop"
            :label="stageLabel"
            @select="select($event, { fromStage: true })"
            @update="patchLayer"
            @commit="studio.commit($event)"
            @cancel="studio.revertLive()"
          />
        </div>

        <!-- low contrast -->
        <div v-if="issues.length" class="shrink-0 mx-3 lg:mx-5 mb-2 flex items-center gap-3 rounded-md bg-warning-soft text-ink px-3 py-2 border border-line-strong" role="status">
          <UiIcon name="warning" :size="18" class="shrink-0 text-warning" />
          <p class="flex-1 text-sm font-medium">{{ issueText }}</p>
          <UiButton size="sm" variant="secondary" class="shrink-0" @click="fixIt">Fix it</UiButton>
        </div>

        <!-- layers row -->
        <div class="shrink-0 flex items-center gap-2 px-3 pb-3 lg:px-5 lg:pb-4 min-w-0">
          <span class="hidden sm:block text-xs font-bold text-ink-muted shrink-0">Layers</span>
          <div class="flex-1 min-w-0 flex gap-1.5 overflow-x-auto py-1" role="group" aria-label="Layers, bottom to top">
            <button
              v-for="layer in layers"
              :key="layer.id"
              type="button"
              :aria-pressed="String(layer.id === selectedId)"
              :class="['chip', layer.id === selectedId ? 'chip--on' : '', layer.hidden ? 'chip--hidden' : '']"
              @click="select(layer.id)"
            >
              <UiIcon :name="KIND_ICON[layer.kind]" :size="14" />
              <span class="truncate max-w-[9rem]">{{ labelOf(layer) }}</span>
              <span v-if="layer.hidden" class="sr-only">(hidden)</span>
            </button>
            <p v-if="!layers.length" class="text-sm text-ink-muted py-1">Nothing on the {{ side }} yet. Pick a template or add text and art.</p>
          </div>
          <div v-if="selected" class="shrink-0 flex items-center">
            <UiIconButton icon="chevron-left" label="Move layer down" size="sm" :disabled="layers[0]?.id === selectedId" @click="moveLayer(-1)" />
            <UiIconButton icon="chevron-right" label="Move layer up" size="sm" :disabled="layers[layers.length - 1]?.id === selectedId" @click="moveLayer(1)" />
            <UiIconButton icon="eye" :label="selected.hidden ? 'Show layer' : 'Hide layer'" size="sm" :pressed="!selected.hidden" @click="toggleHidden()" />
            <UiIconButton icon="copy" label="Duplicate layer" size="sm" class="hidden sm:inline-flex" @click="duplicateLayer()" />
            <UiIconButton icon="trash" label="Remove layer" size="sm" @click="removeLayer()" />
          </div>
        </div>
      </div>
    </template>

    <template #panel>
      <!-- Template -->
      <div v-if="tab === 'template'" class="space-y-5">
        <section>
          <h2 class="panel-h">Templates</h2>
          <TileGrid
            :model-value="templateById(config.template)?.id ?? null"
            :items="templateTiles"
            label="Template"
            :size="120"
            wide
            caption
            @update:model-value="chooseTemplate"
          />
        </section>
        <p class="text-sm text-ink-muted">{{ templateById(config.template)?.blurb ?? 'A blank design. Add text and art from the other tabs.' }}</p>
        <UiButton variant="ghost" size="sm" icon="x" @click="isEmptyDesign(config) ? null : (pendingTemplate = 'blank')">Start from blank</UiButton>
      </div>

      <!-- Text -->
      <div v-else-if="tab === 'text'" class="space-y-4">
        <div v-if="usesNumber && person" class="rounded-lg bg-surface-sunken border border-line p-3">
          <label class="block text-sm font-bold mb-1.5" for="shirt-number">Number for {{ person.name }}</label>
          <UiInput
            id="shirt-number"
            :model-value="numberValue"
            size="sm"
            inputmode="numeric"
            maxlength="3"
            placeholder="07"
            class="max-w-[7rem]"
            @update:model-value="setNumber"
            @change="studio.commit('number')"
            @blur="studio.commit('number')"
          />
        </div>

        <article
          v-for="layer in textLayers"
          :key="layer.id"
          :class="['card', layer.id === selectedId ? 'card--on' : '']"
        >
          <div class="flex items-start gap-2">
            <div class="flex-1 min-w-0">
              <label class="sr-only" :for="`shirt-text-${layer.id}`">Text</label>
              <UiInput
                :id="`shirt-text-${layer.id}`"
                :model-value="layer.text"
                size="sm"
                maxlength="400"
                @focus="selectedId = layer.id"
                @update:model-value="layer.text = $event"
                @change="studio.commit('text')"
                @blur="studio.commit('text')"
              />
              <p v-if="layer.text.includes('{') && resolved(layer)" class="mt-1 text-xs text-ink-subtle truncate">Shows as: {{ resolved(layer).split('\n').slice(0, 2).join(', ') }}{{ resolved(layer).split('\n').length > 2 ? '…' : '' }}</p>
            </div>
            <UiIconButton v-if="layer.id !== selectedId" icon="edit" :label="`Edit ${labelOf(layer)}`" size="sm" @click="selectedId = layer.id" />
            <UiIconButton v-else icon="trash" :label="`Remove ${labelOf(layer)}`" size="sm" @click="removeLayer(layer.id)" />
          </div>

          <div v-if="layer.id === selectedId" class="mt-3 space-y-4">
            <div class="flex flex-wrap gap-1.5" role="group" aria-label="Insert a placeholder">
              <button v-for="t in TOKENS" :key="t.token" type="button" class="token" @click="insertToken(layer, t.token)">+ {{ t.label }}</button>
            </div>
            <div class="grid grid-cols-[1fr_auto] gap-2 items-end">
              <div>
                <label class="field-l" :for="`shirt-font-${layer.id}`">Font</label>
                <UiSelect :id="`shirt-font-${layer.id}`" :model-value="layer.font" size="sm" :options="fontOptions" @update:model-value="setFont(layer, $event)" />
              </div>
              <UiSegmented
                v-if="fontByFamily(layer.font).weights.length > 1"
                :model-value="layer.weight"
                label="Weight"
                size="sm"
                :options="fontByFamily(layer.font).weights.map((w) => ({ value: w, label: weightLabel(w) }))"
                @update:model-value="studio.commit('weight', () => { layer.weight = $event })"
              />
            </div>
            <p v-if="graduateHint(layer)" class="flex gap-2 text-sm font-medium text-ink" role="status">
              <UiIcon name="info" :size="18" class="shrink-0 mt-0.5 text-info" />{{ graduateHint(layer) }}
            </p>
            <UiSlider
              :model-value="layer.size"
              label="Size"
              :min="MIN_TEXT"
              :max="box.w < 2000 ? 600 : MAX_TEXT"
              :step="10"
              :format="(v) => `${v} px`"
              @update:model-value="layer.size = $event"
              @change="studio.commit('text size')"
            />
            <p v-if="shrunk(layer)" class="-mt-2 text-xs text-ink-subtle">Shrunk to fit the print area.</p>
            <UiSlider
              :model-value="layer.tracking"
              label="Letter spacing"
              :min="-50"
              :max="400"
              :step="10"
              :format="(v) => `${v}`"
              @update:model-value="layer.tracking = $event"
              @change="studio.commit('letter spacing')"
            />
            <UiSlider
              :model-value="layer.arc"
              label="Curve"
              :min="-100"
              :max="100"
              :step="2"
              :format="(v) => (v === 0 ? 'Straight' : v > 0 ? `Arch ${v}` : `Smile ${-v}`)"
              @update:model-value="layer.arc = $event"
              @change="studio.commit('text curve')"
            />
            <UiSlider
              :model-value="layer.rotate"
              label="Rotate"
              :min="-180"
              :max="180"
              :step="1"
              :format="(v) => `${v} degrees`"
              @update:model-value="layer.rotate = $event"
              @change="studio.commit('rotate layer')"
            />
            <div class="flex flex-wrap items-center gap-2">
              <UiSegmented
                :model-value="layer.case"
                label="Letter case"
                size="sm"
                :options="[{ value: 'none', label: 'As typed' }, { value: 'upper', label: 'UPPERCASE' }]"
                @update:model-value="studio.commit('letter case', () => { layer.case = $event })"
              />
              <UiButton variant="ghost" size="sm" @click="centre('x')">Centre</UiButton>
            </div>
            <UiColorPicker
              :model-value="layer.color"
              label="Text colour"
              :presets="textInks"
              :contrast-with="config.garment.color"
              size="sm"
              @update:model-value="layer.color = $event"
              @change="studio.commit('text colour')"
            />
          </div>
        </article>

        <p v-if="!textLayers.length" class="text-sm text-ink-muted">No text on the {{ side }} yet.</p>
        <UiButton variant="secondary" icon="plus" block @click="addText">Add text</UiButton>
      </div>

      <!-- Art -->
      <div v-else-if="tab === 'art'" class="space-y-6">
        <section v-if="selected && selected.kind !== 'text'" class="card card--on space-y-4">
          <div class="flex items-center justify-between gap-2">
            <h2 class="text-sm font-bold flex items-center gap-2"><UiIcon :name="KIND_ICON[selected.kind]" :size="16" />{{ labelOf(selected) }}</h2>
            <UiIconButton icon="trash" :label="`Remove ${labelOf(selected)}`" size="sm" @click="removeLayer()" />
          </div>
          <UiSlider
            :model-value="Math.round(selected.w * 100)"
            label="Size"
            :min="4"
            :max="140"
            :format="percent"
            @update:model-value="selected.w = $event / 100"
            @change="studio.commit('resize layer')"
          />
          <UiSlider
            :model-value="selected.rotate"
            label="Rotate"
            :min="-180"
            :max="180"
            :format="(v) => `${v} degrees`"
            @update:model-value="selected.rotate = $event"
            @change="studio.commit('rotate layer')"
          />
          <div class="flex flex-wrap gap-2">
            <UiButton variant="ghost" size="sm" @click="centre('x')">Centre</UiButton>
            <template v-if="selected.kind === 'dino'">
              <UiButton variant="ghost" size="sm" :aria-pressed="String(selected.gear !== false)" @click="studio.commit('gear', () => { selected.gear = selected.gear === false })">
                {{ selected.gear !== false ? 'Hide gear' : 'Show gear' }}
              </UiButton>
              <UiButton variant="ghost" size="sm" @click="studio.commit('flip dino', () => { selected.flip = !selected.flip })">Flip</UiButton>
            </template>
          </div>
          <p v-if="selected.kind === 'avatar'" class="text-xs text-ink-subtle">Shows the saved avatar. Change how it looks in the Avatar Studio.</p>
          <UiColorPicker
            v-for="t in selected.kind === 'decor' ? decorTokens(selected) : []"
            :key="t.key"
            :model-value="t.value"
            :label="t.label"
            :presets="t.presets"
            :contrast-with="t.key.endsWith('-1') ? config.garment.color : ''"
            size="sm"
            @update:model-value="selected.colors = { ...(selected.colors ?? {}), [t.key]: $event }"
            @change="studio.commit('decor colour')"
          />
        </section>

        <section>
          <h2 class="panel-h">Add your dino</h2>
          <div class="grid grid-cols-2 gap-2">
            <UiButton variant="secondary" size="sm" icon="user" @click="addAvatar">Avatar</UiButton>
            <UiButton variant="secondary" size="sm" icon="egg" @click="addDino">Whole dino</UiButton>
          </div>
        </section>
        <section>
          <h2 class="panel-h">Add decor</h2>
          <TileGrid :model-value="null" :items="decorTiles" label="Add decor" :size="64" checker @update:model-value="addDecor" />
        </section>
      </div>

      <!-- Colours -->
      <div v-else-if="tab === 'colours'" class="space-y-6">
        <div v-if="issues.length" class="flex items-start gap-3 rounded-md bg-warning-soft px-3 py-2.5 border border-line-strong">
          <UiIcon name="warning" :size="18" class="shrink-0 mt-0.5 text-warning" />
          <div class="flex-1 text-sm">
            <p class="font-medium">{{ issueText }}</p>
            <UiButton size="sm" variant="secondary" class="mt-2" @click="fixIt">Fix it</UiButton>
          </div>
        </div>
        <p v-if="!usedColours.length" class="text-sm text-ink-muted">Text and decor colours on the {{ side }} show up here. The avatar and dino keep their own colours.</p>
        <UiColorPicker
          v-for="entry in usedColours"
          :key="entry.id"
          :model-value="entry.hex"
          :label="entry.label"
          :presets="textInks"
          :contrast-with="config.garment.color"
          size="sm"
          @update:model-value="recolour(entry, $event)"
          @change="studio.commit('recolour')"
        />
      </div>

      <!-- Garment -->
      <div v-else class="space-y-6">
        <section>
          <h2 class="panel-h">Garment</h2>
          <UiSegmented
            :model-value="config.garment.type"
            label="Garment"
            block
            :options="GARMENTS.map((g) => ({ value: g.id, label: g.label }))"
            @update:model-value="setGarmentType"
          />
          <p v-if="garmentNote" class="mt-2 text-xs text-ink-subtle">{{ garmentNote }}</p>
        </section>
        <UiColorPicker
          :model-value="config.garment.color"
          label="Garment colour"
          :presets="GARMENT_COLORS"
          @update:model-value="config.garment.color = $event"
          @change="studio.commit('garment colour')"
        />
        <section>
          <label class="panel-h block" for="shirt-placement">Print area ({{ side }})</label>
          <UiSelect id="shirt-placement" :model-value="config.sides[side].placement" :options="placementOptions" @update:model-value="setPlacement" />
          <p class="mt-2 text-xs text-ink-subtle">Layers keep their place inside the print area, so switching rescales the whole design.</p>
        </section>
      </div>
    </template>
  </StudioShell>

  <!-- Replace with template -->
  <UiModal
    :model-value="!!pendingTemplate"
    :title="pendingTemplate === 'blank' ? 'Clear your design?' : `Replace your design with ${templateById(pendingTemplate)?.label}?`"
    description="Both sides are replaced. You can undo this."
    size="sm"
    role="alertdialog"
    @update:model-value="pendingTemplate = null"
  >
    <template #footer>
      <UiButton variant="secondary" data-autofocus @click="pendingTemplate = null">Keep my design</UiButton>
      <UiButton @click="pendingTemplate === 'blank' ? (pendingTemplate = null, startBlank()) : applyTemplate(pendingTemplate)">
        {{ pendingTemplate === 'blank' ? 'Clear design' : 'Replace design' }}
      </UiButton>
    </template>
  </UiModal>

  <!-- Export -->
  <UiModal v-model="exportOpen" title="Export design" size="lg">
    <div class="grid gap-6 sm:grid-cols-[200px_1fr]">
      <div class="hidden sm:block">
        <div class="rounded-lg border border-line bg-surface-sunken aspect-square overflow-hidden grid place-items-center">
          <img v-if="exportPreview" :src="exportPreview" alt="" class="w-full h-full object-contain" />
          <UiSkeleton v-else shape="rect" height="100%" />
        </div>
        <p class="mt-2 text-xs text-ink-subtle text-center">{{ person?.name }}, {{ side }}</p>
      </div>
      <div class="space-y-4 min-w-0">
        <div role="radiogroup" aria-label="What to export" class="space-y-2">
          <label v-for="k in EXPORT_KINDS" :key="k.value" :class="['kind', exportKind === k.value ? 'kind--on' : '']">
            <input v-model="exportKind" type="radio" name="export-kind" :value="k.value" class="mt-1 accent-[rgb(var(--c-ink))]" />
            <span><span class="block font-bold">{{ k.title }}</span><span class="block text-sm text-ink-muted">{{ k.detail }}</span></span>
          </label>
        </div>
        <UiSegmented
          v-if="sidesWithArt.length > 1"
          v-model="exportSides"
          label="Sides"
          size="sm"
          :options="[{ value: 'current', label: `Just the ${side}` }, { value: 'both', label: 'Front and back' }]"
        />
        <p v-if="issues.length && exportKind !== 'mockup'" class="flex gap-2 text-sm"><UiIcon name="warning" :size="18" class="shrink-0 mt-0.5 text-warning" />{{ issueText }}</p>
        <p class="text-xs text-ink-subtle break-all">File: {{ fileName(person, exportSideList[0] ?? side, exportKind) }}</p>
      </div>
    </div>
    <template #footer>
      <UiButton v-if="isTeam && people.length" variant="secondary" icon="users" class="mr-auto" :disabled="exportBusy" @click="exportEveryone">Export for everyone</UiButton>
      <UiButton variant="ghost" @click="exportOpen = false">Cancel</UiButton>
      <UiButton icon="download" :loading="exportBusy" data-autofocus @click="doExport">Download {{ exportKind === 'svg' ? 'SVG' : 'PNG' }}</UiButton>
    </template>
  </UiModal>

  <!-- Team batch progress -->
  <UiModal :model-value="batch.open" title="Exporting team shirts" size="sm" :dismissible="false">
    <UiProgress :value="batch.done" :max="Math.max(1, batch.total)" :label="`Exporting team shirts, ${Math.min(batch.done + 1, batch.total)} of ${batch.total}`" />
    <p class="mt-3 text-sm text-ink-muted">{{ batch.current }}. Your browser may ask to allow several downloads.</p>
    <template #footer>
      <UiButton variant="secondary" @click="batch.cancelled = true">Stop</UiButton>
    </template>
  </UiModal>

  <div v-if="confetti.length" class="fixed inset-x-0 top-12 z-toast pointer-events-none" aria-hidden="true">
    <span
      v-for="c in confetti"
      :key="c.id"
      class="absolute w-2.5 h-3.5 rounded-[2px] animate-confetti-fall"
      :style="{ left: `${c.left}%`, background: c.color, '--drift': c.drift, animationDelay: c.delay }"
    />
  </div>
</template>

<style scoped>
.panel-h { font-size: 0.8125rem; font-weight: 700; color: rgb(var(--c-ink)); margin-bottom: 0.6rem; }
.field-l { display: block; font-size: 0.75rem; font-weight: 600; color: rgb(var(--c-ink-muted)); margin-bottom: 0.25rem; }
.name-input {
  width: min(22rem, 100%);
  height: 2.1rem;
  padding: 0 0.6rem;
  font: inherit;
  color: rgb(var(--c-ink));
  background: rgb(var(--c-surface-raised));
  border: 1.5px solid rgb(var(--c-line-strong));
  border-radius: 10px;
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  flex: none;
  height: 2rem;
  padding: 0 0.7rem;
  font-size: 0.8125rem;
  font-weight: 600;
  border-radius: 999px;
  color: rgb(var(--c-ink));
  background: rgb(var(--c-surface-raised));
  border: 1.5px solid rgb(var(--c-line-strong) / 0.7);
  transition: background-color var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out);
}
.chip:hover { border-color: rgb(var(--c-ink)); }
.chip--on { background: rgb(var(--c-primary)); color: rgb(var(--c-on-primary)); border-color: rgb(var(--c-primary)); }
.chip--hidden { opacity: 0.55; text-decoration: line-through; }
.film { flex: none; padding: 2px; border-radius: 999px; border: 2px solid transparent; line-height: 0; }
.film--on { border-color: rgb(var(--c-primary)); }
.card {
  padding: 0.75rem;
  border-radius: 14px;
  border: 1.5px solid rgb(var(--c-line));
  background: rgb(var(--c-surface-raised));
}
.card--on { border-color: rgb(var(--c-ink)); box-shadow: 2px 2px 0 0 rgb(var(--c-shadow)); }
.token {
  height: 1.75rem;
  padding: 0 0.6rem;
  font-size: 0.75rem;
  font-weight: 600;
  border-radius: 999px;
  color: rgb(var(--c-ink-muted));
  background: rgb(var(--c-surface-sunken));
  border: 1px solid rgb(var(--c-line));
}
.token:hover { color: rgb(var(--c-ink)); border-color: rgb(var(--c-ink-muted)); }
.kind {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
  padding: 0.7rem 0.85rem;
  border-radius: 14px;
  border: 1.5px solid rgb(var(--c-line));
  cursor: pointer;
}
.kind--on { border-color: rgb(var(--c-ink)); background: rgb(var(--c-surface-sunken)); }
</style>
