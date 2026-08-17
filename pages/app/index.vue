<script setup lang="ts">
import type { Habit } from '~/composables/useHabits'
import type { Entry, ReasonTag } from '~/composables/useEntries'

const habitsRepo = useHabits()
const entriesRepo = useEntries()
const db = useDb()
const { show: toast } = useToast()
const syncApi = useSync()

const today = todayStr()
const date = ref(today)
const habits = ref<Habit[]>([])
const byHabit = ref<Record<number, Entry>>({})
const reasonName = ref<Record<number, string>>({})
const startDate = ref<string | null>(null)
const editing = ref<Habit | null>(null)
// Without this the first paint asserts "Henüz alışkanlık yok" before the query
// has even run — the empty state flashed on every visit.
const loaded = ref(false)

const isToday = computed(() => date.value === today)
const dayNo = computed(() => (startDate.value ? challengeDay(startDate.value, date.value) : null))

async function load() {
  habits.value = await habitsRepo.listActive()
  const list = await entriesRepo.getForDate(date.value)
  byHabit.value = Object.fromEntries(list.map(e => [e.habit_id, e]))
  const reasons = await entriesRepo.listReasons()
  reasonName.value = Object.fromEntries(reasons.map((r: ReasonTag) => [r.id, r.name]))
  startDate.value = await db.getMeta('challenge_start_date')
  loaded.value = true
}
onMounted(load)
watch(date, load)
watch(syncApi.dataVersion, load)

function step(dir: -1 | 1) {
  const next = shiftDate(date.value, dir)
  if (next > today) return
  date.value = next
}

function meta(id: number) {
  return statusMeta(byHabit.value[id]?.status ?? null)
}
function subLabel(id: number) {
  const e = byHabit.value[id]
  if (e?.reason_tag_id != null && reasonName.value[e.reason_tag_id]) return reasonName.value[e.reason_tag_id]
  return meta(id).sub
}

async function onSaved() {
  await load()
  const h = editing.value
  editing.value = null
  if (h && byHabit.value[h.id]) toast('Kaydedildi ✓')
}

const syncLabel = computed(() => {
  if (!syncApi.code.value) return 'Cihazları bağla'
  if (syncApi.status.value === 'syncing') return 'Güncelleniyor…'
  if (syncApi.status.value === 'error') return 'Güncellenemedi · dokun'
  return `Güncellendi · ${fmtAgo(syncApi.lastAt.value)}`
})

async function syncNow() {
  if (!syncApi.code.value) return navigateTo('/app/settings')
  const ok = await syncApi.sync()
  if (ok) toast('Güncel ✓')
  else toast('Güncellenemedi — bağlantını kontrol et', true)
}
</script>

<template>
  <div class="screen">
    <div class="row spread" style="margin-bottom:16px;">
      <div class="brand" style="margin-bottom:0;">
        <svg width="26" height="26" viewBox="0 0 60 60" fill="none">
          <path d="M47 22 A19 19 0 1 0 49 34" stroke="var(--accent)" stroke-width="6.5" stroke-linecap="round" />
          <circle cx="47" cy="14" r="4.6" fill="var(--accent)" />
        </svg>
        <span>upkept</span>
      </div>
      <button
        class="sync-chip"
        :class="{ syncing: syncApi.status.value === 'syncing', bad: syncApi.status.value === 'error', off: !syncApi.code.value }"
        @click="syncNow"
      >
        <span class="sync-ic">⟳</span>
        <span>{{ syncLabel }}</span>
      </button>
    </div>

    <div class="row spread nowrap">
      <button class="icon-btn" aria-label="Önceki gün" @click="step(-1)">‹</button>
      <div style="text-align:center;">
        <h1 class="big-day">{{ dayNo != null ? `Gün ${dayNo}` : (isToday ? 'Bugün' : fmtShort(date)) }}</h1>
        <div class="sub" style="font-size:var(--fs-lg);">{{ fmtLong(date) }}</div>
      </div>
      <button class="icon-btn" aria-label="Sonraki gün" :disabled="isToday" @click="step(1)">›</button>
    </div>

    <div v-if="!isToday" class="row" style="justify-content:center; margin-top:10px;">
      <button class="back-today" @click="date = today">Bugüne dön</button>
    </div>
    <div v-else class="serif-note">Bugün nasıl geçti? Acele yok.</div>
  </div>

  <div v-if="loaded && !habits.length" class="empty-card">
    <div class="empty-icon">✿</div>
    <h2 class="empty-title">Henüz alışkanlık yok</h2>
    <div class="empty-text">Küçük başlamak yeterli. İlk alışkanlığını ekleyerek başla.</div>
    <NuxtLink to="/app/habits"><button class="btn btn-primary">İlk alışkanlığını ekle</button></NuxtLink>
  </div>

  <div v-else-if="habits.length" class="habit-list">
    <div
      v-for="h in habits"
      :key="h.id"
      class="habit-row"
      role="button"
      tabindex="0"
      :aria-label="`${h.name} — ${subLabel(h.id)}`"
      @click="editing = h"
      @keydown.enter.prevent="editing = h"
      @keydown.space.prevent="editing = h"
    >
      <div :class="h.icon ? 'habit-mark' : 'habit-bar'" :style="{ background: h.color || 'var(--accent)' }">{{ h.icon || '' }}</div>
      <div class="flex1">
        <div class="habit-name">{{ h.name }}</div>
        <div class="habit-sub" :class="meta(h.id).cls">{{ subLabel(h.id) }}</div>
      </div>
      <div class="pill" :class="meta(h.id).cls">
        <span v-if="byHabit[h.id]" class="pill-text">{{ meta(h.id).label }}</span>
        <span class="glyph-dot">{{ meta(h.id).glyph }}</span>
      </div>
    </div>
  </div>

  <StatusEditor
    v-if="editing"
    :habit-id="editing.id"
    :habit-name="editing.name"
    :date="date"
    :current="byHabit[editing.id] ?? null"
    :can-next="!isToday"
    @saved="onSaved"
    @goto="d => (date = d)"
    @close="editing = null"
  />
</template>
