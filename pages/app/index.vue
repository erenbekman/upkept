<script setup lang="ts">
import type { Habit } from '~/composables/useHabits'
import type { Entry, EntryStatus, ReasonTag } from '~/composables/useEntries'

const habitsRepo = useHabits()
const entriesRepo = useEntries()
const db = useDb()
const syncApi = useSync()
const { mono, accentHex } = useTheme()

const today = todayStr()
const habits = ref<Habit[]>([])
const byHabit = ref<Record<number, Entry>>({})
const history = ref<Entry[]>([])
const reasons = ref<ReasonTag[]>([])
const startDate = ref<string | null>(null)
const counterOn = ref(true)
const loaded = ref(false)

async function load() {
  habits.value = await habitsRepo.listActive()
  const list = await entriesRepo.getForDate(today)
  byHabit.value = Object.fromEntries(list.map(e => [e.habit_id, e]))
  history.value = await entriesRepo.getRange(shiftDate(today, -29), shiftDate(today, -1))
  reasons.value = await entriesRepo.listReasons()
  startDate.value = await db.getMeta('challenge_start_date')
  counterOn.value = (await db.getMeta('day_counter')) !== '0'
  loaded.value = true
}
onMounted(load)
watch(syncApi.dataVersion, load)

const chromeHidden = useState('chrome_hidden', () => false)
const welcoming = computed(() => loaded.value && !habits.value.length)
watch(welcoming, (v) => { chromeHidden.value = v }, { immediate: true })
onUnmounted(() => { chromeHidden.value = false })

const dayNo = computed(() => (counterOn.value && startDate.value ? challengeDay(startDate.value, today) : null))
const numberText = computed(() => String(dayNo.value ?? Number(today.slice(8))))
const caption = computed(() => dayNo.value != null ? t('today.sinceStart', { n: dayNo.value }) : t('today.monthDay', { date: fmtShort(today) }))
const headDate = computed(() => `${fmtWeekdayLong(today)}, ${fmtShort(today)}`)

const statusOf = (h: Habit) => byHabit.value[h.id]?.status ?? null
const counting = (h: Habit) => !!h.goal && h.kind !== 'quit'
const colorOf = (h: Habit) => (mono.value ? accentHex.value : h.color || accentHex.value)
const planned = computed(() => habits.value.filter(h => plannedOn(h, today, byHabit.value[h.id])))
const offToday = computed(() => habits.value.filter(h => !plannedOn(h, today, byHabit.value[h.id])))

const sections = computed(() => {
  const groups = new Map<string, Habit[]>()
  for (const h of planned.value) {
    const key = h.group_name ?? ''
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(h)
  }
  const ordered = [...groups].sort(([a], [b]) => Number(!!a) - Number(!!b))
  const named = ordered.some(([k]) => k)
  return [
    ...ordered.map(([name, list]) => ({ key: `g:${name}`, title: named ? name || t('today.otherGroup') : '', list, off: false })),
    { key: 'off', title: t('today.notToday'), list: offToday.value, off: true },
  ].filter(s => s.list.length)
})

const holding = ref<number | null>(null)
const openId = ref<number | null>(null)
const popId = ref<number | null>(null)
const flash = ref(false)

const layers = computed(() => {
  const n = planned.value.length
  if (!n) return []
  return planned.value.map((h) => {
    let w = habitWeight(h, byHabit.value[h.id])
    if (holding.value === h.id) w = statusOf(h) === 'done' ? 0 : 1
    return { id: h.id, color: colorOf(h), value: w / n, faded: statusOf(h) === 'rest' && holding.value !== h.id }
  })
})
const fraction = computed(() => {
  const n = planned.value.length
  return n ? planned.value.reduce((a, h) => a + habitWeight(h, byHabit.value[h.id]), 0) / n : 0
})
const pct = computed(() => Math.round(fraction.value * 100))
const dayComplete = computed(() => planned.value.length > 0
  && planned.value.every(h => statusOf(h) === 'done' || statusOf(h) === 'rest')
  && planned.value.some(h => statusOf(h) === 'done'))

const tubes = computed(() => {
  const dates = Array.from({ length: 29 }, (_, i) => shiftDate(today, i - 29))
  const f = fractionsByDate(habits.value, history.value, dates)
  return [...dates.map(d => f[d] ?? 0), fraction.value].map(v => ({ h: `${Math.round(v * 34)}px`, op: v >= 1 ? 1 : 0.5 }))
})
const firstTube = computed(() => fmtShort(shiftDate(today, -29)))

