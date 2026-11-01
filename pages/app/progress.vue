<script setup lang="ts">
import type { Habit } from '~/composables/useHabits'
import type { Entry, ReasonTag } from '~/composables/useEntries'

const habitsRepo = useHabits()
const entriesRepo = useEntries()
const db = useDb()
const { mono, accentHex } = useTheme()
const { locale } = useLocale()

const link = resolveComponent('NuxtLink')
const today = todayStr()
const now = new Date()
const year = useState('selYear', () => now.getFullYear())
const month = useState('selMonth', () => now.getMonth() + 1)
const view = useState<'month' | 'grid' | 'numbers'>('progress_view', () => 'month')
const selected = ref(today)

const habits = ref<Habit[]>([])
const monthEntries = ref<Entry[]>([])
const history = ref<Entry[]>([])
const reasons = ref<ReasonTag[]>([])
const startDate = ref<string | null>(null)
const loaded = ref(false)

const pad = (n: number) => String(n).padStart(2, '0')
const dateOf = (d: number) => `${year.value}-${pad(month.value)}-${pad(d)}`
const dayCount = computed(() => daysInMonth(year.value, month.value))
const dates = computed(() => Array.from({ length: dayCount.value }, (_, i) => dateOf(i + 1)))
const isCurrent = computed(() => today.startsWith(`${year.value}-${pad(month.value)}`))
const lastDay = computed(() => (isCurrent.value ? Number(today.slice(8)) : dates.value[0] > today ? 0 : dayCount.value))

async function load() {
  habits.value = await habitsRepo.listActive()
  monthEntries.value = await entriesRepo.getMonth(year.value, month.value)
  history.value = await entriesRepo.getRange('2000-01-01', today)
  reasons.value = await entriesRepo.listReasons()
  startDate.value = await db.getMeta('challenge_start_date')
  if (!selected.value.startsWith(`${year.value}-${pad(month.value)}`)) selected.value = isCurrent.value ? today : dateOf(Math.max(1, lastDay.value))
  loaded.value = true
  if (view.value === 'grid') scrollGrid()
}
const gridScroll = ref<HTMLElement | null>(null)
async function scrollGrid() {
  await nextTick()
  const el = gridScroll.value
  if (!el) return
  const cell = el.querySelector<HTMLElement>('.k-grid-days .today')
  if (cell) el.scrollLeft = cell.offsetLeft - el.clientWidth / 2 + cell.offsetWidth / 2
  else el.scrollLeft = dates.value[0] > today ? 0 : el.scrollWidth
}

onMounted(load)
watch([year, month], load)
watch(view, () => { if (view.value === 'grid') scrollGrid() })
watch(useSync().dataVersion, load)

function shift(dir: -1 | 1) {
  let m = month.value + dir
  let y = year.value
  if (m < 1) { m = 12; y-- }
  if (m > 12) { m = 1; y++ }
  if (`${y}-${pad(m)}-01` > today) return
  year.value = y
  month.value = m
  haptic()
}
const canNext = computed(() => {
  const m = month.value === 12 ? 1 : month.value + 1
  const y = month.value === 12 ? year.value + 1 : year.value
  return `${y}-${pad(m)}-01` <= today
})

const colorOf = (h: Habit) => (mono.value ? accentHex.value : h.color || accentHex.value)
const fractions = computed(() => fractionsByDate(habits.value, monthEntries.value, dates.value))
const entryMap = computed(() => Object.fromEntries(monthEntries.value.map(e => [`${e.habit_id}-${e.date}`, e])))

const mondayFirst = computed(() => locale.value === 'tr')
const weekdayNames = computed(() => {
  const names = tList<string>('common.weekdayMin')
  return mondayFirst.value ? [...names.slice(1), names[0]] : names
})
const lead = computed(() => {
  const wd = weekdayOf(dateOf(1))
  return mondayFirst.value ? (wd + 6) % 7 : wd
})
const cells = computed(() => dates.value.map((d) => {
  const f = fractions.value[d] ?? 0
  const future = d > today
  return {
    d, n: Number(d.slice(8)), future,
    grad: future ? 'linear-gradient(var(--k-empty), var(--k-empty))' : fillGradient(f, accentHex.value, 'var(--k-empty)'),
    aria: `${fmtShort(d)}, ${t('today.filled', { n: Math.round(f * 100) })}${d === today ? `, ${t('common.today')}` : ''}`,
  }
}))

