<!--
  Shirt list (/people/:id/shirts): a person's saved designs with real thumbnails,
  new / duplicate / rename / delete, plus the team-edition designs.
-->
<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  UiButton, UiCard, UiEmptyState, UiField, UiIcon, UiIconButton, UiInput, UiModal, UiSkeleton,
} from '../components/ui/index.js'
import { useAppData } from '../components/layout/useAppData.js'
import { setPageTitle } from '../components/layout/usePageTitle.js'
import { usePersonStore } from '../stores/personStore.js'
import { useDesignStore } from '../stores/designStore.js'
import { useTeamStore } from '../stores/teamStore.js'
import { useToast } from '../composables/useToast.js'
import {
  TEMPLATES, buildTemplate, garmentById, mockupThumb, normalizeShirtConfig, shirtEnv, templateById, garmentColorName,
} from '../lib/shirt/index.js'

const route = useRoute()
const router = useRouter()
// UiButton's RouterLink mode drops the href; pass it explicitly so the link is focusable.
const hrefOf = (to) => router.resolve(to).href
const data = useAppData()
const personStore = usePersonStore()
const designStore = useDesignStore()
const teamStore = useTeamStore()
const toast = useToast()

const personId = computed(() => String(route.params.id))
const person = computed(() => personStore.getPersonById(personId.value))
const firstName = computed(() => person.value?.name?.trim().split(/\s+/)[0] ?? 'teammate')
const people = computed(() => [...personStore.persons].sort((a, b) => a.name.localeCompare(b.name)))
const env = computed(() =>
  shirtEnv({
    person: person.value,
    dino: data.dinoFor(person.value),
    team: { name: teamStore.name, year: teamStore.year },
    roster: people.value.map((p) => p.name),
  }),
)

const status = ref('loading') // loading | ready | error
async function load() {
  status.value = 'loading'
  try {
    await designStore.fetchDesigns()
    status.value = 'ready'
  } catch {
    status.value = 'error'
  }
}
watch(() => data.ready.value, (ok) => { if (ok) load() }, { immediate: true })
watch(person, (p) => { if (p) setPageTitle(`${firstName.value}'s shirts`) }, { immediate: true })

const byDate = (a, b) => String(b.updatedAt ?? '').localeCompare(String(a.updatedAt ?? ''))
const mine = computed(() => designStore.designs.filter((d) => d.personId === personId.value && (d.kind ?? 'shirt') === 'shirt').sort(byDate))
const teamDesigns = computed(() => designStore.designs.filter((d) => !d.personId && (d.kind ?? 'shirt') === 'shirt').sort(byDate))

// ── Thumbnails (same renderer as the studio and the exports) ───────────────
const thumbs = ref({})
const sideOf = (cfg) => (!cfg.sides.front.layers.length && cfg.sides.back.layers.length ? 'back' : 'front')
async function makeThumb(key, config, side) {
  try {
    const url = await mockupThumb(normalizeShirtConfig(config), side, env.value, 420, { focus: 1.5 })
    thumbs.value = { ...thumbs.value, [key]: url }
  } catch { /* leave the skeleton */ }
}
watch(
  [mine, teamDesigns, env, status],
  async () => {
    if (status.value !== 'ready' || !person.value) return
    for (const d of [...mine.value, ...teamDesigns.value]) {
      const cfg = normalizeShirtConfig(d.config)
      await makeThumb(`${d.id}:${d.updatedAt}`, cfg, sideOf(cfg))
    }
    for (const t of TEMPLATES) await makeThumb(`t:${t.id}`, buildTemplate(t.id, { personId: personId.value }), t.startSide ?? 'front')
  },
  { immediate: true },
)
const thumbOf = (d) => thumbs.value[`${d.id}:${d.updatedAt}`]