const numberLabel = computed(() => `${caption.value}, ${t('today.filled', { n: pct.value })}`)

function words(h: Habit, s: EntryStatus | null) {
  return statusMeta(s, h.kind)
}

function rowLabel(h: Habit) {
  const s = statusOf(h)
  const e = byHabit.value[h.id]
  if (holding.value === h.id) return s === 'done' ? t('today.draining') : t('today.filling')
  if (e?.reason_tag_id != null) {
    const r = reasons.value.find(x => x.id === e.reason_tag_id)
    if (r) return `${words(h, s).label} · ${r.name}`
  }
  if (e?.note && s === 'missed') return `${words(h, s).label} · ${e.note}`
  if (counting(h) && (!s || s === 'partial')) return `${fmtProgress(e?.amount, h.goal!, h.unit)}${s ? '' : ` · ${t('today.holdHint')}`}`
  if (!s) return t('today.holdHint')
  return words(h, s).label
}

function rowGlyph(h: Habit) {
  const s = statusOf(h)
  if (counting(h) && (!s || s === 'partial')) return `${fmtAmount(byHabit.value[h.id]?.amount ?? 0)}/${fmtAmount(h.goal!)}`
  return s ? words(h, s).glyph : '+'
}

function fillWidth(h: Habit) {
  const s = statusOf(h)
  if (holding.value === h.id) return s === 'done' ? '0%' : '100%'
  if (s === 'rest' || s === 'missed') return '0%'
  return `${Math.round(habitWeight(h, byHabit.value[h.id]) * 100)}%`
}

function fillOpacity(h: Habit) {
  if (holding.value === h.id) return 1
  return statusOf(h) === 'partial' ? 0.3 : 1
}

const solid = (h: Habit) => statusOf(h) === 'done' && holding.value !== h.id

function celebrate(wasComplete: boolean) {
  if (dayComplete.value && !wasComplete) {
    haptic('success')
    flash.value = false
    requestAnimationFrame(() => { flash.value = true })
    setTimeout(() => { flash.value = false }, 1700)
  }
}

function pop(id: number) {
  popId.value = id
  setTimeout(() => { if (popId.value === id) popId.value = null }, 420)
}

async function write(h: Habit, status: EntryStatus | null, extra: Partial<Entry> = {}) {
  const was = dayComplete.value
  const cur = byHabit.value[h.id]
  if (!status) {
    const { [h.id]: _, ...rest } = byHabit.value
    byHabit.value = rest
  } else {
    byHabit.value = { ...byHabit.value, [h.id]: { ...(cur ?? {}), habit_id: h.id, date: today, status, reason_tag_id: null, note: null, amount: null, ...extra } as Entry }
  }
  pop(h.id)
  celebrate(was)
  if (!status) await entriesRepo.remove(h.id, today)
  else await entriesRepo.upsert({ habit_id: h.id, date: today, status, amount: extra.amount ?? null, reason_tag_id: extra.reason_tag_id ?? null, note: extra.note ?? null })
}

async function complete(h: Habit) {
  const s = statusOf(h)
  if (s === 'done') return write(h, null)
  return write(h, 'done', counting(h) ? { amount: h.goal } : {})
}

async function setAmount(h: Habit, n: number) {
  const amount = Math.max(0, Math.round(n * 100) / 100)
  const s = amountStatus(h.goal!, amount)
  haptic()
  await write(h, s, s ? { amount } : {})
}

const reasonFor = ref<Habit | null>(null)
const reasonPick = ref<number | null>(null)
const reasonNote = ref('')

async function pick(h: Habit, s: EntryStatus) {
  openId.value = null
  haptic()
  if (statusOf(h) === s) return write(h, null)
  await write(h, s)
  if (s === 'missed') {
    reasonFor.value = h
    reasonPick.value = null
    reasonNote.value = ''
  }
}

async function saveReason() {
  const h = reasonFor.value
  if (!h) return
  reasonFor.value = null
  const note = reasonNote.value.trim() || null
  if (reasonPick.value == null && !note) return
  await write(h, 'missed', { reason_tag_id: reasonPick.value, note })
}

let holdTimer: ReturnType<typeof setTimeout> | undefined
let held = false
let downAt: { x: number; y: number } | null = null

