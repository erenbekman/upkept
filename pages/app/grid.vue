<script setup lang="ts">
import type { Habit } from '~/composables/useHabits'
import type { Entry } from '~/composables/useEntries'

const habitsRepo = useHabits()
const entriesRepo = useEntries()

const now = new Date()
const year = useState('selYear', () => now.getFullYear())
const month = useState('selMonth', () => now.getMonth() + 1)

const habits = ref<Habit[]>([])
const cells = ref<Record<string, Entry>>({})
const editing = ref<{ habit: Habit; date: string } | null>(null)

const today = todayStr()
const days = computed(() => Array.from({ length: daysInMonth(year.value, month.value) }, (_, i) => i + 1))

function dateOf(day: number) {
  return `${year.value}-${String(month.value).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

async function load() {
  habits.value = await habitsRepo.listActive()
  const list = await entriesRepo.getMonth(year.value, month.value)
  cells.value = Object.fromEntries(list.map(e => [`${e.habit_id}-${e.date}`, e]))
}
onMounted(load)
watch([year, month, useSync().dataVersion], load)

function shift(dir: -1 | 1) {
  let m = month.value + dir, y = year.value
  if (m < 1) { m = 12; y-- }
  if (m > 12) { m = 1; y++ }
  year.value = y; month.value = m
}

function cell(habitId: number, day: number) {
  const date = dateOf(day)
  const isToday = date === today
  if (date > today) return { cls: '', glyph: '', extra: 'future', isToday }
  const e = cells.value[`${habitId}-${date}`]
  if (!e) return { cls: 'st-none', glyph: '·', extra: 'empty', isToday }
  const m = statusMeta(e.status)
  return { cls: m.cls, glyph: m.glyph, extra: '', isToday }
}

const legend = [
  { ...statusMeta('done'), label: 'Yaptım' },
  { ...statusMeta('partial'), label: 'Kısmen' },
  { ...statusMeta('missed'), label: 'Yapamadım' },
  { cls: 'st-none', glyph: '·', label: 'Kayıt yok', extra: 'empty' },
]

function open(habit: Habit, day: number) {
  const date = dateOf(day)
  if (date > today) return
  editing.value = { habit, date }
}

// Stepping days inside the sheet must drag the grid along, or the highlighted
// column ends up off-screen and the visual anchor is lost.
watch(() => editing.value?.date, async (d) => {
  if (!d) return
  await nextTick()
  document.querySelector('table.grid th.day.sel')?.scrollIntoView({ inline: 'center', block: 'nearest' })
})

const firstOfMonth = computed(() => dateOf(1))
const lastEditable = computed(() => {
  const last = dateOf(daysInMonth(year.value, month.value))
  return last < today ? last : today
})

// The picker can jump outside the month on screen — follow it, and reload so the
// sheet is looking at real data rather than an empty cells map.
async function goto(date: string) {
  if (!editing.value || date > today) return
  const [y, m] = date.split('-').map(Number)
  if (y !== year.value || m !== month.value) {
    year.value = y
    month.value = m
    await load()
  }
  editing.value = { ...editing.value, date }
}

async function onSaved() { await load(); editing.value = null }
</script>

<template>
  <div class="screen">
    <div class="row spread">
      <button class="icon-btn" @click="shift(-1)">‹</button>
      <div class="title">{{ fmtMonth(year, month) }}</div>
      <button class="icon-btn" @click="shift(1)">›</button>
    </div>
    <div class="sub">Kaydırarak tüm ayı gör · bugün vurgulu</div>
  </div>

  <p v-if="!habits.length" class="sub" style="padding:0 20px;">Alışkanlık yok.</p>

  <template v-else>
    <div class="grid-scroll" style="padding:8px 0;">
      <table class="grid">
        <thead>
          <tr>
            <th class="hname">Gün</th>
            <th
              v-for="d in days" :key="d" class="day"
              :class="{ sel: editing?.date === dateOf(d), weekend: isWeekend(dateOf(d)) }"
            >
              <div class="day-wd">{{ fmtWeekdayNarrow(dateOf(d)) }}</div>
              <div class="day-num" :class="{ today: dateOf(d) === today, future: dateOf(d) > today }">{{ d }}</div>
              <div class="day-marker" :class="{ today: dateOf(d) === today }" />
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="h in habits" :key="h.id">
            <td class="hname">{{ h.name }}</td>
            <td
              v-for="d in days"
              :key="d"
              class="cell"
              :class="{ sel: editing?.date === dateOf(d), 'sel-cell': editing?.date === dateOf(d) && editing?.habit.id === h.id, weekend: isWeekend(dateOf(d)) }"
              :role="dateOf(d) <= today ? 'button' : undefined"
              :tabindex="dateOf(d) <= today ? 0 : undefined"
              :aria-label="`${h.name} — ${fmtShort(dateOf(d))}`"
              @click="open(h, d)"
              @keydown.enter.prevent="open(h, d)"
              @keydown.space.prevent="open(h, d)"
            >
              <div
                class="cell-box"
                :class="[cell(h.id, d).cls, cell(h.id, d).extra, { today: cell(h.id, d).isToday }]"
              >{{ cell(h.id, d).glyph }}</div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="legend">
      <div v-for="l in legend" :key="l.label" class="legend-item">
        <div class="legend-box" :class="[l.cls, l.extra]">{{ l.glyph }}</div>
        <span>{{ l.label }}</span>
      </div>
    </div>
  </template>

  <StatusEditor
    v-if="editing"
    :habit-id="editing.habit.id"
    :habit-name="editing.habit.name"
    :date="editing.date"
    :current="cells[`${editing.habit.id}-${editing.date}`] ?? null"
    :can-prev="editing.date > firstOfMonth"
    :can-next="editing.date < lastEditable"
    @saved="onSaved"
    @goto="goto"
    @close="editing = null"
  />
</template>
