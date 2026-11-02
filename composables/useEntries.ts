export type EntryStatus = 'done' | 'partial' | 'missed' | 'rest'

export interface Entry {
  id: number
  habit_id: number
  date: string
  status: EntryStatus
  reason_tag_id: number | null
  amount: number | null
  note: string | null
}

export interface ReasonTag {
  id: number
  name: string
  sort_order: number
}

export function useEntries() {
  const db = useDb()

  function upsert(input: {
    habit_id: number
    date: string
    status: EntryStatus
    reason_tag_id?: number | null
    amount?: number | null
    note?: string | null
  }) {
    const plain = input.status === 'done' || input.status === 'rest'
    const reason = plain ? null : (input.reason_tag_id ?? null)
    const note = plain ? null : (input.note ?? null)
    return db.run(
      `INSERT INTO entries (habit_id, date, status, reason_tag_id, amount, note)
       VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(habit_id, date) DO UPDATE SET
         status        = excluded.status,
         reason_tag_id = excluded.reason_tag_id,
         amount        = excluded.amount,
         note          = excluded.note`,
      [input.habit_id, input.date, input.status, reason, input.amount ?? null, note],
    )
  }

  function remove(habitId: number, date: string) {
    return db.run('DELETE FROM entries WHERE habit_id = ? AND date = ?', [habitId, date])
  }

  function getForDate(date: string) {
    return db.query<Entry>('SELECT * FROM entries WHERE date = ?', [date])
  }

  function getRange(first: string, last: string) {
    return db.query<Entry>(
      'SELECT * FROM entries WHERE date >= ? AND date <= ? ORDER BY date',
      [first, last],
    )
  }

  function getMonth(year: number, month: number) {
    const mm = String(month).padStart(2, '0')
    const first = `${year}-${mm}-01`
    const lastDay = new Date(year, month, 0).getDate()
    const last = `${year}-${mm}-${String(lastDay).padStart(2, '0')}`
    return getRange(first, last)
  }

  function listReasons() {
    return db.query<ReasonTag>('SELECT * FROM reason_tags ORDER BY sort_order, id')
  }

  return { upsert, remove, getForDate, getRange, getMonth, listReasons }
}
