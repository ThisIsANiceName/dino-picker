<!--
  StudioShell: the frame both studios share. Own top bar (back, title, undo/redo, export, save),
  a dark specimen stage, and the control panel: a side column on desktop (>= 1024px), a docked
  bottom sheet on phones. Also hosts the history live region, the leave-guard dialog and the
  shortcut sheet.

  Props
    title, backTo (route), backLabel ("Back to Mira"), backShort ("Mira")
    tabs [{ id, label, icon }], tab (v-model:tab)
    canUndo, canRedo, dirty, saving, saveLabel, saveShort, saveDisabled
    announcement  String  polite live-region text (history actions)
    leaveOpen     Boolean leave-guard dialog open; emits leave('stay'|'discard'|'save')
    shortcuts     Array   groups for ShortcutSheet; helpOpen (v-model:helpOpen)
    panelLabel    String  accessible name of the control panel
  Slots: stage, panel (current tab content), title (replaces the h1 text), actions (extra bar buttons), banner
  Emits: update:tab, undo, redo, export, save, leave, update:helpOpen
-->
<script setup>
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { UiBottomSheet, UiButton, UiIconButton, UiModal, UiTabs, UiTooltip } from '../ui/index.js'
import ShortcutSheet from './ShortcutSheet.vue'
import { useIsDesktop, isMac } from './useStudio.js'

const props = defineProps({
  title: { type: String, required: true },
  backTo: { type: [String, Object], required: true },
  backLabel: { type: String, default: 'Back' },
  backShort: { type: String, default: '' },
  tabs: { type: Array, required: true },
  tab: { type: String, required: true },
  canUndo: Boolean,
  canRedo: Boolean,
  dirty: Boolean,
  saving: Boolean,
  saveLabel: { type: String, default: 'Save' },
  saveShort: { type: String, default: 'Save' },
  announcement: { type: String, default: '' },
  leaveOpen: Boolean,
  shortcuts: { type: Array, default: () => [] },
  helpOpen: Boolean,
  panelLabel: { type: String, default: 'Controls' },
  idPrefix: { type: String, default: 'studio' },
})
const emit = defineEmits(['update:tab', 'undo', 'redo', 'export', 'save', 'leave', 'update:helpOpen'])

// UiButton's RouterLink mode drops the href; pass it explicitly so the link is focusable.
const router = useRouter()
const hrefOf = (to) => router.resolve(to).href
const desktop = useIsDesktop()
const snap = ref('half')
const mod = isMac() ? '⌘' : 'Ctrl'
const stagePad = computed(() => (desktop.value ? '0px' : snap.value === 'peek' ? '96px' : '50dvh'))
const mobileTabs = computed(() => props.tabs.map((t) => ({ ...t })))

function onTab(id) {
  emit('update:tab', id)
  if (!desktop.value && snap.value === 'peek') snap.value = 'half'
}
</script>

