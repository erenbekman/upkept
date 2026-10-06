import { Capacitor } from '@capacitor/core'

const KEY = 'reminder_time'
const ID = 1
export const DEFAULT_REMINDER = '21:00'

export function useReminder() {
  const supported = Capacitor.isNativePlatform()
  const time = useState<string | null>('reminder_time', () =>
    import.meta.client ? localStorage.getItem(KEY) : null)

  async function plugin() {
    return (await import('@capacitor/local-notifications')).LocalNotifications
  }

  // Returns false when the OS permission is refused.
  async function enable(at: string): Promise<boolean> {
    if (!supported) return false
    const ln = await plugin()
    let perm = await ln.checkPermissions()
    if (perm.display !== 'granted') perm = await ln.requestPermissions()
    if (perm.display !== 'granted') return false
    const [hour, minute] = at.split(':').map(Number)
    await ln.cancel({ notifications: [{ id: ID }] })
    await ln.schedule({
      notifications: [{
        id: ID,
        title: t('reminder.title'),
        body: t('reminder.body'),
        schedule: { on: { hour, minute }, repeats: true },
      }],
    })
    time.value = at
    localStorage.setItem(KEY, at)
    return true
  }

  async function disable() {
    if (supported) await (await plugin()).cancel({ notifications: [{ id: ID }] })
    time.value = null
    localStorage.removeItem(KEY)
  }

  return { supported, time, enable, disable }
}
