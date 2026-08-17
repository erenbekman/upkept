<script setup lang="ts">
import type { Habit } from '~/composables/useHabits'

const repo = useHabits()
const { show: toast } = useToast()
const habits = ref<Habit[]>([])
const editing = ref<Partial<Habit> | null>(null)

async function load() { habits.value = await repo.listActive() }
onMounted(load)
watch(useSync().dataVersion, load)

// A fixed palette instead of <input type="color">: the native swatch renders as
// a rounded pill that drifts out of the row, and a habit tracker does not need
// 16 million colours.
//
// Habit colour is identity; the status palette is meaning. Four of the old eight
// swatches were byte-for-byte copies of a status token, so a habit could be
// painted in the exact green that means "done" or the exact terracotta that
// means "missed". These sit in the hue windows the status set leaves free —
// every one is at least 34° from --accent, --done-dot, --partial-dot, --miss-dot
// and --danger-solid, and at least 21° from its neighbours. That rules out warm
// and green entirely, which is the point: cool = which habit, warm = how it went.
// All eight hold L≈0.60 so no swatch shouts louder than the rest and the 5px
// habit bar stays visible on both the light and the dark card (~3.8:1 either way).
const COLORS = [
  { hex: '#11957c', name: 'Deniz yeşili' },
  { hex: '#019295', name: 'Turkuaz' },
  { hex: '#078ead', name: 'Gök mavisi' },
  { hex: '#4086bd', name: 'Mavi' },
  { hex: '#996bad', name: 'Leylak' },
  { hex: '#aa6598', name: 'Erguvan' },
  { hex: '#b4627f', name: 'Gül' },
  { hex: '#78818b', name: 'Kurşun' },
]