const describe = (d) => {
  const cfg = normalizeShirtConfig(d.config)
  const g = garmentById(cfg.garment.type).label
  const t = templateById(cfg.template)?.label
  return `${g}, ${garmentColorName(cfg.garment.color)}${t ? ` · ${t}` : ''}`
}
const when = (d) => {
  const t = Date.parse(d.updatedAt ?? '')
  return t ? new Date(t).toLocaleDateString([], { day: 'numeric', month: 'short' }) : ''
}
const linkTo = (d) => (d.personId ? `/people/${d.personId}/shirts/${d.id}` : `/team-shirt/${d.id}`)

// ── Actions ────────────────────────────────────────────────────────────────
const busy = ref('')
async function duplicate(d) {
  busy.value = d.id
  try {
    const copy = await designStore.createDesign({
      personId: d.personId ?? null,
      name: `${d.name || 'Untitled design'} copy`.slice(0, 60),
      kind: d.kind ?? 'shirt',
      config: JSON.parse(JSON.stringify(d.config)),
    })
    toast.success(`Duplicated ${d.name || 'design'}`)
    await nextTick()
    document.getElementById(`design-${copy.id}`)?.focus()
  } catch {
    toast.error("Couldn't reach the server", 'The design was not duplicated. Try again.')
  } finally {
    busy.value = ''
  }
}

const renameTarget = ref(null)
const renameValue = ref('')
const renameError = ref('')
function askRename(d) {
  renameTarget.value = d
  renameValue.value = d.name || ''
  renameError.value = ''
}
async function doRename() {
  const d = renameTarget.value
  const next = renameValue.value.trim()
  if (!next) { renameError.value = 'Give the design a name.'; return }
  busy.value = d.id
  try {
    await designStore.updateDesign(d.id, { name: next.slice(0, 60) })
    renameTarget.value = null
    toast.success(`Renamed to ${next.slice(0, 60)}`)
  } catch {
    renameError.value = "Couldn't reach the server. Try again."
  } finally {
    busy.value = ''
  }
}

const deleteTarget = ref(null)
async function doDelete() {
  const d = deleteTarget.value
  deleteTarget.value = null
  if (!d) return
  const backup = { personId: d.personId ?? null, name: d.name, kind: d.kind ?? 'shirt', config: JSON.parse(JSON.stringify(d.config)) }
  try {
    await designStore.removeDesign(d.id)
    toast.show({
      title: `Deleted ${d.name || 'design'}`,
      duration: 8000,
      action: {
        label: 'Undo',
        onClick: async () => {
          try {
            await designStore.createDesign(backup)
            toast.success(`Restored ${backup.name || 'design'}`)
          } catch {
            toast.error("Couldn't reach the server", 'The design could not be restored.')
          }
        },
      },
    })
  } catch {
    toast.error("Couldn't reach the server", 'The design is still there. Try again.')
  }
}

const newLink = (templateId) => ({ path: `/people/${personId.value}/shirts/new`, query: templateId ? { template: templateId } : {} })
</script>

