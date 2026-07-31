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
const COLORS = ['#7d9a6f', '#6d6fae', '#c79433', '#bd7659', '#5f8a58', '#8a6ea8', '#4f8a94', '#9a5236']
const ICONS = ['🏃', '💧', '📖', '🧘', '😴', '🥗', '💊', '✍️', '🎸', '🧹', '☎️', '🚭']

const sheetRef = ref<InstanceType<typeof AppSheet> | null>(null)
const iconInput = ref('')
const open = ref<'icon' | 'color' | null>(null)

function openNew() {
  editing.value = { name: '', target_desc: '', color: COLORS[0], icon: null }
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
  if (!confirm(`"${h.name}" kaldırılsın mı? Geçmiş kayıtlar silinmez.`)) return
  await repo.deactivate(h.id)
  await load()
  toast(h.name + ' kaldırıldı')
}
</script>

<template>
  <div class="screen">
    <div class="title">Alışkanlıklar</div>
    <div class="sub">Sırala · düzenle · kaldır</div>
  </div>

  <div class="habit-list" style="gap:10px;">
    <div v-for="(h, i) in habits" :key="h.id" class="manage-row">
      <div style="display:flex; flex-direction:column; gap:2px;">
        <button class="grab" style="background:none;border:none;padding:0;color:var(--muted2);cursor:pointer;line-height:0.6;" :disabled="i === 0" @click="move(i, -1)">▴</button>
        <button class="grab" style="background:none;border:none;padding:0;color:var(--muted2);cursor:pointer;line-height:0.6;" :disabled="i === habits.length - 1" @click="move(i, 1)">▾</button>
      </div>
      <div :class="h.icon ? 'habit-mark' : 'habit-bar'" :style="{ background: h.color || 'var(--accent)' }">{{ h.icon || '' }}</div>
      <div class="flex1" style="font-size:16px; font-weight:600; color:var(--ink2);">{{ h.name }}</div>
      <button class="icon-btn" @click="openEdit(h)">✎</button>
      <button class="icon-btn danger" @click="remove(h)">✕</button>
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
      <input v-model="editing.name" class="note-area" style="margin-top:0;" placeholder="Ad" />
      <input v-model="editing.target_desc" class="note-area" style="margin-top:0;" placeholder="Hedef açıklaması (opsiyonel)" />

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

      <div v-if="open === 'icon'" class="field picker-panel">
        <div class="chips-wrap">
          <button
            v-for="e in ICONS" :key="e"
            class="icon-swatch" :class="{ on: editing.icon === e }"
            :aria-label="`Simge ${e}`" :aria-pressed="editing.icon === e"
            @click="editing.icon = editing.icon === e ? null : e"
          >{{ e }}</button>
          <input
            v-model="iconInput" class="icon-swatch icon-free" maxlength="2"
            aria-label="Kendi simgen" placeholder="+"
            @input="editing.icon = iconInput.trim() || null"
          />
        </div>
      </div>

      <div v-if="open === 'color'" class="field picker-panel">
        <div class="chips-wrap">
          <button
            v-for="c in COLORS" :key="c"
            class="color-swatch" :class="{ on: editing.color === c }"
            :style="{ background: c }"
            :aria-label="`Renk ${c}`" :aria-pressed="editing.color === c"
            @click="editing.color = c"
          />
        </div>
        <div class="picker-hint">Grid'de ve istatistikte bu alışkanlığı bu renk temsil eder.</div>
      </div>

      <button class="btn btn-primary" style="width:100%;" @click="save">Kaydet</button>
    </div>
  </AppSheet>
</template>
