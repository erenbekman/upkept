export interface Habit {
  id: number
  user_id: number
  name: string
  target_desc: string | null
  color: string | null
  icon: string | null
  sort_order: number
  active: number
  created_at: string
}

// Full hue wheel at one OKLCH lightness (L 0.62) so no swatch outshouts another
// and the 5px habit bar stays visible on both the light and the dark card.
export const HABIT_COLORS = [
  { hex: '#c8626d', name: 'raspberry' },
  { hex: '#c8664e', name: 'coral' },
  { hex: '#c16e2d', name: 'orange' },
  { hex: '#b37903', name: 'mustard' },
  { hex: '#9e840a', name: 'olive' },
  { hex: '#848f1e', name: 'pistachio' },
  { hex: '#629742', name: 'leaf' },
  { hex: '#349d62', name: 'emerald' },
  { hex: '#0c9c82', name: 'seaGreen' },
  { hex: '#06999a', name: 'turquoise' },
  { hex: '#1896ad', name: 'petrol' },
  { hex: '#0891c9', name: 'skyBlue' },
  { hex: '#4c88d3', name: 'blue' },
  { hex: '#707ed4', name: 'indigo' },
  { hex: '#8c74cc', name: 'lavender' },
  { hex: '#a36cbc', name: 'lilac' },
  { hex: '#b566a5', name: 'redbud' },
  { hex: '#c1628a', name: 'rose' },
  { hex: '#80878f', name: 'slate' },
  { hex: '#928377', name: 'taupe' },
]

// Spread new habits around the wheel instead of stacking them on one colour.
export function nextHabitColor(used: (string | null)[]): string {
  const taken = new Set(used)
  const pick = HABIT_COLORS[(used.length * 7) % HABIT_COLORS.length].hex
  return taken.has(pick) ? HABIT_COLORS.find(c => !taken.has(c.hex))?.hex ?? pick : pick
}

export const isEmojiIcon = (s: string) => /\p{Extended_Pictographic}|\p{Regional_Indicator}/u.test(s)

export function useHabits() {
  const db = useDb()

  function listActive() {
    return db.query<Habit>(
      'SELECT * FROM habits WHERE active = 1 ORDER BY sort_order, id',
    )
  }

  async function create(input: {
    name: string; target_desc?: string; color?: string; icon?: string
  }): Promise<number> {
    const order = await db.query<{ n: number }>(
      'SELECT COALESCE(MAX(sort_order), -1) + 1 AS n FROM habits',
    )
    await db.run(
      `INSERT INTO habits (name, target_desc, color, icon, sort_order)
       VALUES (?, ?, ?, ?, ?)`,
      [input.name, input.target_desc ?? null, input.color ?? null, input.icon ?? null, order[0].n],
    )
    return db.lastInsertId()
  }

  function update(id: number, fields: {
    name?: string; target_desc?: string | null; color?: string | null; icon?: string | null
  }) {
    const sets: string[] = []
    const params: any[] = []
    if (fields.name !== undefined) { sets.push('name = ?'); params.push(fields.name) }
    if (fields.target_desc !== undefined) { sets.push('target_desc = ?'); params.push(fields.target_desc) }
    if (fields.color !== undefined) { sets.push('color = ?'); params.push(fields.color) }
    if (fields.icon !== undefined) { sets.push('icon = ?'); params.push(fields.icon) }
    if (!sets.length) return Promise.resolve()
    params.push(id)
    return db.run(`UPDATE habits SET ${sets.join(', ')} WHERE id = ?`, params)
  }

  function reorder(id: number, sortOrder: number) {
    return db.run('UPDATE habits SET sort_order = ? WHERE id = ?', [sortOrder, id])
  }

  function deactivate(id: number) {
    return db.run('UPDATE habits SET active = 0 WHERE id = ?', [id])
  }

  return { listActive, create, update, reorder, deactivate }
}
