<script setup lang="ts">
import type { Entry, ReasonTag } from '~/composables/useEntries'

const habitsRepo = useHabits()
const entriesRepo = useEntries()
const db = useDb()

const now = new Date()
const year = useState('selYear', () => now.getFullYear())
const month = useState('selMonth', () => now.getMonth() + 1)
const today = todayStr()

const habitCount = ref(0)
const completion = ref(0)
const consistency = ref(0)
const streaks = ref<{ name: string; days: number; best: number; color: string | null; icon: string | null; barW: string }[]>([])
const topReason = ref<string>('—')
const topReasonCount = ref(0)
const dayNo = ref<number | null>(null)
const loaded = ref(false)

function shift(dir: -1 | 1) {
  let m = month.value + dir, y = year.value
  if (m < 1) { m = 12; y-- }
  if (m > 12) { m = 1; y++ }
  year.value = y; month.value = m
}

async function load() {
  const habits = await habitsRepo.listActive()
  habitCount.value = habits.length
  const monthEntries = await entriesRepo.getMonth(year.value, month.value) as Entry[]
  const reasons = await entriesRepo.listReasons()
  const reasonMap = new Map(reasons.map((r: ReasonTag) => [r.id, r.name]))
  const start = await db.getMeta('challenge_start_date')
  dayNo.value = start ? challengeDay(start, today) : null

  const s = monthStats({
    habits, entries: monthEntries,
    year: year.value, month: month.value, today, challengeStart: start,
  })
  completion.value = s.completion
  consistency.value = s.consistency
  topReason.value = s.topReasonId != null ? (reasonMap.get(s.topReasonId) ?? '—') : '—'
  topReasonCount.value = s.topReasonCount

  const history = await entriesRepo.getRange('2000-01-01', today) as Entry[]
  const raw = currentStreaks(habits, history, today)
  const max = Math.max(1, ...raw.map(x => x.days))
  streaks.value = raw.map(x => ({ ...x, barW: Math.max(8, Math.round((x.days / max) * 74)) + 'px' }))
  loaded.value = true
}

// The hero used to congratulate you at 0% too. It has to read the number.
const streakNote = computed(() => {
  const best = Math.max(0, ...streaks.value.map(s => s.best))
  if (!best) return ''
  if (streaks.value.every(s => !s.days)) return t('stats.streaksReset', { n: best })
  return t('stats.streaksNote')
})

const heroText = computed(() => {
  if (consistency.value === 0) return t('stats.heroZero')
  if (consistency.value < 50) return t('stats.heroLow')
  return t('stats.heroHigh')
})

onMounted(load)
watch([year, month, useSync().dataVersion], load)
</script>

<template>
  <div class="screen">
    <div class="row spread nowrap">
      <button class="icon-btn" :aria-label="t('common.prevMonth')" @click="shift(-1)">‹</button>
      <h1 class="title">{{ t('stats.title') }}</h1>
      <button class="icon-btn" :aria-label="t('common.nextMonth')" @click="shift(1)">›</button>
    </div>
    <div class="sub">{{ fmtMonth(year, month) }}<template v-if="dayNo != null"> · {{ t('stats.journey', { n: dayNo }) }}</template></div>
  </div>

  <EmptyState
    v-if="loaded && !habitCount"
    art="stats"
    :title="t('stats.emptyTitle')"
    :text="t('stats.emptyText')"
    :cta="t('common.addHabit')"
  />

  <div v-else-if="habitCount" class="screen" style="padding-top:0;">
    <div class="stats-top">
    <div class="hero">
      <div class="hero-label">{{ t('stats.consistency') }}</div>
      <div class="hero-num"><b>{{ consistency }}</b><span>%</span></div>
      <div class="hero-text">{{ heroText }}</div>
    </div>

    <div class="stat-grid">
      <div class="stat-card">
        <div class="stat-label">{{ t('stats.completion') }}</div>
        <div class="stat-num">{{ completion }}<small>%</small></div>
        <div class="stat-sub">{{ t('stats.completionSub') }}</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">{{ t('stats.topReason') }}</div>
        <div class="stat-num" style="font-size:var(--fs-3xl); margin-top:6px; line-height:1.1;">{{ topReason }}</div>
        <div class="stat-sub">{{ t('stats.topReasonSub', { n: topReasonCount }) }}</div>
      </div>
    </div>
    </div>

    <div class="card" style="margin-top:12px; padding:8px 18px 14px;">
      <div class="stat-label" style="padding:12px 0 6px;">{{ t('stats.streaks') }}</div>
      <div v-for="s in streaks" :key="s.name" class="streak-row">
        <div class="flex1" style="font-size:var(--fs-lg); font-weight:600; color:var(--ink2); display:flex; align-items:center; gap:8px;">
          <HabitMark :icon="s.icon" :color="s.color" sm />
          <span :title="s.name" style="min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">{{ s.name }}</span>
        </div>
        <div class="streak-bar" :style="{ width: s.barW, background: s.color || 'var(--accent)' }" />
        <div class="streak-days">
          {{ t('common.days', { n: s.days }) }}
          <small v-if="s.best > s.days">{{ t('stats.best', { n: s.best }) }}</small>
        </div>
      </div>
    </div>

    <div v-if="streakNote" class="micro">{{ streakNote }}</div>
  </div>
</template>
