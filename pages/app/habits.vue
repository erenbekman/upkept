<script setup lang="ts">
import type { Habit } from '~/composables/useHabits'

const repo = useHabits()
const { show: toast } = useToast()
const habits = ref<Habit[]>([])
const editing = ref<Partial<Habit> | null>(null)

async function load() { habits.value = await repo.listActive() }
onMounted(load)
watch(useSync().dataVersion, load)

// A habit saved under the old palette keeps its stored colour, so offer it as a
// swatch too — otherwise the picker opens with nothing selected.
const swatches = computed(() => {
  const c = editing.value?.color
  return c && !HABIT_COLORS.some(x => x.hex === c)
    ? [{ hex: c, name: '' }, ...HABIT_COLORS]
    : HABIT_COLORS
})
const ICONS = [
  '🏃', '🚶', '🚴', '🏋️', '🧘', '🤸', '🏊', '🥊', '⚽', '⛰️',
  '💧', '🥗', '🍎', '🥦', '🍳', '☕', '🧃', '💊',
  '📖', '✍️', '🧠', '📝', '🎧', '🎸', '🎨', '🧩', '🗣️', '🌐',
  '😴', '🛏️', '🪥', '🚿', '🧴', '🌱', '🧹', '🧺',
  '💻', '📵', '⏰', '📅', '💰', '🎯', '📞', '🙏',
  '🚭', '🍺', '🍬', '🎰',
]

const sheetRef = ref<InstanceType<typeof AppSheet> | null>(null)
const iconInput = ref('')
const iconField = ref<HTMLInputElement | null>(null)
const open = ref<'icon' | 'color' | null>(null)

// The only way to reach the phone's own emoji set is the system keyboard, so
// "+" just focuses a real input — iOS then offers the emoji key.
function pickOwnIcon() {
  iconField.value?.focus()
}

// One emoji can be several code units (🏋️ is 3, ZWJ sequences more), so slice
// by grapheme instead of by character or the icon comes out broken.
// An emoji stands alone; otherwise up to two letters/digits make a monogram.
function onIconInput() {
  const parts = [...new Intl.Segmenter().segment(iconInput.value)].map(s => s.segment).filter(s => s.trim())
  const icon = !parts.length
    ? ''
    : isEmojiIcon(parts[0])
      ? parts[0]
      : parts.filter(p => !isEmojiIcon(p)).slice(0, 2).join('').toLocaleUpperCase('tr')
  iconInput.value = icon
  editing.value!.icon = icon || null
}

function openNew() {
  editing.value = { name: '', target_desc: '', color: nextHabitColor(habits.value.map(h => h.color)), icon: null }
  iconInput.value = ''
  open.value = null
}
function openEdit(h: Habit) {
  editing.value = { ...h }
  open.value = null
  // Only a custom icon belongs in the free field; a preset would double up.
  iconInput.value = h.icon && !ICONS.includes(h.icon) ? h.icon : ''
}

async function close() {
  await sheetRef.value?.dismiss()
  editing.value = null
}

async function save() {
  const e = editing.value!
  if (!e.name?.trim()) return
  if (e.id) {
    await repo.update(e.id, { name: e.name.trim(), target_desc: e.target_desc || null, color: e.color || null, icon: e.icon || null })
  } else {
    await repo.create({ name: e.name.trim(), target_desc: e.target_desc || undefined, color: e.color || undefined, icon: e.icon || undefined })
  }
  await close()
  await load()
  toast(t('common.saved'))
}

async function commitOrder(from: number, to: number) {
  if (from === to) return
  const list = [...habits.value]
  list.splice(to, 0, ...list.splice(from, 1))
  habits.value = list
  for (const [i, h] of list.entries()) await repo.reorder(h.id, i)
  await load()
}

// Pointer-driven drag on the handle; the other rows slide out of the way and the
// order is written once, on release. Arrow keys on the handle do the same.
const ROW_GAP = 10
const drag = ref<{ from: number; to: number; dy: number } | null>(null)
const settling = ref(false)
let startY = 0
let rowStep = 0

