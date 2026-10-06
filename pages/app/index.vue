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

const doneCount = computed(() => habits.value.filter(h => byHabit.value[h.id]?.status === 'done').length)
const progress = computed(() => {
  if (!habits.value.length) return 0
  const partial = habits.value.filter(h => byHabit.value[h.id]?.status === 'partial').length
  return Math.round(((doneCount.value + partial / 2) / habits.value.length) * 100)
})
const allDone = computed(() => habits.value.length > 0 && doneCount.value === habits.value.length)
const summaryText = computed(() => {
  if (allDone.value) return t('today.sumAll')
  if (doneCount.value || progress.value) return t('today.sumSome')
  return isToday.value ? t('today.prompt') : t('today.sumPast')
})

const popId = ref<number | null>(null)
const celebrate = ref(false)
let popTimer: ReturnType<typeof setTimeout>
let celebrateTimer: ReturnType<typeof setTimeout>

function feedback(habitId: number | null, wasAllDone: boolean) {
  clearTimeout(popTimer)
  popId.value = habitId
  popTimer = setTimeout(() => { popId.value = null }, 450)
  if (allDone.value && !wasAllDone) {
    haptic('success')
    clearTimeout(celebrateTimer)
    celebrate.value = true
    celebrateTimer = setTimeout(() => { celebrate.value = false }, 1200)
  } else if (habitId != null) {
    haptic()
  }
}

// One tap marks done, a second tap takes it back; partial and missed go
// straight to done. Anything finer (reasons, notes) lives behind the row.
async function quickToggle(h: Habit) {
  const wasAllDone = allDone.value
  const cur = byHabit.value[h.id]
  const d = date.value
  if (cur?.status === 'done') {
    const { [h.id]: _, ...rest } = byHabit.value
    byHabit.value = rest
    haptic()
    await entriesRepo.remove(h.id, d)
  } else {
    byHabit.value = { ...byHabit.value, [h.id]: { ...(cur ?? {}), habit_id: h.id, date: d, status: 'done', reason_tag_id: null, note: null } as Entry }
    feedback(h.id, wasAllDone)
    await entriesRepo.upsert({ habit_id: h.id, date: d, status: 'done' })
  }
  await load()
}

async function onSaved() {
  const wasAllDone = allDone.value
  await load()
  const h = editing.value
  editing.value = null
  if (h && byHabit.value[h.id]) {
    feedback(byHabit.value[h.id].status === 'done' ? h.id : null, wasAllDone)
    toast(t('common.saved'))
  }
}

const syncLabel = computed(() => {
  if (!syncApi.code.value) return t('today.connect')
  if (syncApi.status.value === 'syncing') return t('common.syncing')
  if (syncApi.status.value === 'error') return t('today.syncError')
  return t('today.syncedAgo', { ago: fmtAgo(syncApi.lastAt.value) })
})

async function syncNow() {
  if (!syncApi.code.value) return navigateTo('/app/settings')
  const ok = await syncApi.sync()
  if (ok) toast(t('common.upToDate'))
  else toast(t('common.syncFailed'), true)
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
      <button class="icon-btn" :aria-label="t('common.prevDay')" @click="step(-1)">‹</button>
      <div style="text-align:center;">
        <h1 class="big-day">{{ dayNo != null ? t('today.dayN', { n: dayNo }) : (isToday ? t('common.today') : fmtShort(date)) }}</h1>
        <div class="sub" style="font-size:var(--fs-lg);">{{ fmtLong(date) }}</div>
      </div>
      <button class="icon-btn" :aria-label="t('common.nextDay')" :disabled="isToday" @click="step(1)">›</button>
    </div>

    <div v-if="!isToday" class="row" style="justify-content:center; margin-top:10px;">
      <button class="back-today" @click="date = today">{{ t('today.backToToday') }}</button>
    </div>

    <div v-if="habits.length" class="day-summary" :class="{ complete: allDone, celebrate }" role="status">
      <svg class="ring" viewBox="0 0 48 48" aria-hidden="true">
        <circle class="ring-track" cx="24" cy="24" r="19" />
        <circle class="ring-fill" cx="24" cy="24" r="19" pathLength="100" :style="{ strokeDashoffset: 100 - progress }" />
        <path class="ring-check" d="M17 24.5l5 5 9-10" pathLength="1" />
      </svg>
      <div class="flex1">
        <div class="sum-title">{{ t('today.summary', { done: doneCount, total: habits.length }) }}</div>
        <div class="sum-sub">{{ summaryText }}</div>
      </div>
    </div>
  </div>

  <Onboarding v-if="loaded && !habits.length" @done="load" />

  <div v-else-if="habits.length" class="habit-list">
    <div v-for="h in habits" :key="h.id" class="habit-row" @click="editing = h">
      <button class="habit-main" :aria-label="`${h.name} — ${subLabel(h.id)}`" @click.stop="editing = h">
        <HabitMark :icon="h.icon" :color="h.color" />
        <span class="flex1">
          <span class="habit-name">{{ h.name }}</span>
          <span class="habit-sub" :class="meta(h.id).cls">{{ subLabel(h.id) }}</span>
        </span>
      </button>
      <button
        class="pill" :class="[meta(h.id).cls, { pop: popId === h.id }]"
        :aria-label="byHabit[h.id]?.status === 'done' ? t('today.unmark', { name: h.name }) : t('today.markDone', { name: h.name })"
        :aria-pressed="byHabit[h.id]?.status === 'done'"
        @click.stop="quickToggle(h)"
      >
        <span v-if="byHabit[h.id]" class="pill-text">{{ meta(h.id).label }}</span>
        <span class="glyph-dot">{{ byHabit[h.id] ? meta(h.id).glyph : '✓' }}</span>
      </button>
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