const detail = computed(() => {
  const d = selected.value
  const byHabit: Record<number, Entry> = {}
  for (const e of monthEntries.value) if (e.date === d) byHabit[e.habit_id] = e
  const list = habits.value.filter(h => plannedOn(h, d, byHabit[h.id]))
  const no = startDate.value ? challengeDay(startDate.value, d) : null
  return {
    title: [fmtShort(d), no != null ? t('today.dayN', { n: no }) : ''].filter(Boolean).join(' · '),
    pct: Math.round((fractions.value[d] ?? 0) * 100),
    items: list.map((h) => {
      const e = byHabit[h.id]
      const s = e?.status ?? null
      const reason = e?.reason_tag_id != null ? reasons.value.find(r => r.id === e.reason_tag_id)?.name : null
      return {
        id: h.id, name: h.name,
        label: s ? [statusMeta(s, h.kind).label, reason].filter(Boolean).join(' · ') : t('status.empty'),
        glyph: s ? statusMeta(s, h.kind).glyph : '·',
        bg: s === 'done' ? colorOf(h) : s === 'partial' ? `${colorOf(h)}44` : 'var(--k-empty)',
        ink: s === 'done' ? '#fff' : 'var(--k-ink)',
      }
    }),
  }
})

const gridRows = computed(() => habits.value.map(h => ({
  h,
  color: colorOf(h),
  cells: dates.value.map((d) => {
    const e = entryMap.value[`${h.id}-${d}`]
    const s = e?.status
    const future = d > today
    const off = !future && !e && !plannedOn(h, d, null)
    return {
      d, future, off, today: d === today,
      h: s === 'rest' ? '100%' : `${Math.round(habitWeight(h, e) * 100)}%`,
      op: s === 'rest' ? 0.22 : 1,
      glyph: s === 'missed' ? '✕' : s === 'rest' ? '‖' : '',
      ink: s === 'rest' ? colorOf(h) : 'var(--k-ghost)',
      aria: `${h.name}, ${fmtShort(d)}: ${s ? statusMeta(s, h.kind).label : t('status.empty')}`,
    }
  }),
})))

const legend = computed(() => [
  { label: t('status.done'), h: '100%', op: 1 },
  { label: t('status.partial'), h: '50%', op: 1 },
  { label: t('status.rest'), h: '100%', op: 0.3 },
  { label: `${t('status.missed')} ✕`, h: '0%', op: 1 },
])

const habitMonth = computed(() => habits.value.map((h) => {
  let done = 0
  let plan = 0
  for (const d of dates.value) {
    if (d > today) break
    const e = entryMap.value[`${h.id}-${d}`]
    if (!plannedOn(h, d, e) || e?.status === 'rest') continue
    plan++
    if (e?.status === 'done') done++
  }
  return { h, color: colorOf(h), done, plan, pct: plan ? Math.round((done / plan) * 100) : 0 }
}))

