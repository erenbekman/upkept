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
const streaks = ref<{ name: string; days: number; barW: string }[]>([])
const topReason = ref<string>('—')
const topReasonCount = ref(0)
const dayNo = ref<number | null>(null)

function shift(dir: -1 | 1) {
  let m = month.value + dir, y = year.value
  if (m < 1) { m = 12; y-- }
  if (m > 12) { m = 1; y++ }
  year.value = y; month.value = m
}

function elapsedDays(): number {
  const isCurrent = year.value === now.getFullYear() && month.value === now.getMonth() + 1
  const isFuture = new Date(year.value, month.value - 1) > new Date(now.getFullYear(), now.getMonth())
  if (isFuture) return 0
  return isCurrent ? now.getDate() : daysInMonth(year.value, month.value)
}

async function load() {
  const habits = await habitsRepo.listActive()
  habitCount.value = habits.length
  const monthEntries = await entriesRepo.getMonth(year.value, month.value) as Entry[]
  const reasons = await entriesRepo.listReasons()
  const reasonMap = new Map(reasons.map((r: ReasonTag) => [r.id, r.name]))
  const start = await db.getMeta('challenge_start_date')
  dayNo.value = start ? challengeDay(start, today) : null

  const slots = habits.length * elapsedDays()
  const done = monthEntries.filter(e => e.status === 'done').length
  const partial = monthEntries.filter(e => e.status === 'partial').length
  completion.value = slots ? Math.round(((done + partial * 0.5) / slots) * 100) : 0
  consistency.value = slots ? Math.round((monthEntries.length / slots) * 100) : 0

  const tally = new Map<number, number>()
  for (const e of monthEntries) {
    if (e.reason_tag_id != null) tally.set(e.reason_tag_id, (tally.get(e.reason_tag_id) ?? 0) + 1)
  }
  let bestId: number | null = null, bestN = 0
  for (const [id, n] of tally) if (n > bestN) { bestId = id; bestN = n }
  topReason.value = bestId != null ? (reasonMap.get(bestId) ?? '—') : '—'
  topReasonCount.value = bestN

  // current streak (done or partial), walking back from today
  const winFirst = todayStr(new Date(new Date(today + 'T00:00:00').getTime() - 89 * 86400000))
  const recent = await entriesRepo.getRange(winFirst, today) as Entry[]
  const kept = new Map<number, Set<string>>()
  for (const e of recent) {
    if (e.status === 'done' || e.status === 'partial') {
      if (!kept.has(e.habit_id)) kept.set(e.habit_id, new Set())
      kept.get(e.habit_id)!.add(e.date)
    }
  }
  const raw = habits.map(h => {
    const set = kept.get(h.id) ?? new Set()
    let n = 0
    let cursor = new Date(today + 'T00:00:00')
    while (set.has(todayStr(cursor))) { n++; cursor = new Date(cursor.getTime() - 86400000) }
    return { name: h.name, days: n }
  })
  const max = Math.max(1, ...raw.map(s => s.days))
  streaks.value = raw.map(s => ({ ...s, barW: Math.max(8, Math.round((s.days / max) * 74)) + 'px' }))
}

onMounted(load)
watch([year, month], load)
</script>

<template>
  <div class="screen">
    <div class="row spread">
      <button class="icon-btn" @click="shift(-1)">‹</button>
      <div class="title">İstatistik</div>
      <button class="icon-btn" @click="shift(1)">›</button>
    </div>
    <div class="sub">{{ fmtMonth(year, month) }}<template v-if="dayNo != null"> · {{ dayNo }} günlük yolculuk</template></div>
  </div>

  <p v-if="!habitCount" class="sub" style="padding:0 20px;">Alışkanlık yok.</p>

  <div v-else class="screen" style="padding-top:0;">
    <div class="hero">
      <div class="hero-label">SÜREKLİLİK</div>
      <div class="hero-num"><b>{{ consistency }}</b><span>%</span></div>
      <div class="hero-text">Günlerin çoğunda kendine uğradın. Kusursuzluk değil — bırakmamak önemli.</div>
    </div>

    <div class="stat-grid">
      <div class="stat-card">
        <div class="stat-label">TAMAMLANMA</div>
        <div class="stat-num">{{ completion }}<small>%</small></div>
        <div class="stat-sub">tam + yarım</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">EN SIK SEBEP</div>
        <div class="stat-num" style="font-size:24px; margin-top:6px; line-height:1.1;">{{ topReason }}</div>
        <div class="stat-sub">{{ topReasonCount }} kez · yargı yok</div>
      </div>
    </div>

    <div class="card" style="margin-top:12px; padding:8px 18px 14px;">
      <div class="stat-label" style="padding:12px 0 6px;">ALIŞKANLIK BAŞINA GÜNCEL SERİ</div>
      <div v-for="s in streaks" :key="s.name" class="streak-row">
        <div class="flex1" style="font-size:15px; font-weight:600; color:var(--ink2);">{{ s.name }}</div>
        <div class="streak-bar" :style="{ width: s.barW }" />
        <div class="streak-days">{{ s.days }} gün</div>
      </div>
    </div>

    <div class="micro">Her seri bir gün önce sıfırdı.</div>
  </div>
</template>