function onGrab(e: PointerEvent, i: number) {
  const handle = e.currentTarget as HTMLElement
  rowStep = (handle.closest('.manage-row') as HTMLElement).offsetHeight + ROW_GAP
  startY = e.clientY
  handle.setPointerCapture(e.pointerId)
  drag.value = { from: i, to: i, dy: 0 }
  haptic()
}

function onDrag(e: PointerEvent) {
  const d = drag.value
  if (!d) return
  const last = habits.value.length - 1
  const dy = Math.min(Math.max(e.clientY - startY, -d.from * rowStep), (last - d.from) * rowStep)
  const to = d.from + Math.round(dy / rowStep)
  if (to !== d.to) haptic()
  drag.value = { ...d, dy, to }
}

// The new order and the cleared offsets land in the same frame with transitions
// off, or the rows would slide back to where they started and then jump.
async function onDrop() {
  const d = drag.value
  if (!d) return
  settling.value = true
  drag.value = null
  const saving = commitOrder(d.from, d.to)
  requestAnimationFrame(() => requestAnimationFrame(() => { settling.value = false }))
  await saving
}

function rowStyle(i: number) {
  const d = drag.value
  if (!d) return undefined
  if (i === d.from) return { transform: `translateY(${d.dy}px)`, transition: 'none', zIndex: 2 }
  if (d.from < d.to && i > d.from && i <= d.to) return { transform: `translateY(${-rowStep}px)` }
  if (d.from > d.to && i < d.from && i >= d.to) return { transform: `translateY(${rowStep}px)` }
  return undefined
}

async function onHandleKey(e: KeyboardEvent, i: number) {
  const dir = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0
  if (!dir || !habits.value[i + dir]) return
  e.preventDefault()
  await commitOrder(i, i + dir)
  await nextTick()
  document.querySelectorAll<HTMLElement>('.drag-handle')[i + dir]?.focus()
}

async function remove(h: Habit) {
  const ok = await useAsk().confirm({
    title: t('habits.removeTitle', { name: h.name }),
    message: t('habits.removeText'),
    okLabel: t('habits.removeOk'),
    danger: true,
  })
  if (!ok) return
  await repo.deactivate(h.id)
  await load()
  toast(t('habits.removed', { name: h.name }))
}
</script>

