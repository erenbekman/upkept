import { Capacitor, registerPlugin } from '@capacitor/core'

const UpkeptWidget = registerPlugin<{ update(o: { snapshot: string }): Promise<void> }>('UpkeptWidget')

// Writes recent history to the App Group so the home-screen widget can draw it
// without opening the database itself. iOS only; a no-op everywhere else.
export function useWidget() {
  const habits = useHabits()
  const entries = useEntries()
  const db = useDb()
  const enabled = Capacitor.getPlatform() === 'ios'

  async function refresh() {
    if (!enabled) return
    const date = todayStr()
    // Six weeks back covers the small widget's five-week grid and any month.
    const from = shiftDate(date, -41)
    const [list, history, start] = await Promise.all([
      habits.listActive(),
      entries.getRange('2000-01-01', date),
      db.getMeta('challenge_start_date'),
    ])
    const streaks = currentStreaks(list, history, date)
    const logs = new Map<number, Record<string, string>>()
    for (const e of history) {
      if (e.date < from) continue
      if (!logs.has(e.habit_id)) logs.set(e.habit_id, {})
      logs.get(e.habit_id)![e.date] = e.status
    }
    // 2024-01-01 is a Monday; the widget's weeks start on Monday.
    const weekdays = Array.from({ length: 7 }, (_, i) => fmtWeekdayNarrow(shiftDate('2024-01-01', i)))
    const snapshot = {
      date,
      locale: dateLocale(),
      palette: localStorage.getItem('palette') ?? 'upkept',
      dayNo: start ? challengeDay(start, date) : null,
      habits: list.map((h, i) => ({
        name: h.name,
        icon: h.icon,
        color: h.color ?? '#6d6fae',
        streak: streaks[i].days,
        log: logs.get(h.id) ?? {},
      })),
      labels: {
        today: t('common.today'),
        dayN: t('today.dayN'),
        done: t('widget.done'),
        allDone: t('widget.allDone'),
        empty: t('widget.empty'),
        weekdays,
      },
    }
    await UpkeptWidget.update({ snapshot: JSON.stringify(snapshot) }).catch(() => {})
  }

  return { refresh }
}
