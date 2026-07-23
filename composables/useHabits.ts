export interface Habit {
  id: number
  user_id: number
  name: string
  target_desc: string | null
  color: string | null
  sort_order: number
  active: number
  created_at: string
}

export function useHabits() {
  const db = useDb()

  function listActive() {
    return db.query<Habit>(
      'SELECT * FROM habits WHERE active = 1 ORDER BY sort_order, id',
    )
  }

  async function create(input: {
    name: string; target_desc?: string; color?: string
  }): Promise<number> {
    const order = await db.query<{ n: number }>(
      'SELECT COALESCE(MAX(sort_order), -1) + 1 AS n FROM habits',
    )
    await db.run(
      `INSERT INTO habits (name, target_desc, color, sort_order)
       VALUES (?, ?, ?, ?)`,
      [input.name, input.target_desc ?? null, input.color ?? null, order[0].n],
    )
    return db.lastInsertId()
  }

  function update(id: number, fields: {
    name?: string; target_desc?: string | null; color?: string | null
  }) {
    const sets: string[] = []
    const params: any[] = []
    if (fields.name !== undefined) { sets.push('name = ?'); params.push(fields.name) }
    if (fields.target_desc !== undefined) { sets.push('target_desc = ?'); params.push(fields.target_desc) }
    if (fields.color !== undefined) { sets.push('color = ?'); params.push(fields.color) }
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