<template>
  <div class="mx-auto w-full max-w-6xl px-4 sm:px-6 py-6 sm:py-10">
    <!-- Loading -->
    <div v-if="data.loading.value || (status === 'loading' && !data.failed.value)" aria-busy="true">
      <UiSkeleton width="12rem" height="2.2rem" />
      <div class="mt-8 grid gap-5 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
        <UiSkeleton v-for="i in 4" :key="i" shape="card" />
      </div>
    </div>

    <UiEmptyState
      v-else-if="data.failed.value || status === 'error'"
      tone="error"
      title="Couldn't reach the server"
      text="Your designs are safe. Check your connection and try again."
    >
      <template #action><UiButton @click="data.failed.value ? data.retry() : load()">Try again</UiButton></template>
    </UiEmptyState>

    <UiEmptyState v-else-if="!person" title="This teammate went extinct" text="We can't find that person. They may have been removed.">
      <template #action><UiButton to="/" :href="hrefOf('/')">Back to the team</UiButton></template>
    </UiEmptyState>

    <template v-else>
      <RouterLink :to="`/people/${personId}`" class="inline-flex items-center gap-1.5 text-sm font-semibold text-ink-muted hover:text-ink">
        <UiIcon name="arrow-left" :size="16" />{{ person.name }}
      </RouterLink>
      <header class="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 class="font-display text-display-sm sm:text-display-md text-ink outline-none" tabindex="-1">{{ firstName }}'s shirts</h1>
          <p class="mt-1 text-ink-muted">
            {{ mine.length ? `${mine.length} saved ${mine.length === 1 ? 'design' : 'designs'}. Print files export at 4500×5400.` : 'Design a shirt around the avatar, then export a print-ready file.' }}
          </p>
        </div>
        <UiButton v-if="mine.length" :to="newLink()" :href="hrefOf(newLink())" icon="plus">New design</UiButton>
      </header>

      <!-- Saved designs -->
      <ul v-if="mine.length" class="mt-8 grid gap-5 grid-cols-2 md:grid-cols-3 lg:grid-cols-4" aria-label="Saved designs">
        <li v-for="d in mine" :key="d.id">
          <UiCard padding="none" class="h-full flex flex-col overflow-hidden">
            <RouterLink :id="`design-${d.id}`" :to="linkTo(d)" class="design-link" :aria-label="`Open ${d.name || 'Untitled design'}`">
              <span class="design-thumb bg-specimen">
                <img v-if="thumbOf(d)" :src="thumbOf(d)" alt="" loading="lazy" />
                <UiSkeleton v-else shape="rect" height="100%" />
              </span>
            </RouterLink>
            <div class="p-3 sm:p-4 flex-1 flex flex-col gap-1 border-t-[1.5px] border-ink">
              <h2 class="font-display text-lg leading-tight truncate">{{ d.name || 'Untitled design' }}</h2>
              <p class="text-xs text-ink-muted">{{ describe(d) }}</p>
              <div class="mt-auto pt-2 flex items-center justify-between">
                <span class="text-xs text-ink-subtle">{{ when(d) }}</span>
                <span class="flex -mr-1.5">
                  <UiIconButton icon="edit" :label="`Rename ${d.name || 'design'}`" size="sm" @click="askRename(d)" />
                  <UiIconButton icon="copy" :label="`Duplicate ${d.name || 'design'}`" size="sm" :disabled="busy === d.id" @click="duplicate(d)" />
                  <UiIconButton icon="trash" :label="`Delete ${d.name || 'design'}`" size="sm" @click="deleteTarget = d" />
                </span>
              </div>
            </div>
          </UiCard>
        </li>
      </ul>

      <!-- Empty -->
      <UiEmptyState
        v-else
        class="mt-8"
        title="No shirt designs yet"
        :text="`Pick a starting point below. ${firstName}'s dino, name and team fill themselves in.`"
      >
        <template #action><UiButton :to="newLink()" :href="hrefOf(newLink())" icon="plus">New design</UiButton></template>
      </UiEmptyState>

      <!-- Templates -->
      <section class="mt-12" aria-labelledby="start-from">
        <h2 id="start-from" class="font-display text-display-xs">Start from a template</h2>
        <ul class="mt-4 grid gap-4 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
          <li v-for="t in TEMPLATES" :key="t.id">
            <RouterLink :to="newLink(t.id)" class="template-link">
              <span class="design-thumb design-thumb--sm">
                <img v-if="thumbs[`t:${t.id}`]" :src="thumbs[`t:${t.id}`]" alt="" loading="lazy" />
                <UiSkeleton v-else shape="rect" height="100%" />
              </span>
              <span class="block mt-2 text-sm font-bold leading-tight">{{ t.label }}</span>
            </RouterLink>
          </li>
        </ul>
      </section>

      <!-- Team edition -->
      <section class="mt-12" aria-labelledby="team-shirts">
        <div class="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="team-shirts" class="font-display text-display-xs">Team shirts</h2>
            <p class="mt-1 text-sm text-ink-muted">One design for everyone. Each person gets their own dino, name and number.</p>
          </div>
          <UiButton to="/team-shirt/new" :href="hrefOf('/team-shirt/new')" variant="secondary" icon="users">New team shirt</UiButton>
        </div>
        <ul v-if="teamDesigns.length" class="mt-4 grid gap-5 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          <li v-for="d in teamDesigns" :key="d.id">
            <UiCard padding="none" class="h-full flex flex-col overflow-hidden">
              <RouterLink :to="linkTo(d)" class="design-link" :aria-label="`Open team shirt ${d.name || 'Untitled design'}`">
                <span class="design-thumb bg-specimen">
                  <img v-if="thumbOf(d)" :src="thumbOf(d)" alt="" loading="lazy" />
                  <UiSkeleton v-else shape="rect" height="100%" />
                </span>
              </RouterLink>
              <div class="p-3 sm:p-4 flex-1 flex flex-col gap-1 border-t-[1.5px] border-ink">
                <h3 class="font-display text-lg leading-tight truncate">{{ d.name || 'Untitled design' }}</h3>
                <p class="text-xs text-ink-muted">{{ describe(d) }}</p>
                <div class="mt-auto pt-2 flex items-center justify-between">
                  <span class="text-xs text-ink-subtle">{{ when(d) }}</span>
                  <span class="flex -mr-1.5">
                    <UiIconButton icon="edit" :label="`Rename ${d.name || 'design'}`" size="sm" @click="askRename(d)" />
                    <UiIconButton icon="copy" :label="`Duplicate ${d.name || 'design'}`" size="sm" :disabled="busy === d.id" @click="duplicate(d)" />
                    <UiIconButton icon="trash" :label="`Delete ${d.name || 'design'}`" size="sm" @click="deleteTarget = d" />
                  </span>
                </div>
              </div>
            </UiCard>
          </li>
        </ul>
      </section>
    </template>

    <!-- Rename -->
    <UiModal :model-value="!!renameTarget" title="Rename design" size="sm" @update:model-value="renameTarget = null">
      <form id="rename-form" @submit.prevent="doRename">
        <UiField label="Name" :error="renameError" :count="renameValue.length" :max="60">
          <UiInput v-model="renameValue" maxlength="60" data-autofocus autocomplete="off" />
        </UiField>
      </form>
      <template #footer>
        <UiButton variant="ghost" @click="renameTarget = null">Cancel</UiButton>
        <UiButton type="submit" form="rename-form" :loading="busy === renameTarget?.id">Rename</UiButton>
      </template>
    </UiModal>

    <!-- Delete -->
    <UiModal
      :model-value="!!deleteTarget"
      :title="`Delete ${deleteTarget?.name || 'this design'}?`"
      description="The design is removed from the server. You get a few seconds to undo."
      size="sm"
      role="alertdialog"
      @update:model-value="deleteTarget = null"
    >
      <template #footer>
        <UiButton variant="secondary" data-autofocus @click="deleteTarget = null">Keep design</UiButton>
        <UiButton variant="danger" icon="trash" @click="doDelete">Delete design</UiButton>
      </template>
    </UiModal>
  </div>
</template>

<style scoped>
.design-link { display: block; outline-offset: -3px; }
.design-thumb {
  display: block;
  aspect-ratio: 1 / 1;
  overflow: hidden;
}
.design-thumb img { display: block; width: 100%; height: 100%; object-fit: contain; transition: transform var(--dur-base) var(--ease-out); }
.design-link:hover .design-thumb img { transform: scale(1.03); }
.design-thumb--sm {
  border-radius: 14px;
  border: 1.5px solid rgb(var(--c-line-strong) / 0.6);
  background: rgb(var(--c-surface-sunken));
}
.template-link { display: block; border-radius: 14px; }
.template-link:hover .design-thumb--sm { border-color: rgb(var(--c-ink)); }
@media (prefers-reduced-motion: reduce) { .design-thumb img { transition: none; } }
</style>
