<script setup lang="ts">
import type { Habit, HabitDraft } from '~/composables/useHabits'
import type { Entry, ReasonTag } from '~/composables/useEntries'

const route = useRoute()
const repo = useHabits()
const entriesRepo = useEntries()
const reminder = useReminder()
const { show: toast } = useToast()
const router = useRouter()

const id = Number(route.params.id)
const today = todayStr()
const habit = ref<Habit | null>(null)
const all = ref<Habit[]>([])
const history = ref<Entry[]>([])
const reasons = ref<ReasonTag[]>([])
const draft = ref<HabitDraft | null>(null)
const missing = ref(false)

async function load() {
  const active = await repo.listActive()
  const archived = await repo.listArchived()
  all.value = active
  habit.value = [...active, ...archived].find(h => h.id === id) ?? null
  missing.value = !habit.value
  if (!habit.value) return
  history.value = (await entriesRepo.getRange('2000-01-01', today)).filter(e => e.habit_id === id)
  reasons.value = await entriesRepo.listReasons()
  draft.value = habitDraft(habit.value, habit.value.color ?? HABIT_COLORS[1].hex, reminder.habitTimes.value[id] ?? null)
}
onMounted(load)

const color = computed(() => draft.value?.color ?? 'var(--k-accent)')
const streak = computed(() => (habit.value ? currentStreaks([habit.value], history.value, today)[0] : { days: 0, best: 0 }))
const year = Number(today.slice(0, 4))
const month = Number(today.slice(5, 7))
const monthDays = computed(() => Array.from({ length: daysInMonth(year, month) }, (_, i) => `${today.slice(0, 8)}${String(i + 1).padStart(2, '0')}`))
const byDate = computed(() => Object.fromEntries(history.value.map(e => [e.date, e])))
const strip = computed(() => monthDays.value.map((d) => {
  const e = byDate.value[d]
  const w = habit.value ? habitWeight(habit.value, e) : 0
  return { d, h: e?.status === 'rest' ? '100%' : `${Math.round(w * 100)}%`, op: e?.status === 'rest' ? 0.25 : 1, future: d > today, today: d === today }
}))
const monthStat = computed(() => {
  if (!habit.value) return { done: 0, planned: 0, pct: 0 }
  const h = habit.value
  const days = monthDays.value.filter(d => d <= today && plannedOn(h, d, byDate.value[d]) && byDate.value[d]?.status !== 'rest')
  const done = days.filter(d => byDate.value[d]?.status === 'done').length
  return { done, planned: days.length, pct: days.length ? Math.round((done / days.length) * 100) : 0 }
})
const topReason = computed(() => {
  const tally = new Map<number, number>()
  for (const e of history.value) if (e.reason_tag_id != null) tally.set(e.reason_tag_id, (tally.get(e.reason_tag_id) ?? 0) + 1)
  let best: [number, number] | null = null
  for (const pair of tally) if (!best || pair[1] > best[1]) best = pair
  if (!best) return null
  const r = reasons.value.find(x => x.id === best![0])
  return r ? { name: r.name, n: best[1] } : null
})
const streakFill = computed(() => fillGradient(streak.value.best ? streak.value.days / streak.value.best : 0, color.value, 'var(--k-empty)', 6, 84))
const groups = computed(() => all.value.map(h => h.group_name).filter(Boolean) as string[])

let saveTimer: ReturnType<typeof setTimeout>
watch(draft, (d, old) => {
  if (!d || !old || !habit.value) return
  clearTimeout(saveTimer)
  saveTimer = setTimeout(() => save(d, old), 350)
}, { deep: true })

async function save(d: HabitDraft, old: HabitDraft) {
  if (!habit.value) return
  const fields = draftFields(d)
  if (!fields.name) fields.name = habit.value.name
  await repo.update(id, fields)
  if (d.remind !== old.remind && reminder.supported) {
    const ok = await reminder.setHabitTime(id, d.remind)
    if (!ok) toast(t('reminder.denied'), true)
  }
}

