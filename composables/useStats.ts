import { daysInMonth, shiftDate } from './useDates.ts'

export interface StatHabit { id: number; name: string; created_at: string }
export interface StatEntry { habit_id: number; date: string; status: string; reason_tag_id: number | null }

export interface MonthStats {
  slots: number
  filled: number
  completion: number
  consistency: number
  topReasonId: number | null
  topReasonCount: number
}

const iso = (v: string | null | undefined) => (v ?? '').slice(0, 10)
const maxDate = (...d: (string | null | undefined)[]) =>
  d.map(iso).filter(Boolean).sort().pop() ?? ''

// A day is a "slot" only if the habit could plausibly have been kept that day:
// inside the month, on/after the habit was created and the challenge started,
// and not in the future. Days the user marked anyway (past days can be filled
// in by hand) always count, so consistency can never exceed 100%.
export function monthStats(input: {
  habits: StatHabit[]
  entries: StatEntry[]
  year: number
  month: number
  today: string
  challengeStart: string | null
}): MonthStats {
  const { habits, entries, year, month, today, challengeStart } = input
  const mm = String(month).padStart(2, '0')
  const last = daysInMonth(year, month)
  const day = (d: number) => `${year}-${mm}-${String(d).padStart(2, '0')}`

  const active = new Set(habits.map(h => h.id))
  const own = entries.filter(e => active.has(e.habit_id))
  const marked = new Set(own.map(e => `${e.habit_id}-${e.date}`))

  let slots = 0
  for (const h of habits) {
    const from = maxDate(day(1), h.created_at, challengeStart)
    for (let d = 1; d <= last; d++) {
      const date = day(d)
      if ((date >= from && date <= today) || marked.has(`${h.id}-${date}`)) slots++
    }
  }

  const done = own.filter(e => e.status === 'done').length
  const partial = own.filter(e => e.status === 'partial').length

  const tally = new Map<number, number>()
  for (const e of own) {
    if (e.reason_tag_id != null) tally.set(e.reason_tag_id, (tally.get(e.reason_tag_id) ?? 0) + 1)
  }
  let topReasonId: number | null = null
  let topReasonCount = 0
  for (const [id, n] of tally) if (n > topReasonCount) { topReasonId = id; topReasonCount = n }

  return {
    slots,
    filled: own.length,
    completion: slots ? Math.round(((done + partial * 0.5) / slots) * 100) : 0,
    consistency: slots ? Math.round((own.length / slots) * 100) : 0,
    topReasonId,
    topReasonCount,
  }
}

// Today still being unmarked must not read as a broken streak — at 9am you
// haven't had the chance yet. The count starts from yesterday in that case.
export function currentStreaks(
  habits: StatHabit[], entries: StatEntry[], today: string,
): { name: string; days: number }[] {
  const kept = new Map<number, Set<string>>()
  for (const e of entries) {
    if (e.status !== 'done' && e.status !== 'partial') continue
    if (!kept.has(e.habit_id)) kept.set(e.habit_id, new Set())
    kept.get(e.habit_id)!.add(e.date)
  }
  return habits.map(h => {
    const set = kept.get(h.id) ?? new Set<string>()
    let cursor = set.has(today) ? today : shiftDate(today, -1)
    let days = 0
    while (set.has(cursor)) { days++; cursor = shiftDate(cursor, -1) }
    return { name: h.name, days }
  })
}