const stats = computed(() => monthStats({ habits: habits.value, entries: monthEntries.value, year: year.value, month: month.value, today, challengeStart: startDate.value }))
const streaks = computed(() => {
  const list = currentStreaks(habits.value, history.value, today)
  const max = Math.max(1, ...list.map(s => s.best))
  return list.map((s, i) => ({ ...s, color: colorOf(habits.value[i]), w: `${Math.round((s.days / max) * 100)}%` }))
})
const tiles = computed(() => {
  const past = dates.value.filter(d => d <= today).map(d => fractions.value[d]).filter((v): v is number => v != null)
  let run = 0
  let best = 0
  let full = 0
  for (const f of past) {
    if (f >= 1) { full++; run++; best = Math.max(best, run) } else run = 0
  }
  const avg = past.length ? Math.round((past.reduce((a, b) => a + b, 0) / past.length) * 100) : 0
  return [
    { v: String(full), k: t('progress.fullDays') },
    { v: percentFirst() ? `%${avg}` : `${avg}%`, k: t('progress.average') },
    { v: String(best), k: t('progress.bestRun') },
  ]
})
const heroGrad = computed(() => fillGradient(stats.value.consistency / 100, accentHex.value, 'var(--k-empty)', 10, 76))
const heroText = computed(() => {
  if (stats.value.consistency === 0) return t('stats.heroZero')
  if (stats.value.consistency < 50) return t('stats.heroLow')
  return t('stats.heroHigh')
})
const reasonBars = computed(() => {
  const tally = new Map<number, number>()
  for (const e of monthEntries.value) if (e.reason_tag_id != null) tally.set(e.reason_tag_id, (tally.get(e.reason_tag_id) ?? 0) + 1)
  const list = [...tally].map(([id, n]) => ({ name: reasons.value.find(r => r.id === id)?.name ?? '—', n })).sort((a, b) => b.n - a.n).slice(0, 5)
  const max = Math.max(1, ...list.map(r => r.n))
  return list.map((r, i) => ({ ...r, w: `${Math.round((r.n / max) * 100)}%`, op: i === 0 ? 0.9 : 0.35 }))
})
const week = computed(() => {
  const sum = [0, 0, 0, 0, 0, 0, 0]
  const cnt = [0, 0, 0, 0, 0, 0, 0]
  for (const d of dates.value) {
    if (d > today) break
    const f = fractions.value[d]
    if (f == null) continue
    const wd = weekdayOf(d)
    sum[wd] += f
    cnt[wd]++
  }
  const avg = sum.map((s, i) => (cnt[i] ? s / cnt[i] : null))
  const order = mondayFirst.value ? [1, 2, 3, 4, 5, 6, 0] : [0, 1, 2, 3, 4, 5, 6]
  const names = tList<string>('common.weekdayMin')
  const vals = avg.filter((v): v is number => v != null)
  const max = Math.max(0.01, ...vals)
  const min = vals.length ? Math.min(...vals) : null
  const hardest = min != null && vals.length > 1 && min < max ? avg.indexOf(min) : null
  return {
    bars: order.map(i => ({ d: names[i], h: `${Math.max(8, Math.round(((avg[i] ?? 0) / max) * 70))}px`, op: avg[i] == null ? 0.15 : avg[i] === max ? 1 : 0.35 + ((avg[i] ?? 0) / max) * 0.4 })),
    hardest: hardest != null ? fmtWeekdayLong(shiftDate('2024-01-07', hardest)) : null,
  }
})
const journey = computed(() => (startDate.value ? challengeDay(startDate.value, today) : null))
</script>

