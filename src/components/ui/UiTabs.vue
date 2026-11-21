<!--
  UiTabs: WAI-ARIA tabs (automatic activation, roving tabindex, arrow/Home/End keys).

  Props
    modelValue  String   active tab id (v-model)
    tabs        Array<{ id: String, label: String, icon?: String, badge?: String|Number }>
    variant     'underline' (default; page sections) | 'pill' (studio panels, compact)
    label       String   aria-label for the tablist
    fitted      Boolean  tabs share the width equally (mobile bottom sheet)
    idPrefix    String   prefix for tab/panel ids (default auto)

  Slots
    `panel-<id>` for each tab, or a default slot with { active } scoped prop.
    Panels get role="tabpanel" and aria-labelledby automatically.

  Emits: update:modelValue
-->
<script>
let uid = 0 // module scope: shared across instances (not reset per component)
</script>

<script setup>
import { ref, computed } from 'vue'
import UiIcon from './UiIcon.vue'

const props = defineProps({
  modelValue: { type: String, default: '' },
  tabs: { type: Array, required: true },
  variant: { type: String, default: 'underline' },
  label: { type: String, default: 'Sections' },
  fitted: { type: Boolean, default: false },
  idPrefix: { type: String, default: '' },
})
const emit = defineEmits(['update:modelValue'])

const prefix = props.idPrefix || `ui-tabs-${++uid}`
const btns = ref([])
const active = computed(() => props.modelValue || props.tabs[0]?.id)

function select(id, focus = false) {
  emit('update:modelValue', id)
  if (focus) {
    const i = props.tabs.findIndex((t) => t.id === id)
    btns.value[i]?.focus()
  }
}

function onKey(e, i) {
  const n = props.tabs.length
  let next = null
  if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (i + 1) % n
  else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (i - 1 + n) % n
  else if (e.key === 'Home') next = 0
  else if (e.key === 'End') next = n - 1
  if (next !== null) {
    e.preventDefault()
    select(props.tabs[next].id, true)
  }
}
</script>

<template>
  <div class="ui-tabs">
    <div
      role="tablist"
      :aria-label="label"
      :class="[
        'flex',
        variant === 'pill'
          ? ['gap-1 p-1 bg-surface-sunken border border-line', fitted ? 'rounded-[18px]' : 'rounded-full']
          : 'gap-5 border-b-[1.5px] border-line overflow-x-auto',
        fitted ? 'w-full' : variant === 'pill' ? 'w-max max-w-full overflow-x-auto' : '',
      ]"
    >
      <button
        v-for="(tab, i) in tabs"
        :id="`${prefix}-tab-${tab.id}`"
        :key="tab.id"
        ref="btns"
        type="button"
        role="tab"
        :aria-selected="String(active === tab.id)"
        :aria-controls="`${prefix}-panel-${tab.id}`"
        :tabindex="active === tab.id ? 0 : -1"
        :class="[
          'inline-flex items-center justify-center gap-1.5 font-semibold whitespace-nowrap transition-colors duration-fast',
          fitted ? 'flex-1' : '',
          variant === 'pill'
            ? [
                fitted ? 'flex-col h-12 px-1 rounded-[14px] text-xs gap-0.5 min-w-0' : 'h-9 px-3.5 rounded-full text-sm',
                active === tab.id ? 'bg-ink text-ink-inverse shadow-sticker-sm' : 'text-ink-muted hover:text-ink',
              ]
            : [
                'relative h-11 text-[0.9375rem] -mb-[1.5px] border-b-[3px]',
                active === tab.id ? 'text-ink border-primary' : 'text-ink-subtle border-transparent hover:text-ink',
              ],
        ]"
        @click="select(tab.id)"
        @keydown="onKey($event, i)"
      >
        <UiIcon v-if="tab.icon" :name="tab.icon" :size="variant === 'pill' ? 16 : 18" />
        <span>{{ tab.label }}</span>
        <span
          v-if="tab.badge !== undefined && tab.badge !== null"
          class="ml-0.5 min-w-5 h-5 px-1.5 rounded-full bg-accent text-on-accent text-2xs leading-5 tabular"
        >{{ tab.badge }}</span>
      </button>
    </div>

    <template v-for="tab in tabs" :key="tab.id">
      <div
        v-if="$slots[`panel-${tab.id}`] || $slots.default"
        v-show="active === tab.id"
        :id="`${prefix}-panel-${tab.id}`"
        role="tabpanel"
        :aria-labelledby="`${prefix}-tab-${tab.id}`"
        tabindex="0"
        class="ui-tabs__panel focus-visible:outline-offset-4"
      >
        <slot :name="`panel-${tab.id}`">
          <slot v-if="active === tab.id" :active="tab.id" />
        </slot>
      </div>
    </template>
  </div>
</template>
