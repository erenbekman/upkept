import { scheduledOn } from './useDates.ts'

export interface FillHabit { id: number; color: string | null; days: number | null; goal: number | null; kind: string; created_at: string }
export interface FillEntry { habit_id: number; date: string; status: string; amount: number | null }
export interface FillLayer { id: number; color: string; value: number; faded: boolean }

export function habitWeight(h: Pick<FillHabit, 'goal' | 'kind'>, e: Pick<FillEntry, 'status' | 'amount'> | null | undefined): number {
  if (!e) return 0
  if (e.status === 'done' || e.status === 'rest') return 1
  if (e.status === 'partial') return h.goal && h.kind !== 'quit' && e.amount ? Math.min(1, e.amount / h.goal) : 0.5
  return 0
}

export function plannedOn(h: FillHabit, date: string, entry?: FillEntry | null): boolean {
  if (entry) return true
  if (h.created_at && h.created_at.slice(0, 10) > date) return false
  return scheduledOn(h.days, date)
}

export function dayLayers(habits: FillHabit[], byHabit: Record<number, FillEntry | undefined>, date: string, fallback: string): FillLayer[] {
  const planned = habits.filter(h => plannedOn(h, date, byHabit[h.id]))
  if (!planned.length) return []
  return planned.map(h => ({
    id: h.id,
    color: h.color || fallback,
    value: habitWeight(h, byHabit[h.id]) / planned.length,
    faded: byHabit[h.id]?.status === 'rest',
  }))
}

export function dayFraction(habits: FillHabit[], entries: FillEntry[], date: string): number | null {
  const byHabit: Record<number, FillEntry> = {}
  for (const e of entries) if (e.date === date) byHabit[e.habit_id] = e
  const planned = habits.filter(h => plannedOn(h, date, byHabit[h.id]))
  if (!planned.length) return null
  return planned.reduce((a, h) => a + habitWeight(h, byHabit[h.id]), 0) / planned.length
}

export function fractionsByDate(habits: FillHabit[], entries: FillEntry[], dates: string[]): Record<string, number | null> {
  const grouped = new Map<string, FillEntry[]>()
  for (const e of entries) {
    if (!grouped.has(e.date)) grouped.set(e.date, [])
    grouped.get(e.date)!.push(e)
  }
  return Object.fromEntries(dates.map(d => [d, dayFraction(habits, grouped.get(d) ?? [], d)]))
}

export function fillGradient(fraction: number, color: string, empty: string, from = 12, span = 74): string {
  const stop = (from + Math.max(0, Math.min(1, fraction)) * span).toFixed(1)
  return `linear-gradient(to top, ${color} 0%, ${color} ${stop}%, ${empty} ${stop}%, ${empty} 100%)`
}

export function layerGradient(layers: FillLayer[], empty: string, from = 10, span = 76): string {
  const stops: string[] = []
  let first = ''
  let at = from
  for (const l of layers) {
    if (l.value <= 0) continue
    const c = l.faded ? `color-mix(in srgb, ${l.color} 35%, ${empty})` : l.color
    first ||= c
    const end = at + l.value * span
    stops.push(`${c} ${at.toFixed(1)}%`, `${c} ${end.toFixed(1)}%`)
    at = end
  }
  if (!stops.length) return `linear-gradient(${empty}, ${empty})`
  return `linear-gradient(to top, ${first} 0%, ${stops.join(', ')}, ${empty} ${at.toFixed(1)}%, ${empty} 100%)`
}
