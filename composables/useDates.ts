const MS_DAY = 86400000

export function todayStr(d = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// null if the date is before challenge start. Parsed as UTC so a DST shift in
// between can't turn 24h into 23h and drop a day.
export function challengeDay(startDate: string, today = todayStr()): number | null {
  const diff = Math.round((Date.parse(today + 'T00:00:00Z') - Date.parse(startDate + 'T00:00:00Z')) / MS_DAY)
  return diff < 0 ? null : diff + 1
}

export function fmtLong(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('tr-TR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })
}

// Single letter under the grid's day number — scanning a horizontally scrolling
// month with nothing but 1..31 is what made picking a day disorienting.
export function fmtWeekdayNarrow(dateStr: string): string {
  return ['P', 'P', 'S', 'Ç', 'P', 'C', 'C'][new Date(dateStr + 'T00:00:00').getDay()]
}

export function isWeekend(dateStr: string): boolean {
  const d = new Date(dateStr + 'T00:00:00').getDay()
  return d === 0 || d === 6
}

export function fmtWeekdayLong(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('tr-TR', { weekday: 'long' })
}

export function fmtShort(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })
}

export function fmtMonth(year: number, month: number): string {
  return new Date(year, month - 1, 1).toLocaleDateString('tr-TR', {
    month: 'long', year: 'numeric',
  })
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

export function shiftDate(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + days) // not +N*MS_DAY: that lands on 23:00/01:00 across DST
  return todayStr(d)
}

export function fmtAgo(ts: number | null): string {
  if (!ts) return 'henüz yok'
  const min = Math.floor((Date.now() - ts) / 60000)
  if (min < 1) return 'az önce'
  if (min < 60) return `${min} dk önce`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h} sa önce`
  return `${Math.floor(h / 24)} gün önce`
}