function onDown(h: Habit, e: PointerEvent) {
  if (e.button > 0) return
  clearTimeout(holdTimer)
  held = false
  downAt = { x: e.clientX, y: e.clientY }
  holding.value = h.id
  holdTimer = setTimeout(() => {
    held = true
    holding.value = null
    haptic('soft')
    complete(h)
  }, 620)
}

function onMove(e: PointerEvent) {
  if (!downAt || holding.value == null) return
  if (Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) > 10) cancelHold()
}

function onUp(h: Habit) {
  clearTimeout(holdTimer)
  if (!held && holding.value === h.id) openId.value = h.id
  holding.value = null
  held = false
  downAt = null
}

function cancelHold() {
  clearTimeout(holdTimer)
  holding.value = null
  downAt = null
}

function onKey(h: Habit, e: KeyboardEvent) {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault()
    openId.value = h.id
  }
}

function onDocDown(e: PointerEvent) {
  if (openId.value == null) return
  if (!(e.target as Element).closest('.k-hopts')) openId.value = null
}
onMounted(() => document.addEventListener('pointerdown', onDocDown))
onUnmounted(() => {
  document.removeEventListener('pointerdown', onDocDown)
  clearTimeout(holdTimer)
})

const OPTIONS: EntryStatus[] = ['done', 'partial', 'missed', 'rest']
function options(h: Habit) {
  return OPTIONS.map(s => ({ s, label: h.kind === 'quit' && s !== 'partial' && s !== 'rest' ? statusMeta(s, 'quit').label : t(`status.${s}Short`) }))
}

const unlogged = computed(() => planned.value.filter(h => !statusOf(h)))
const canUndoRest = computed(() => planned.value.length > 0 && !unlogged.value.length && planned.value.some(h => statusOf(h) === 'rest'))

async function toggleRestDay() {
  haptic()
  if (unlogged.value.length) {
    for (const h of unlogged.value) await entriesRepo.upsert({ habit_id: h.id, date: today, status: 'rest' })
  } else {
    for (const h of planned.value) if (statusOf(h) === 'rest') await entriesRepo.remove(h.id, today)
  }
  await load()
}
</script>

