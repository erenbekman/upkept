import { Capacitor } from '@capacitor/core'

const KEY = 'reminder_time'
const HABIT_KEY = 'habit_reminders'
const MAX_PENDING = 60
export const DEFAULT_REMINDER = '21:00'

type HabitTimes = Record<string, string>

function readHabitTimes(): HabitTimes {
  try {
    return JSON.parse(localStorage.getItem(HABIT_KEY) ?? '{}')
  } catch {
    return {}
  }
}

function at(day: Date, hhmm: string) {
  const [h, m] = hhmm.split(':').map(Number)
  const d = new Date(day)
  d.setHours(h, m, 0, 0)
  return d
}

export function useReminder() {
  const supported = Capacitor.isNativePlatform()
  const time = useState<string | null>('reminder_time', () =>
    import.meta.client ? localStorage.getItem(KEY) : null)
  const habitTimes = useState<HabitTimes>('habit_reminders', () =>
    import.meta.client ? readHabitTimes() : {})
  const habits = useHabits()
  const entries = useEntries()

  async function plugin() {
    return (await import('@capacitor/local-notifications')).LocalNotifications
  }

  async function permitted() {
    const ln = await plugin()
    let perm = await ln.checkPermissions()
    if (perm.display !== 'granted') perm = await ln.requestPermissions()
    return perm.display === 'granted'
  }

  async function reschedule() {
    if (!supported) return
    const ln = await plugin()
    const pending = await ln.getPending()
    if (pending.notifications.length) await ln.cancel({ notifications: pending.notifications.map(n => ({ id: n.id })) })

    const list = await habits.listActive()
    const today = todayStr()
    const status = Object.fromEntries((await entries.getForDate(today)).map(e => [e.habit_id, e.status]))
    const timed = list.filter(h => habitTimes.value[h.id])
    const active = list.filter(h => scheduledOn(h.days, today) && status[h.id] !== 'rest')
    const dayDone = active.length === 0 || active.every(h => status[h.id] === 'done')
    const windowDays = Math.max(1, Math.min(7, Math.floor(MAX_PENDING / (timed.length + 1))))
    const now = Date.now()
    const start = new Date()
    const notifications = []

    for (let d = 0; d < windowDays; d++) {
      const day = new Date(start)
      day.setDate(start.getDate() + d)
      const date = todayStr(day)
      const anyPlanned = list.some(h => scheduledOn(h.days, date))
      if (time.value && anyPlanned && !(d === 0 && dayDone)) {
        const when = at(day, time.value)
        if (when.getTime() > now) notifications.push({ id: 1 + d, title: t('reminder.title'), body: t('reminder.body'), schedule: { at: when, allowWhileIdle: true } })
      }
      for (const h of timed) {
        if (!scheduledOn(h.days, date)) continue
        if (d === 0 && (status[h.id] === 'done' || status[h.id] === 'rest')) continue
        const when = at(day, habitTimes.value[h.id])
        if (when.getTime() <= now) continue
        notifications.push({
          id: 1000 + h.id * 10 + d,
          title: [h.icon, h.name].filter(Boolean).join(' '),
          body: t('reminder.habitBody'),
          schedule: { at: when, allowWhileIdle: true },
        })
      }
    }
    if (notifications.length) await ln.schedule({ notifications })
  }

  async function enable(hhmm: string): Promise<boolean> {
    if (!supported || !(await permitted())) return false
    time.value = hhmm
    localStorage.setItem(KEY, hhmm)
    await reschedule()
    return true
  }

  async function disable() {
    time.value = null
    localStorage.removeItem(KEY)
    await reschedule()
  }

  async function setHabitTime(id: number, hhmm: string | null): Promise<boolean> {
    if (!supported) return false
    if (hhmm && !(await permitted())) return false
    const next = { ...habitTimes.value }
    if (hhmm) next[id] = hhmm
    else delete next[id]
    habitTimes.value = next
    localStorage.setItem(HABIT_KEY, JSON.stringify(next))
    await reschedule()
    return true
  }

  return { supported, time, habitTimes, enable, disable, setHabitTime, reschedule }
}
