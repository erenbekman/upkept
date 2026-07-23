<script setup lang="ts">
import type { Habit } from '~/composables/useHabits'
import type { Entry, ReasonTag } from '~/composables/useEntries'

const habitsRepo = useHabits()
const entriesRepo = useEntries()
const db = useDb()
const { show: toast } = useToast()

const today = todayStr()
const habits = ref<Habit[]>([])
const byHabit = ref<Record<number, Entry>>({})
const reasonName = ref<Record<number, string>>({})
const dayNo = ref<number | null>(null)
const editing = ref<Habit | null>(null)

async function load() {
  habits.value = await habitsRepo.listActive()
  const list = await entriesRepo.getForDate(today)
  byHabit.value = Object.fromEntries(list.map(e => [e.habit_id, e]))
  const reasons = await entriesRepo.listReasons()
  reasonName.value = Object.fromEntries(reasons.map((r: ReasonTag) => [r.id, r.name]))
  const start = await db.getMeta('challenge_start_date')
  dayNo.value = start ? challengeDay(start, today) : null
}
onMounted(load)

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
</script>

<template>
  <div class="screen">
    <div class="brand">
      <svg width="26" height="26" viewBox="0 0 60 60" fill="none">
        <path d="M47 22 A19 19 0 1 0 49 34" stroke="var(--accent)" stroke-width="6.5" stroke-linecap="round" />
        <circle cx="47" cy="14" r="4.6" fill="var(--accent)" />
      </svg>
      <span>upkept</span>
    </div>
    <div class="big-day">{{ dayNo != null ? `Gün ${dayNo}` : 'Bugün' }}</div>
    <div class="sub" style="font-size:15px;">{{ fmtLong(today) }}</div>
    <div class="serif-note">Bugün nasıl geçti? Acele yok.</div>
  </div>

  <div v-if="!habits.length" class="empty-card">
    <div class="empty-icon">✿</div>
    <div class="empty-title">Henüz alışkanlık yok</div>
    <div class="empty-text">Küçük başlamak yeterli. İlk alışkanlığını ekleyerek başla.</div>
    <NuxtLink to="/habits"><button class="btn btn-primary">İlk alışkanlığını ekle</button></NuxtLink>
  </div>

  <div v-else class="habit-list">
    <div
      v-for="h in habits"
      :key="h.id"
      class="habit-row"
      role="button"
      @click="editing = h"
    >
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
    :date="today"
    :current="byHabit[editing.id] ?? null"
    @saved="onSaved"
    @close="editing = null"
  />
</template>
