const MS_DAY = 86400000

export function todayStr(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// null if today is before challenge start
export function challengeDay(startDate: string, today = todayStr()): number | null {
  const s = new Date(startDate + 'T00:00:00').getTime()
  const t = new Date(today + 'T00:00:00').getTime()
  const diff = Math.floor((t - s) / MS_DAY)
  return diff < 0 ? null : diff + 1
}

export function fmtLong(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('tr-TR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

export function fmtMonth(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString('tr-TR', {
    month: 'long', year: 'numeric',
  })
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}