<template>
  <div class="studio fixed inset-0 z-[45] flex flex-col bg-bg text-ink">
    <header class="theme-jungle shrink-0 h-14 flex items-center gap-1 sm:gap-2 pl-1.5 pr-2 sm:px-3 bg-bg text-ink border-b-[1.5px] border-jungle-950">
      <UiButton :to="backTo" :href="hrefOf(backTo)" variant="ghost" size="sm" icon="arrow-left" class="shrink-0 !px-2.5" :aria-label="backLabel">
        <span class="hidden md:inline">{{ backLabel }}</span>
        <span class="hidden min-[480px]:inline md:hidden max-w-[5.5rem] truncate">{{ backShort }}</span>
      </UiButton>
      <div class="min-w-0 flex-1 flex items-center gap-2 pl-1">
        <h1 class="font-display text-base sm:text-xl leading-none truncate outline-none min-w-0" tabindex="-1">
          <slot name="title">{{ title }}</slot>
        </h1>
        <span v-if="dirty" class="hidden sm:inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted shrink-0">
          <span class="w-1.5 h-1.5 rounded-full bg-primary" aria-hidden="true" />Unsaved
        </span>
      </div>
      <div class="flex items-center shrink-0">
        <UiTooltip text="Undo" :shortcut="`${mod} Z`" placement="bottom">
          <UiIconButton icon="undo" label="Undo" :disabled="!canUndo" @click="emit('undo')" />
        </UiTooltip>
        <UiTooltip text="Redo" :shortcut="`${mod} Shift Z`" placement="bottom">
          <UiIconButton icon="redo" label="Redo" :disabled="!canRedo" @click="emit('redo')" />
        </UiTooltip>
      </div>
      <slot name="actions" />
      <UiButton variant="secondary" size="sm" icon="download" class="shrink-0 !px-2.5 sm:!px-3.5" aria-label="Export" @click="emit('export')">
        <span class="hidden sm:inline">Export</span>
      </UiButton>
      <UiButton size="sm" class="shrink-0" :loading="saving" @click="emit('save')">
        <span class="hidden sm:inline">{{ saveLabel }}</span>
        <span class="sm:hidden">{{ saveShort }}</span>
      </UiButton>
    </header>

    <slot name="banner" />

    <div class="flex-1 min-h-0 flex flex-col lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(380px,440px)]">
      <section
        class="theme-jungle studio-stage bg-specimen relative flex-1 min-h-0 min-w-0 flex flex-col text-ink overflow-hidden"
        :style="{ paddingBottom: stagePad }"
        aria-label="Preview"
      >
        <slot name="stage" :desktop="desktop" />
      </section>

      <aside v-if="desktop" class="min-h-0 flex flex-col bg-surface border-l-[1.5px] border-ink" :aria-label="panelLabel">
        <div class="shrink-0 px-4 pt-4 pb-3 border-b border-line">
          <UiTabs :model-value="tab" :tabs="tabs" variant="pill" :label="panelLabel" :id-prefix="idPrefix" fitted @update:model-value="onTab" />
        </div>
        <div
          :id="`${idPrefix}-panel-${tab}`"
          role="tabpanel"
          :aria-labelledby="`${idPrefix}-tab-${tab}`"
          class="flex-1 min-h-0 overflow-y-auto overscroll-contain px-5 py-5"
        >
          <slot name="panel" :desktop="true" />
        </div>
      </aside>
    </div>

    <UiBottomSheet v-if="!desktop" v-model:snap="snap" docked :title="panelLabel">
      <template #header>
        <UiTabs :model-value="tab" :tabs="mobileTabs" variant="pill" :label="panelLabel" :id-prefix="idPrefix" fitted @update:model-value="onTab" />
      </template>
      <div :id="`${idPrefix}-panel-${tab}`" role="tabpanel" :aria-labelledby="`${idPrefix}-tab-${tab}`" class="pt-2">
        <slot name="panel" :desktop="false" />
      </div>
    </UiBottomSheet>

    <div class="sr-only" aria-live="polite" aria-atomic="true">{{ announcement }}</div>

    <UiModal
      :model-value="leaveOpen"
      title="Leave without saving?"
      description="Your changes are not saved yet."
      size="sm"
      @update:model-value="(v) => { if (!v) emit('leave', 'stay') }"
    >
      <template #footer>
        <UiButton variant="ghost" @click="emit('leave', 'discard')">Discard changes</UiButton>
        <UiButton variant="secondary" data-autofocus @click="emit('leave', 'stay')">Keep editing</UiButton>
        <UiButton :loading="saving" @click="emit('leave', 'save')">Save and leave</UiButton>
      </template>
    </UiModal>

    <ShortcutSheet :model-value="helpOpen" :groups="shortcuts" @update:model-value="emit('update:helpOpen', $event)" />
  </div>
</template>

<style scoped>
.studio-stage { transition: padding-bottom var(--dur-base) var(--ease-out); }
@media (prefers-reduced-motion: reduce) { .studio-stage { transition: none; } }
</style>
