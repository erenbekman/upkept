export type HabitKind = 'build' | 'quit'

export interface HabitFields {
  name?: string
  target_desc?: string | null
  color?: string | null
  icon?: string | null
  days?: number | null
  goal?: number | null
  unit?: string | null
  kind?: HabitKind
  group_name?: string | null
}

export interface Habit {
  id: number
  user_id: number
  name: string
  target_desc: string | null
  color: string | null
  icon: string | null
  days: number | null
  goal: number | null
  unit: string | null
  kind: HabitKind
  group_name: string | null
  sort_order: number
  active: number
  created_at: string
}

export interface HabitDraft {
  name: string
  kind: HabitKind
  color: string
  days: number | null
  goalOn: boolean
  goal: number
  unit: string
  group: string | null
  remind: string | null
}

export function habitDraft(h: Habit | null, color: string, remind: string | null = null): HabitDraft {
  return {
    name: h?.name ?? '',
    kind: h?.kind ?? 'build',
    color: h?.color ?? color,
    days: h?.days ?? null,
    goalOn: !!h?.goal,
    goal: h?.goal ?? 8,
    unit: h?.unit ?? '',
    group: h?.group_name ?? null,
    remind,
  }
}

export function draftFields(d: HabitDraft): HabitFields & { name: string } {
  const goal = d.goalOn && d.kind !== 'quit' && d.goal > 0 ? d.goal : null
  return {
    name: d.name.trim(),
    color: d.color,
    days: d.days,
    goal,
    unit: goal ? d.unit.trim().slice(0, 16) || null : null,
    kind: d.kind,
    group_name: d.group?.trim().slice(0, 40) || null,
  }
}

export const HABIT_COLORS = [
  { hex: '#e8456f', name: 'raspberry' },
  { hex: '#eb4a38', name: 'coral' },
  { hex: '#d76506', name: 'orange' },
  { hex: '#be7907', name: 'mustard' },
  { hex: '#a98608', name: 'olive' },
  { hex: '#909103', name: 'pistachio' },
  { hex: '#679d03', name: 'leaf' },
  { hex: '#04a64c', name: 'emerald' },
  { hex: '#0ba27f', name: 'seaGreen' },
  { hex: '#0c9f99', name: 'turquoise' },
  { hex: '#0d9caf', name: 'petrol' },
  { hex: '#0397c8', name: 'skyBlue' },
  { hex: '#078df1', name: 'blue' },
  { hex: '#5f7dfe', name: 'indigo' },
  { hex: '#8d6df9', name: 'lavender' },
  { hex: '#af5fe3', name: 'lilac' },
  { hex: '#ca53c3', name: 'redbud' },
  { hex: '#dd499b', name: 'rose' },
  { hex: '#80878f', name: 'slate' },
  { hex: '#928377', name: 'taupe' },
]

// Spread new habits around the wheel instead of stacking them on one colour.
export function nextHabitColor(used: (string | null)[]): string {
  const taken = new Set(used)
  const pick = HABIT_COLORS[(used.length * 7) % HABIT_COLORS.length].hex
  return taken.has(pick) ? HABIT_COLORS.find(c => !taken.has(c.hex))?.hex ?? pick : pick
}

export const ALL_DAYS = 127

export const normalizeDays = (days: number | null | undefined) =>
  !days || days >= ALL_DAYS ? null : days

export function useHabits() {
  const db = useDb()

  function listActive() {
    return db.query<Habit>(
      'SELECT * FROM habits WHERE active = 1 ORDER BY sort_order, id',
    )
  }

  function listArchived() {
    return db.query<Habit>(
      'SELECT * FROM habits WHERE active = 0 ORDER BY name COLLATE NOCASE, id',
    )
  }

  async function nextOrder() {
    const order = await db.query<{ n: number }>(
      'SELECT COALESCE(MAX(sort_order), -1) + 1 AS n FROM habits',
    )
    return order[0].n
  }

  async function create(input: HabitFields & { name: string }): Promise<number> {
    await db.run(
      `INSERT INTO habits (name, target_desc, color, icon, days, goal, unit, kind, group_name, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        input.name, input.target_desc ?? null, input.color ?? null, input.icon ?? null,
        normalizeDays(input.days), input.goal ?? null, input.unit ?? null, input.kind ?? 'build',
        input.group_name ?? null, await nextOrder(),
      ],
    )
    return db.lastInsertId()
  }

  function update(id: number, fields: HabitFields) {
    const sets: string[] = []
    const params: any[] = []
    for (const key of ['name', 'target_desc', 'color', 'icon', 'goal', 'unit', 'kind', 'group_name'] as const) {
      if (fields[key] === undefined) continue
      sets.push(`${key} = ?`)
      params.push(fields[key])
    }
    if (fields.days !== undefined) { sets.push('days = ?'); params.push(normalizeDays(fields.days)) }
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

  async function restore(id: number) {
    await db.run('UPDATE habits SET active = 1, sort_order = ? WHERE id = ?', [await nextOrder(), id])
  }

  return { listActive, listArchived, create, update, reorder, deactivate, restore }
}
