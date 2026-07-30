<script setup lang="ts">
import type { Habit } from '~/composables/useHabits'

const repo = useHabits()
const { show: toast } = useToast()
const habits = ref<Habit[]>([])
const editing = ref<Partial<Habit> | null>(null)

async function load() { habits.value = await repo.listActive() }
const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') editing.value = null }
onMounted(() => { load(); document.addEventListener('keydown', onKey) })
onUnmounted(() => document.removeEventListener('keydown', onKey))
watch(useSync().dataVersion, load)

function openNew() { editing.value = { name: '', target_desc: '', color: '#7d9a6f' } }
function openEdit(h: Habit) { editing.value = { ...h } }

async function save() {
  const e = editing.value!
  if (!e.name?.trim()) return
  if (e.id) {
    await repo.update(e.id, { name: e.name.trim(), target_desc: e.target_desc || null, color: e.color || null })
  } else {
    await repo.create({ name: e.name.trim(), target_desc: e.target_desc || undefined, color: e.color || undefined })
  }
  editing.value = null
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
      <div class="color-dot" :style="{ background: h.color || 'var(--accent)' }" />
      <div class="flex1" style="font-size:16px; font-weight:600; color:var(--ink2);">{{ h.name }}</div>
      <button class="icon-btn" @click="openEdit(h)">✎</button>
      <button class="icon-btn danger" @click="remove(h)">✕</button>
    </div>

    <button class="btn btn-dashed" style="width:100%; padding:16px; border-radius:18px;" @click="openNew">+ Yeni alışkanlık</button>
  </div>

  <div class="micro">Az ama sürdürülebilir. Üçten fazlası çoğu zaman fazladır.</div>

  <template v-if="editing">
    <div class="overlay" @click="editing = null" />
    <div class="sheet">
      <div class="grabber" />
      <div class="sheet-title" style="margin-bottom:16px;">{{ editing.id ? 'Düzenle' : 'Yeni alışkanlık' }}</div>
      <div style="display:flex; flex-direction:column; gap:12px;">
        <input v-model="editing.name" class="note-area" style="margin-top:0;" placeholder="Ad" />
        <input v-model="editing.target_desc" class="note-area" style="margin-top:0;" placeholder="Hedef açıklaması (opsiyonel)" />
        <div class="row spread field">
          <span style="color:var(--ink2); font-weight:600;">Renk</span>
          <input v-model="editing.color" type="color" style="width:56px; height:40px; padding:2px; border:none; background:none;" />
        </div>
        <button class="btn btn-primary" style="width:100%;" @click="save">Kaydet</button>
      </div>
    </div>
  </template>
</template>
