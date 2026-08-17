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
const streaks = ref<{ name: string; days: number; color: string | null; icon: string | null; barW: string }[]>([])
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

  const recent = await entriesRepo.getRange(shiftDate(today, -89), today) as Entry[]
  const raw = currentStreaks(habits, recent, today)
  const max = Math.max(1, ...raw.map(x => x.days))
  streaks.value = raw.map(x => ({ ...x, barW: Math.max(8, Math.round((x.days / max) * 74)) + 'px' }))
  loaded.value = true
}

// The hero used to congratulate you at 0% too. It has to read the number.
const heroText = computed(() => {
  if (consistency.value === 0) return 'Bu ay henüz işaretleme yok. Tek bir gün bile başlangıçtır.'
  if (consistency.value < 50) return 'Başladın. Kusursuzluk değil — geri dönmek önemli.'
  return 'Günlerin çoğunda kendine uğradın. Kusursuzluk değil — bırakmamak önemli.'
})

onMounted(load)
watch([year, month, useSync().dataVersion], load)
</script>

<template>
  <div class="screen">
    <div class="row spread nowrap">
      <button class="icon-btn" aria-label="Önceki ay" @click="shift(-1)">‹</button>
      <h1 class="title">İstatistik</h1>
      <button class="icon-btn" aria-label="Sonraki ay" @click="shift(1)">›</button>
    </div>
    <div class="sub">{{ fmtMonth(year, month) }}<template v-if="dayNo != null"> · {{ dayNo }} günlük yolculuk</template></div>
  </div>

  <p v-if="loaded && !habitCount" class="sub" style="padding:0 20px;">Alışkanlık yok.</p>

  <div v-else-if="habitCount" class="screen" style="padding-top:0;">
    <div class="hero">
      <div class="hero-label">SÜREKLİLİK</div>
      <div class="hero-num"><b>{{ consistency }}</b><span>%</span></div>
      <div class="hero-text">{{ heroText }}</div>
    </div>

    <div class="stat-grid">
      <div class="stat-card">
        <div class="stat-label">TAMAMLANMA</div>
        <div class="stat-num">{{ completion }}<small>%</small></div>
        <div class="stat-sub">tam + yarım</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">EN SIK SEBEP</div>
        <div class="stat-num" style="font-size:var(--fs-3xl); margin-top:6px; line-height:1.1;">{{ topReason }}</div>
        <div class="stat-sub">{{ topReasonCount }} kez · yargı yok</div>
      </div>
    </div>

    <div class="card" style="margin-top:12px; padding:8px 18px 14px;">
      <div class="stat-label" style="padding:12px 0 6px;">ALIŞKANLIK BAŞINA GÜNCEL SERİ</div>
      <div v-for="s in streaks" :key="s.name" class="streak-row">
        <div class="flex1" style="font-size:var(--fs-lg); font-weight:600; color:var(--ink2); display:flex; align-items:center; gap:8px;">
          <span :class="s.icon ? 'habit-mark sm' : 'habit-bar'" :style="{ background: s.color || 'var(--accent)' }">{{ s.icon || '' }}</span>
          <span :title="s.name" style="min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">{{ s.name }}</span>
        </div>
        <div class="streak-bar" :style="{ width: s.barW, background: s.color || 'var(--accent)' }" />
        <div class="streak-days">{{ s.days }} gün</div>
      </div>
    </div>

    <div class="micro">Her seri bir gün önce sıfırdı.</div>
  </div>
</template>
