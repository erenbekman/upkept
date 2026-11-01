<script setup lang="ts">
import type { Habit } from '~/composables/useHabits'
import type { Entry, EntryStatus, ReasonTag } from '~/composables/useEntries'

const route = useRoute()
const router = useRouter()
const habitsRepo = useHabits()
const entriesRepo = useEntries()
const db = useDb()
const { mono, accentHex } = useTheme()

const today = todayStr()
const valid = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(d)) && d <= today
const date = computed(() => {
  const d = String(route.params.date)
  return valid(d) ? d : today
})

const habits = ref<Habit[]>([])
const byHabit = ref<Record<number, Entry>>({})
const reasons = ref<ReasonTag[]>([])
const startDate = ref<string | null>(null)
const notes = ref<Record<number, string>>({})

async function load() {
  habits.value = await habitsRepo.listActive()
  const list = await entriesRepo.getForDate(date.value)
  byHabit.value = Object.fromEntries(list.map(e => [e.habit_id, e]))
  notes.value = Object.fromEntries(list.map(e => [e.habit_id, e.note ?? '']))
  reasons.value = await entriesRepo.listReasons()
  startDate.value = await db.getMeta('challenge_start_date')
}
onMounted(load)
watch(date, load)
watch(useSync().dataVersion, load)

const colorOf = (h: Habit) => (mono.value ? accentHex.value : h.color || accentHex.value)
const statusOf = (h: Habit) => byHabit.value[h.id]?.status ?? null
const counting = (h: Habit) => !!h.goal && h.kind !== 'quit'
const planned = computed(() => habits.value.filter(h => plannedOn(h, date.value, byHabit.value[h.id])))
const unplanned = computed(() => habits.value.filter(h => !plannedOn(h, date.value, byHabit.value[h.id])))
const layers = computed(() => dayLayers(planned.value.map(h => ({ ...h, color: colorOf(h) })), byHabit.value, date.value, accentHex.value))
const pct = computed(() => Math.round(layers.value.reduce((a, l) => a + l.value, 0) * 100))
const dayNo = computed(() => (startDate.value ? challengeDay(startDate.value, date.value) : null))
const sub = computed(() => [fmtShort(date.value), dayNo.value != null ? t('today.dayN', { n: dayNo.value }) : ''].filter(Boolean).join(' · '))

function go(dir: -1 | 1) {
  const next = shiftDate(date.value, dir)
  if (next > today) return
  router.replace(`/app/day/${next}`)
}

function back() {
  if (window.history.state?.back) router.back()
  else navigateTo('/app/progress')
}

function label(h: Habit) {
  const s = statusOf(h)
  const e = byHabit.value[h.id]
  if (s === 'missed' && e?.reason_tag_id != null) {
    const r = reasons.value.find(x => x.id === e.reason_tag_id)
    if (r) return r.name
  }
  if (counting(h) && (!s || s === 'partial')) return fmtProgress(e?.amount, h.goal!, h.unit)
  return s ? statusMeta(s, h.kind).label : t('status.empty')
}

async function write(h: Habit, status: EntryStatus | null, extra: { amount?: number | null; reason_tag_id?: number | null; note?: string | null } = {}) {
  haptic()
  if (!status) await entriesRepo.remove(h.id, date.value)
  else await entriesRepo.upsert({ habit_id: h.id, date: date.value, status, ...extra })
  await load()
}

function pick(h: Habit, s: EntryStatus) {
  if (statusOf(h) === s) return write(h, null)
  return write(h, s, counting(h) && s === 'done' ? { amount: h.goal } : {})
}

function setAmount(h: Habit, n: number) {
  const amount = Math.max(0, Math.round(n * 100) / 100)
  const s = amountStatus(h.goal!, amount)
  return write(h, s, { amount })
}

function pickReason(h: Habit, id: number) {
  const e = byHabit.value[h.id]
  return write(h, e?.status ?? 'missed', { amount: e?.amount ?? null, reason_tag_id: e?.reason_tag_id === id ? null : id, note: e?.note ?? null })
}

function saveNote(h: Habit) {
  const e = byHabit.value[h.id]
  if (!e) return
  return write(h, e.status, { reason_tag_id: e.reason_tag_id, amount: e.amount, note: notes.value[h.id]?.trim() || null })
}

const unlogged = computed(() => planned.value.filter(h => !statusOf(h)))
const restDay = computed(() => planned.value.length > 0 && !unlogged.value.length && planned.value.every(h => statusOf(h) === 'rest'))

async function toggleRest() {
  haptic()
  if (restDay.value) for (const h of planned.value) await entriesRepo.remove(h.id, date.value)
  else for (const h of planned.value) if (!statusOf(h) || statusOf(h) !== 'done') await entriesRepo.upsert({ habit_id: h.id, date: date.value, status: 'rest' })
  await load()
}

const OPTIONS: EntryStatus[] = ['done', 'partial', 'missed', 'rest']
const optLabel = (h: Habit, s: EntryStatus) => (h.kind === 'quit' && (s === 'done' || s === 'missed') ? statusMeta(s, 'quit').label : t(`status.${s}Short`))
</script>