// A habit saved under the old palette keeps its stored colour, so offer it as a
// swatch too — otherwise the picker opens with nothing selected.
const swatches = computed(() => {
  const c = editing.value?.color
  return c && !COLORS.some(x => x.hex === c)
    ? [{ hex: c, name: 'Mevcut renk' }, ...COLORS]
    : COLORS
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
function onIconInput() {
  const first = [...new Intl.Segmenter().segment(iconInput.value)][0]?.segment ?? ''
  iconInput.value = first
  editing.value!.icon = first || null
}

function openNew() {
  editing.value = { name: '', target_desc: '', color: COLORS[0].hex, icon: null }
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
  toast('Kaydedildi ✓')
}

async function move(i: number, dir: -1 | 1) {
  const a = habits.value[i], b = habits.value[i + dir]
  if (!b) return
  await repo.reorder(a.id, b.sort_order)
  await repo.reorder(b.id, a.sort_order)
  await load()
}

async function remove(h: Habit) {
  const ok = await useAsk().confirm({
    title: `“${h.name}” kaldırılsın mı?`,
    message: 'Geçmiş kayıtlar silinmez, alışkanlık listeden çıkar.',
    okLabel: 'Kaldır',
    danger: true,
  })
  if (!ok) return
  await repo.deactivate(h.id)
  await load()
  toast(h.name + ' kaldırıldı')
}
</script>

<template>
  <div class="screen">
    <h1 class="title">Alışkanlıklar</h1>
    <div class="sub">Sırala · düzenle · kaldır</div>
  </div>

  <div class="habit-list" style="gap:10px;">
    <div v-for="(h, i) in habits" :key="h.id" class="manage-row">
      <div style="display:flex; flex-direction:column;">
        <button class="grab" :disabled="i === 0" :aria-label="`${h.name} yukarı taşı`" @click="move(i, -1)">▴</button>
        <button class="grab" :disabled="i === habits.length - 1" :aria-label="`${h.name} aşağı taşı`" @click="move(i, 1)">▾</button>
      </div>
      <div :class="h.icon ? 'habit-mark' : 'habit-bar'" :style="{ background: h.color || 'var(--accent)' }">{{ h.icon || '' }}</div>
      <div class="flex1" style="font-size:var(--fs-lg); font-weight:600; color:var(--ink2);">{{ h.name }}</div>
      <button class="icon-btn" :aria-label="`${h.name} düzenle`" @click="openEdit(h)">✎</button>
      <button class="icon-btn danger" :aria-label="`${h.name} kaldır`" @click="remove(h)">✕</button>
    </div>

    <button class="btn btn-dashed" style="width:100%; padding:16px; border-radius:18px;" @click="openNew">+ Yeni alışkanlık</button>
  </div>

  <div class="micro">Az ama sürdürülebilir. Üçten fazlası çoğu zaman fazladır.</div>

  <AppSheet
    v-if="editing"
    ref="sheetRef"
    :label="editing.id ? 'Alışkanlığı düzenle' : 'Yeni alışkanlık'"
    @close="editing = null"
  >
    <template #head>
      <div class="sheet-title">{{ editing.id ? 'Düzenle' : 'Yeni alışkanlık' }}</div>
    </template>

    <div style="display:flex; flex-direction:column; gap:12px; margin-top:4px;">
      <input v-model="editing.name" class="note-area" style="margin-top:0;" aria-label="Alışkanlık adı" placeholder="Ad" />
      <input v-model="editing.target_desc" class="note-area" style="margin-top:0;" aria-label="Hedef açıklaması" placeholder="Hedef açıklaması (opsiyonel)" />

      <!-- Two compact triggers instead of two always-open grids: the pickers used
           to fill the whole sheet before the user had chosen anything. -->
      <div class="row" style="gap:10px;">
        <button
          class="picker-trigger" :class="{ open: open === 'icon' }"
          :aria-expanded="open === 'icon'"
          @click="open = open === 'icon' ? null : 'icon'"
        >
          <span class="pt-preview">{{ editing.icon || '☺' }}</span>
          <span class="pt-label">Simge</span>
        </button>
        <button
          class="picker-trigger" :class="{ open: open === 'color' }"
          :aria-expanded="open === 'color'"
          @click="open = open === 'color' ? null : 'color'"
        >
          <span class="pt-preview pt-color" :style="{ background: editing.color || 'var(--accent)' }" />
          <span class="pt-label">Renk</span>
        </button>
      </div>

      <Transition name="reveal">
      <div v-if="open === 'icon'" class="field picker-panel">
        <div class="chips-wrap chips-scroll">
          <button
            v-for="e in ICONS" :key="e"
            class="icon-swatch" :class="{ on: editing.icon === e }"
            :aria-label="`Simge ${e}`" :aria-pressed="editing.icon === e"
            @click="editing.icon = editing.icon === e ? null : e"
          >{{ e }}</button>
        </div>
        <div class="row" style="gap:9px; margin-top:12px; align-items:center;">
          <button class="icon-swatch icon-free-btn" aria-label="Kendi simgen" @click="pickOwnIcon">
            {{ iconInput || '+' }}
          </button>
          <input
            ref="iconField" v-model="iconInput" class="icon-free-input"
            aria-label="Kendi simgen" placeholder="Klavyeden emoji seç"
            @input="onIconInput"
          />
        </div>
      </div>
      </Transition>

      <Transition name="reveal">
      <div v-if="open === 'color'" class="field picker-panel">
        <div class="chips-wrap">
          <button
            v-for="c in swatches" :key="c.hex"
            class="color-swatch" :class="{ on: editing.color === c.hex }"
            :style="{ background: c.hex }"
            :aria-label="c.name" :aria-pressed="editing.color === c.hex"
            @click="editing.color = c.hex"
          />
        </div>
        <div class="picker-hint">Grid’de ve istatistikte bu alışkanlığı bu renk temsil eder.</div>
      </div>
      </Transition>

      <button class="btn btn-primary" style="width:100%;" @click="save">Kaydet</button>
    </div>
  </AppSheet>
</template>
