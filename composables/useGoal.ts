import type { EntryStatus } from './useEntries.ts'

export function amountStatus(goal: number, amount: number): EntryStatus | null {
  if (amount >= goal) return 'done'
  if (amount > 0) return 'partial'
  return null
}

export function goalStep(goal: number): number {
  if (goal <= 12) return 1
  const raw = goal / 8
  const mag = 10 ** Math.floor(Math.log10(raw))
  const lead = raw / mag
  return (lead >= 5 ? 5 : lead >= 2 ? 2 : 1) * mag
}

export function fmtAmount(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, '')
}

export function fmtProgress(amount: number | null | undefined, goal: number, unit: string | null): string {
  return `${fmtAmount(amount ?? 0)} / ${fmtAmount(goal)}${unit ? ` ${unit}` : ''}`
}