<template>
  <div class="screen">
    <h1 class="title">{{ t('habits.title') }}</h1>
    <div class="sub">{{ t('habits.sub') }}</div>
  </div>

  <div class="habit-list" :class="{ settling }" style="gap:10px;">
    <div
      v-for="(h, i) in habits" :key="h.id"
      class="manage-row" :class="{ dragging: drag?.from === i }" :style="rowStyle(i)"
    >
      <button
        class="drag-handle" data-no-ptr
        :aria-label="t('habits.reorder', { name: h.name })"
        @pointerdown.prevent="onGrab($event, i)" @pointermove="onDrag" @pointerup="onDrop" @pointercancel="onDrop"
        @keydown="onHandleKey($event, i)"
      >
        <svg width="14" height="20" viewBox="0 0 14 20" aria-hidden="true">
          <circle v-for="p in [[4, 4], [10, 4], [4, 10], [10, 10], [4, 16], [10, 16]]" :key="p.join()" :cx="p[0]" :cy="p[1]" r="1.6" />
        </svg>
      </button>
      <HabitMark :icon="h.icon" :color="h.color" />
      <div class="flex1" style="font-size:var(--fs-lg); font-weight:600; color:var(--ink2);">{{ h.name }}</div>
      <button class="icon-btn" :aria-label="t('habits.edit', { name: h.name })" @click="openEdit(h)">✎</button>
      <button class="icon-btn danger" :aria-label="t('habits.remove', { name: h.name })" @click="remove(h)">✕</button>
    </div>

    <button class="btn btn-dashed" style="width:100%; padding:16px; border-radius:18px;" @click="openNew">{{ t('habits.new') }}</button>
  </div>

  <div class="micro">{{ t('habits.note') }}</div>

  <AppSheet
    v-if="editing"
    ref="sheetRef"
    :label="editing.id ? t('habits.editLabel') : t('habits.newLabel')"
    @close="editing = null"
  >
    <template #head>
      <div class="sheet-title">{{ editing.id ? t('habits.editTitle') : t('habits.newLabel') }}</div>
    </template>

    <div style="display:flex; flex-direction:column; gap:12px; margin-top:4px;">
      <input v-model="editing.name" class="note-area" style="margin-top:0;" :aria-label="t('habits.nameLabel')" :placeholder="t('habits.name')" />
      <input v-model="editing.target_desc" class="note-area" style="margin-top:0;" :aria-label="t('habits.targetLabel')" :placeholder="t('habits.target')" />

      <!-- Two compact triggers instead of two always-open grids: the pickers used
           to fill the whole sheet before the user had chosen anything. -->
      <div class="row" style="gap:10px;">
        <button
          class="picker-trigger" :class="{ open: open === 'icon' }"
          :aria-expanded="open === 'icon'"
          @click="open = open === 'icon' ? null : 'icon'"
        >
          <HabitMark v-if="editing.icon" :icon="editing.icon" :color="editing.color ?? null" class="pt-mark" />
          <span v-else class="pt-preview">☺</span>
          <span class="pt-label">{{ t('habits.icon') }}</span>
        </button>
        <button
          class="picker-trigger" :class="{ open: open === 'color' }"
          :aria-expanded="open === 'color'"
          @click="open = open === 'color' ? null : 'color'"
        >
          <span class="pt-preview pt-color" :style="{ background: editing.color || 'var(--accent)' }" />
          <span class="pt-label">{{ t('habits.color') }}</span>
        </button>
      </div>

      <Transition name="reveal">
      <div v-if="open === 'icon'" class="field picker-panel">
        <div class="chips-wrap chips-scroll">
          <button
            v-for="e in ICONS" :key="e"
            class="icon-swatch" :class="{ on: editing.icon === e }"
            :aria-label="t('habits.iconN', { e })" :aria-pressed="editing.icon === e"
            @click="editing.icon = editing.icon === e ? null : e"
          >{{ e }}</button>
        </div>
        <div class="row" style="gap:9px; margin-top:12px; align-items:center;">
          <button class="icon-swatch icon-free-btn" :aria-label="t('habits.ownIcon')" @click="pickOwnIcon">
            {{ iconInput || '+' }}
          </button>
          <input
            ref="iconField" v-model="iconInput" class="icon-free-input"
            :aria-label="t('habits.ownIcon')" :placeholder="t('habits.ownIconHint')"
            @input="onIconInput"
          />
        </div>
      </div>
      </Transition>

      <Transition name="reveal">
      <div v-if="open === 'color'" class="field picker-panel">
        <div class="swatch-grid">
          <button
            v-for="c in swatches" :key="c.hex"
            class="color-swatch" :class="{ on: editing.color === c.hex }"
            :style="{ background: c.hex }"
            :aria-label="c.name ? t(`colors.${c.name}`) : t('habits.customColor')" :aria-pressed="editing.color === c.hex"
            @click="editing.color = c.hex"
          />
          <label class="color-swatch color-custom" :aria-label="t('habits.pickCustomColor')" :title="t('habits.customColor')">
            +
            <input type="color" class="sr-only" :value="editing.color || '#6d6fae'" @input="e => editing!.color = (e.target as HTMLInputElement).value" />
          </label>
        </div>
        <div class="picker-hint">{{ t('habits.colorHint') }}</div>
      </div>
      </Transition>

      <button class="btn btn-primary" style="width:100%;" @click="save">{{ t('common.save') }}</button>
    </div>
  </AppSheet>
</template>
