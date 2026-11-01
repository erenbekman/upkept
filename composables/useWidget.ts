import { Capacitor, registerPlugin } from '@capacitor/core'

const UpkeptWidget = registerPlugin<{
  update(o: { snapshot: string }): Promise<void>
  takePending(): Promise<{ ops: string }>
}>('UpkeptWidget')

interface PendingOp { habit_id: number; date: string; status: 'done' | 'none' }

function withOffDays(days: number | null, from: string, to: string, log: Record<string, string>) {
  if (!days) return log
  const out = { ...log }
  for (let d = from; d <= to; d = shiftDate(d, 1)) if (!scheduledOn(days, d) && !out[d]) out[d] = 'rest'
  return out
}

export function useWidget() {
  const habits = useHabits()
  const entries = useEntries()
  const db = useDb()
  const enabled = Capacitor.getPlatform() === 'ios'

  async function refresh() {
    if (!enabled) return
    const date = todayStr()
    const from = shiftDate(date, -41)
    const [list, history, start, counter] = await Promise.all([
      habits.listActive(),
      entries.getRange('2000-01-01', date),
      db.getMeta('challenge_start_date'),
      db.getMeta('day_counter'),
    ])
    const streaks = currentStreaks(list, history, date)
    const logs = new Map<number, Record<string, string>>()
    for (const e of history) {
      if (e.date < from) continue
      if (!logs.has(e.habit_id)) logs.set(e.habit_id, {})
      logs.get(e.habit_id)![e.date] = e.status
    }
    const weekdays = Array.from({ length: 7 }, (_, i) => fmtWeekdayMin(shiftDate('2024-01-01', i)))
    const snapshot = {
      date,
      locale: dateLocale(),
      palette: 'upkept',
      accent: ACCENTS.find(a => a.id === readAccent())!.hex,
      mono: localStorage.getItem('mono_fill') === '1',
      dayNo: start && counter !== '0' ? challengeDay(start, date) : null,
      habits: list.map((h, i) => ({
        id: h.id,
        days: h.days,
        name: h.name,
        icon: h.icon,
        color: h.color ?? '#6d6fae',
        streak: streaks[i].days,
        goal: h.kind === 'quit' ? null : h.goal,
        amount: history.find(e => e.habit_id === h.id && e.date === date)?.amount ?? null,
        log: withOffDays(h.days, from, date, logs.get(h.id) ?? {}),
      })),
      labels: {
        today: t('common.today'),
        dayN: t('today.dayN'),
        done: t('widget.done'),
        allDone: t('widget.allDone'),
        empty: t('widget.empty'),
        day: t('widget.day'),
        left: t('widget.left'),
        full: t('widget.full'),
        weekdays,
      },
    }
    await UpkeptWidget.update({ snapshot: JSON.stringify(snapshot) }).catch(() => {})
  }

  async function applyPending() {
    if (!enabled) return false
    const { ops } = await UpkeptWidget.takePending().catch(() => ({ ops: '[]' }))
    const pending: PendingOp[] = JSON.parse(ops || '[]')
    if (!pending.length) return false
    const goals = new Map((await habits.listActive()).map(h => [h.id, h.goal]))
    for (const op of pending) {
      if (!goals.has(op.habit_id)) continue
      if (op.status === 'done') await entries.upsert({ habit_id: op.habit_id, date: op.date, status: 'done', amount: goals.get(op.habit_id) })
      else await entries.remove(op.habit_id, op.date)
    }
    return true
  }

  return { refresh, applyPending }
}