function back() {
  if (window.history.state?.back) router.back()
  else navigateTo('/app/settings')
}

async function archive() {
  if (!habit.value) return
  const ok = await useAsk().confirm({
    title: t('habits.removeTitle', { name: habit.value.name }),
    message: t('habits.removeText'),
    okLabel: t('habits.removeOk'),
    danger: true,
  })
  if (!ok) return
  await repo.deactivate(id)
  if (reminder.habitTimes.value[id]) await reminder.setHabitTime(id, null)
  toast(t('habits.removed', { name: habit.value.name }))
  back()
}

async function restore() {
  if (!habit.value) return
  await repo.restore(id)
  toast(t('habits.restored', { name: habit.value.name }))
  await load()
}
</script>

<template>
  <div class="k-page k-push">
    <div class="k-nav">
      <button class="k-back" @click="back">
        <svg viewBox="0 0 12 20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 2L2 10l8 8" /></svg>
        {{ t('tabs.settings') }}
      </button>
    </div>

    <div v-if="missing" class="k-empty"><b>{{ t('habit.missing') }}</b></div>

    <div v-else-if="habit && draft" class="k-stack" style="padding-top:8px; padding-bottom:40px;">
      <div style="display:flex; flex-direction:column; gap:14px;">
        <div style="display:flex; align-items:flex-end; gap:14px; padding:0 4px;">
          <span class="k-fill-text" role="img" :aria-label="t('habit.streakAria', { n: streak.days })" style="font-size:128px; line-height:0.82;" :style="{ backgroundImage: streakFill }">{{ streak.days }}</span>
          <span style="display:flex; flex-direction:column; gap:2px; padding-bottom:6px; min-width:0;">
            <span style="font-size:26px; font-weight:850; letter-spacing:-0.03em; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">{{ habit.name }}</span>
            <span style="font-size:15px; font-weight:600; color:var(--k-sub);">{{ t('habit.streakSub', { n: streak.best }) }}</span>
          </span>
        </div>
        <div class="k-panel">
          <div class="k-panel-title">
            <b style="text-transform:capitalize;">{{ fmtMonth(year, month) }}</b>
            <span>{{ t('habit.monthStat', { done: monthStat.done, total: monthStat.planned, pct: monthStat.pct }) }}</span>
          </div>
          <div aria-hidden="true" style="display:grid; grid-template-columns:repeat(16, minmax(0, 1fr)); gap:4px;">
            <span
              v-for="c in strip" :key="c.d"
              style="position:relative; height:26px; border-radius:6px; background:var(--k-fill); overflow:hidden;"
              :style="{ opacity: c.future ? 0.4 : 1, boxShadow: c.today ? 'inset 0 0 0 2px var(--k-ink)' : 'none' }"
            ><i style="position:absolute; left:0; right:0; bottom:0;" :style="{ height: c.h, background: color, opacity: c.op }" /></span>
          </div>
          <span v-if="topReason" style="font-size:12.5px; font-weight:500; color:var(--k-faint);">{{ t('habit.topReason', { name: topReason.name, n: topReason.n }) }}</span>
        </div>
      </div>

      <section>
        <h2 class="k-eyebrow">{{ t('habits.name') }}</h2>
        <input v-model="draft.name" class="k-input" maxlength="60" :aria-label="t('habits.nameLabel')" enterkeyhint="done" />
      </section>

      <HabitForm v-model="draft" :groups="groups" />

      <template v-if="habit.active">
        <button class="k-btn block" style="background:var(--k-card); color:var(--k-danger); border-radius:16px;" @click="archive">{{ t('habits.removeLong') }}</button>
        <p class="k-micro" style="margin-top:-12px;">{{ t('habit.archiveNote') }}</p>
      </template>
      <button v-else class="k-btn block primary" style="border-radius:16px;" @click="restore">{{ t('habits.restore') }}</button>
    </div>
  </div>
</template>