<template>
  <div class="k-page k-push">
    <div class="k-nav">
      <button class="k-back" @click="back">
        <svg viewBox="0 0 12 20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 2L2 10l8 8" /></svg>
        {{ t('tabs.progress') }}
      </button>
      <span style="display:flex;">
        <button class="k-icon-btn" :aria-label="t('common.prevDay')" @click="go(-1)">
          <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M11 4L6 9l5 5" /></svg>
        </button>
        <button class="k-icon-btn" :aria-label="t('common.nextDay')" :disabled="date >= today" @click="go(1)">
          <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 4l5 5-5 5" /></svg>
        </button>
      </span>
    </div>

    <div class="k-stack" style="gap:14px; padding-top:6px; padding-bottom:40px;">
      <div style="display:flex; align-items:flex-end; gap:14px; padding:0 4px;">
        <span class="k-fill-text" role="img" :aria-label="`${sub}, ${t('today.filled', { n: pct })}`" style="font-size:132px; line-height:0.82;" :style="{ backgroundImage: layerGradient(layers, 'var(--k-empty)') }">{{ Number(date.slice(8)) }}</span>
        <span style="display:flex; flex-direction:column; gap:2px; padding-bottom:6px;">
          <span style="font-size:22px; font-weight:800; letter-spacing:-0.02em; text-transform:capitalize;">{{ date === today ? t('common.today') : fmtWeekdayLong(date) }}</span>
          <span style="font-size:15px; font-weight:600; color:var(--k-sub);">{{ sub }}</span>
          <span style="font-size:15px; font-weight:750; color:var(--k-accent-ink);">{{ t('today.filled', { n: pct }) }}</span>
        </span>
      </div>

      <div v-for="h in [...planned, ...unplanned]" :key="h.id" class="k-day-card" :style="{ opacity: unplanned.includes(h) ? 0.6 : 1 }">
        <div class="k-day-card-head">
          <span class="k-dot" :style="{ background: colorOf(h) }" />
          <b>{{ h.name }}</b>
          <span>{{ unplanned.includes(h) && !statusOf(h) ? t('day.unplanned') : label(h) }}</span>
        </div>
        <div v-if="counting(h)" class="k-opts goal">
          <button class="soft" style="font-size:20px;" :aria-label="t('editor.less', { step: fmtAmount(goalStep(h.goal!)) })" @click="setAmount(h, (byHabit[h.id]?.amount ?? 0) - goalStep(h.goal!))">−</button>
          <button class="amt k-tnum" :style="statusOf(h) === 'done' ? { background: colorOf(h), color: '#fff' } : undefined" @click="setAmount(h, statusOf(h) === 'done' ? 0 : h.goal!)">{{ fmtAmount(byHabit[h.id]?.amount ?? 0) }}/{{ fmtAmount(h.goal!) }}</button>
          <button class="soft" style="font-size:20px;" :aria-label="t('editor.more', { step: fmtAmount(goalStep(h.goal!)) })" @click="setAmount(h, (byHabit[h.id]?.amount ?? 0) + goalStep(h.goal!))">+</button>
          <button :class="statusOf(h) === 'rest' ? 'on' : 'soft'" :style="statusOf(h) === 'rest' ? { background: colorOf(h) } : undefined" :aria-pressed="statusOf(h) === 'rest'" @click="pick(h, 'rest')">{{ t('status.restShort') }}</button>
        </div>
        <div v-else class="k-opts" role="radiogroup" :aria-label="h.name">
          <button
            v-for="s in OPTIONS" :key="s" role="radio" :class="{ on: statusOf(h) === s }" :aria-checked="statusOf(h) === s"
            :style="statusOf(h) === s ? { background: colorOf(h) } : undefined" @click="pick(h, s)"
          >{{ optLabel(h, s) }}</button>
        </div>
        <template v-if="statusOf(h) === 'missed' || statusOf(h) === 'partial'">
          <div class="k-chips" style="gap:6px; padding:0 2px; animation:kFade .25s ease both;">
            <button
              v-for="r in reasons" :key="r.id" class="k-chip" :class="{ on: byHabit[h.id]?.reason_tag_id === r.id }"
              :aria-pressed="byHabit[h.id]?.reason_tag_id === r.id" style="height:32px; font-size:13.5px; padding:0 12px;"
              @click="pickReason(h, r.id)"
            >{{ r.name }}</button>
          </div>
          <input v-model="notes[h.id]" class="k-input soft" style="height:42px; font-size:15px;" maxlength="140" :placeholder="t('editor.notePlaceholder')" :aria-label="t('editor.note')" @change="saveNote(h)" />
        </template>
      </div>

      <button v-if="planned.length" class="k-btn block" :class="{ primary: restDay }" :style="restDay ? undefined : { background: 'var(--k-card)' }" @click="toggleRest">
        {{ restDay ? t('day.restUndo') : t('day.restDay') }}
      </button>
      <p class="k-micro">{{ t('day.autosave') }}</p>
    </div>
  </div>
</template>