<template>
  <div class="k-page k-progress">
    <div class="k-head">
      <h1 class="k-large">{{ t('tabs.progress') }}</h1>
      <span v-if="journey" class="k-head-note">{{ t('progress.journey', { n: journey }) }}</span>
    </div>

    <div class="k-seg tall" role="tablist" :aria-label="t('tabs.progress')" style="margin-top:14px;">
      <button v-for="v in (['month', 'grid', 'numbers'] as const)" :key="v" role="tab" :class="{ on: view === v }" :aria-selected="view === v" @click="view = v; haptic()">{{ t(`progress.${v}`) }}</button>
    </div>

    <div class="k-pager" style="margin-top:6px;">
      <button class="k-icon-btn" :aria-label="t('common.prevMonth')" @click="shift(-1)">
        <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4L6 9l5 5" /></svg>
      </button>
      <b>{{ fmtMonth(year, month) }}</b>
      <button class="k-icon-btn" :aria-label="t('common.nextMonth')" :disabled="!canNext" @click="shift(1)">
        <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 4l5 5-5 5" /></svg>
      </button>
    </div>

    <div v-if="loaded && !habits.length" class="k-empty">
      <b>{{ t('grid.emptyTitle') }}</b>
      <span>{{ t('grid.emptyText') }}</span>
      <NuxtLink to="/app/habit/new" class="k-btn primary small" style="margin-top:8px;">{{ t('common.addHabit') }}</NuxtLink>
    </div>

    <template v-else-if="loaded">
      <div v-if="view === 'month'" :key="`m-${year}-${month}`" style="animation:kFade .25s ease both;">
        <div class="k-cal">
          <span v-for="w in weekdayNames" :key="w" class="k-cal-wd">{{ w }}</span>
          <span v-for="i in lead" :key="`l${i}`" class="k-cal-cell" />
          <div v-for="c in cells" :key="c.d" class="k-cal-cell">
            <button class="k-cal-btn" :class="{ sel: selected === c.d }" :disabled="c.future" :aria-label="c.aria" :aria-pressed="selected === c.d" @click="selected = c.d; haptic()">
              <span class="k-fill-text k-cal-num" :style="{ backgroundImage: c.grad }">{{ c.n }}</span>
              <span class="k-cal-mark" :style="{ background: c.d === today ? 'var(--k-accent)' : 'transparent' }" />
            </button>
          </div>
        </div>

        <div :key="selected" class="k-detail k-glass">
          <div style="display:flex; justify-content:space-between; align-items:center; gap:10px;">
            <span style="display:flex; flex-direction:column; min-width:0;">
              <b style="font-size:17px;">{{ detail.title }}</b>
              <span style="font-size:13px; font-weight:650; color:var(--k-accent-ink);">{{ t('today.filled', { n: detail.pct }) }}</span>
            </span>
            <NuxtLink :to="`/app/day/${selected}`" class="k-btn primary small">{{ t('progress.edit') }}</NuxtLink>
          </div>
          <div v-if="detail.items.length" class="k-detail-grid">
            <div v-for="i in detail.items" :key="i.id" class="k-detail-item">
              <span class="k-glyph" aria-hidden="true" :style="{ background: i.bg, color: i.ink }">{{ i.glyph }}</span>
              <span><b>{{ i.name }}</b><small>{{ i.label }}</small></span>
            </div>
          </div>
          <span v-else style="font-size:13.5px; color:var(--k-sub);">{{ t('today.sumOff') }}</span>
        </div>
      </div>

      <div v-else-if="view === 'grid'" :key="`g-${year}-${month}`" style="animation:kFade .25s ease both; display:flex; flex-direction:column; gap:12px;">
        <div class="k-grid-card" data-no-ptr>
          <div class="k-grid-names">
            <div v-for="r in gridRows" :key="r.h.id" class="k-grid-name">
              <span class="k-dot" style="width:8px; height:8px;" :style="{ background: r.color }" />
              <span>{{ r.h.name }}</span>
            </div>
          </div>
          <div ref="gridScroll" class="k-grid-scroll">
            <div class="k-grid-inner">
              <div class="k-grid-days" aria-hidden="true">
                <span v-for="d in dates" :key="d" :class="{ today: d === today }">{{ Number(d.slice(8)) }}</span>
              </div>
              <div v-for="r in gridRows" :key="r.h.id" class="k-grid-line">
                <component
                  :is="c.future ? 'span' : link" v-for="c in r.cells" :key="c.d" :to="c.future ? undefined : `/app/day/${c.d}`"
                  class="k-cell" :class="{ today: c.today, off: c.off, future: c.future }" :aria-label="c.aria"
                >
                  <i :style="{ height: c.h, background: r.color, opacity: c.op }" />
                  <em :style="{ color: c.ink }" aria-hidden="true">{{ c.glyph }}</em>
                </component>
              </div>
            </div>
          </div>
        </div>
        <div class="k-legend" aria-hidden="true">
          <span v-for="l in legend" :key="l.label"><i><b :style="{ height: l.h, opacity: l.op }" /></i>{{ l.label }}</span>
        </div>
        <div class="k-group">
          <NuxtLink v-for="m in habitMonth" :key="m.h.id" :to="`/app/habit/${m.h.id}`" class="k-row tall">
            <span class="k-dot" :style="{ background: m.color }" />
            <span class="k-row-label">
              <span style="font-size:15.5px; font-weight:650;">{{ m.h.name }}</span>
              <small>{{ t('progress.habitLine', { done: m.done, total: m.plan }) }}</small>
            </span>
            <span class="k-tnum" style="font-size:20px; font-weight:800; letter-spacing:-0.02em;">{{ percentFirst() ? `%${m.pct}` : `${m.pct}%` }}</span>
          </NuxtLink>
        </div>
      </div>

      <div v-else :key="`n-${year}-${month}`" style="animation:kFade .25s ease both; display:flex; flex-direction:column; gap:10px;">
        <div class="k-hero">
          <span class="k-fill-text" style="font-size:88px; line-height:0.9;" :style="{ backgroundImage: heroGrad }">{{ percentFirst() ? `%${stats.consistency}` : `${stats.consistency}%` }}</span>
          <span class="k-hero-text">
            <b>{{ t('stats.consistency') }}</b>
            <span>{{ heroText }}</span>
          </span>
        </div>
        <div class="k-tiles">
          <div v-for="tl in tiles" :key="tl.k" class="k-tile"><b>{{ tl.v }}</b><span>{{ tl.k }}</span></div>
        </div>
        <div class="k-panel">
          <div class="k-panel-title">{{ t('stats.streaks') }}<span>{{ t('stats.completion') }} {{ percentFirst() ? `%${stats.completion}` : `${stats.completion}%` }}</span></div>
          <div v-for="s in streaks" :key="s.name" style="display:flex; flex-direction:column; gap:5px;">
            <div style="display:flex; justify-content:space-between; gap:10px; font-size:14px; font-weight:650;">
              <span style="min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">{{ s.name }}</span>
              <span class="k-tnum" style="flex-shrink:0;">{{ t('common.days', { n: s.days }) }} <span style="color:var(--k-faint); font-weight:500;">· {{ t('stats.best', { n: s.best }) }}</span></span>
            </div>
            <span class="k-bar" aria-hidden="true"><i :style="{ width: s.w, background: s.color }" /></span>
          </div>
          <span style="font-size:12.5px; font-weight:500; color:var(--k-faint);">{{ t('stats.streaksNote') }}</span>
        </div>
        <div class="k-panel">
          <div class="k-panel-title">{{ t('progress.whyMissed') }}<span>{{ t('progress.noJudgement') }}</span></div>
          <template v-if="reasonBars.length">
            <div v-for="r in reasonBars" :key="r.name" style="display:grid; grid-template-columns:minmax(0, 120px) 1fr 28px; align-items:center; gap:10px; font-size:14px; font-weight:600;">
              <span style="overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">{{ r.name }}</span>
              <span class="k-bar" style="height:10px;" aria-hidden="true"><i :style="{ width: r.w, background: 'var(--k-ink)', opacity: r.op }" /></span>
              <span class="k-tnum" style="text-align:right; color:var(--k-sub);">{{ r.n }}</span>
            </div>
          </template>
          <span v-else style="font-size:13.5px; color:var(--k-sub);">{{ t('stats.topReasonNone') }}</span>
        </div>
        <div class="k-panel">
          <div class="k-panel-title">{{ t('progress.weekdays') }}</div>
          <div class="k-week" aria-hidden="true">
            <div v-for="b in week.bars" :key="b.d"><i :style="{ height: b.h, opacity: b.op }" /><span>{{ b.d }}</span></div>
          </div>
          <span v-if="week.hardest" style="font-size:12.5px; font-weight:500; color:var(--k-faint);">{{ t('progress.hardest', { day: week.hardest.toLocaleLowerCase(dateLocale()) }) }}</span>
        </div>
      </div>
    </template>
  </div>
</template>