<template>
  <div v-if="loaded && habits.length" class="k-page k-today">
    <div class="k-today-head">
      <span class="k-today-date">{{ headDate }}</span>
      <span style="display:flex; align-items:center; gap:10px;">
        <span class="k-today-pct">{{ percentFirst() ? `%${pct}` : `${pct}%` }}</span>
        <NuxtLink to="/app/habit/new" class="k-fab" :aria-label="t('common.addHabit')">
          <svg viewBox="0 0 18 18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M9 3v12M3 9h12" /></svg>
        </NuxtLink>
      </span>
    </div>

    <FillNumber :text="numberText" :layers="layers" :label="numberLabel" live :flash="flash" :slow-id="holding" :glow="accentHex">
      <div v-if="flash" class="k-number-flash">{{ t('today.complete') }}</div>
    </FillNumber>

    <div class="k-caption">
      <b>{{ caption }}</b>
      <span aria-hidden="true">{{ t('today.tiltHint') }}</span>
    </div>

    <div class="k-tubes" aria-hidden="true">
      <span v-for="(tb, i) in tubes" :key="i" class="k-tube"><i :style="{ height: tb.h, opacity: tb.op }" /></span>
    </div>
    <div class="k-tube-legend" aria-hidden="true"><span>{{ firstTube }}</span><span>{{ t('common.today').toLocaleLowerCase(dateLocale()) }}</span></div>

    <div class="k-rows k-glass">
      <template v-for="sec in sections" :key="sec.key">
        <div v-if="sec.title" class="k-rows-label">{{ sec.title }}</div>
        <div v-for="h in sec.list" :key="h.id" class="k-hrow" :class="{ off: sec.off }">
          <button
            v-if="openId !== h.id"
            class="k-hbtn" :class="{ holding: holding === h.id, pop: popId === h.id }"
            :style="{ color: solid(h) ? '#fff' : 'var(--k-ink)' }"
            :aria-label="`${h.name}, ${rowLabel(h)}. ${t('today.rowHelp')}`"
            data-no-ptr
            @pointerdown="onDown(h, $event)" @pointermove="onMove" @pointerup="onUp(h)"
            @pointercancel="cancelHold" @pointerleave="cancelHold" @keydown="onKey(h, $event)"
            @contextmenu.prevent
          >
            <span class="k-hfill" :style="{ width: fillWidth(h), background: colorOf(h), opacity: fillOpacity(h) }" />
            <span class="k-hdot" :style="{ background: statusOf(h) ? (solid(h) ? '#fff' : colorOf(h)) : 'transparent', boxShadow: `0 0 0 3px ${solid(h) ? 'rgba(255,255,255,0.35)' : colorOf(h) + '33'}` }" />
            <span class="k-htext">
              <b>{{ h.name }}</b>
              <small>{{ rowLabel(h) }}</small>
            </span>
            <span
              class="k-hglyph" aria-hidden="true"
              :style="{ background: solid(h) ? 'rgba(255,255,255,0.95)' : 'var(--k-fill)', color: solid(h) ? colorOf(h) : 'var(--k-ink)', fontSize: counting(h) && (!statusOf(h) || statusOf(h) === 'partial') ? '13px' : '15px' }"
            >{{ rowGlyph(h) }}</span>
          </button>
          <div v-else-if="counting(h)" class="k-hopts" role="group" :aria-label="h.name">
            <button class="big" :aria-label="t('editor.less', { step: fmtAmount(goalStep(h.goal!)) })" @click="setAmount(h, (byHabit[h.id]?.amount ?? 0) - goalStep(h.goal!))">−</button>
            <button :style="{ background: colorOf(h), color: '#fff' }" @click="openId = null">{{ fmtAmount(byHabit[h.id]?.amount ?? 0) }}/{{ fmtAmount(h.goal!) }}</button>
            <button class="big" :aria-label="t('editor.more', { step: fmtAmount(goalStep(h.goal!)) })" @click="setAmount(h, (byHabit[h.id]?.amount ?? 0) + goalStep(h.goal!))">+</button>
            <button :class="{ on: statusOf(h) === 'rest' }" :style="statusOf(h) === 'rest' ? { background: colorOf(h) } : undefined" :aria-pressed="statusOf(h) === 'rest'" @click="pick(h, 'rest')">{{ t('status.restShort') }}</button>
          </div>
          <div v-else class="k-hopts" role="group" :aria-label="h.name">
            <button
              v-for="o in options(h)" :key="o.s" :class="{ on: statusOf(h) === o.s }"
              :style="statusOf(h) === o.s ? { background: colorOf(h) } : undefined" :aria-pressed="statusOf(h) === o.s"
              @click="pick(h, o.s)"
            >{{ o.label }}</button>
          </div>
        </div>
      </template>
    </div>

    <div class="k-today-rest" style="display:flex; justify-content:center; padding-top:8px;">
      <button v-if="unlogged.length || canUndoRest" class="k-link" style="font-size:15px;" @click="toggleRestDay">
        {{ unlogged.length ? t('today.restDay') : t('today.restUndo') }}
      </button>
    </div>
  </div>

  <WelcomeFlow v-if="welcoming" @done="load" />

  <template v-if="reasonFor">
    <div class="k-sheet-scrim" @click="reasonFor = null" />
    <div class="k-sheet" role="dialog" aria-modal="true" :aria-label="reasonFor.name">
      <span class="k-grabber" aria-hidden="true" />
      <div style="display:flex; flex-direction:column; gap:3px;">
        <span class="k-title">{{ reasonFor.name }} · {{ statusMeta('missed', reasonFor.kind).label.toLocaleLowerCase(dateLocale()) }}</span>
        <span style="font-size:14px; font-weight:500; color:var(--k-sub);">{{ t('today.reasonAsk') }}</span>
      </div>
      <div class="k-chips" role="group" :aria-label="t('editor.reasonTitle')">
        <button
          v-for="r in reasons" :key="r.id" class="k-chip" :class="{ on: reasonPick === r.id }" :aria-pressed="reasonPick === r.id"
          @click="reasonPick = reasonPick === r.id ? null : r.id"
        >{{ r.name }}</button>
      </div>
      <input v-model="reasonNote" class="k-input soft" :placeholder="t('editor.notePlaceholder')" :aria-label="t('editor.note')" maxlength="140" />
      <span style="font-size:13px; font-weight:500; color:var(--k-faint);">{{ t('editor.micro') }}</span>
      <div style="display:grid; grid-template-columns:1fr 1.6fr; gap:8px;">
        <button class="k-btn" @click="reasonFor = null">{{ t('today.skip') }}</button>
        <button class="k-btn primary" @click="saveReason">{{ t('common.save') }}</button>
      </div>
    </div>
  </template>
</template>
