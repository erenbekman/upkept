import type { ReasonTag } from '~/composables/useEntries'

export function useReasons() {
  const db = useDb()

  function list() {
    return db.query<ReasonTag>('SELECT * FROM reason_tags ORDER BY sort_order, id')
  }

  async function create(name: string) {
    const order = await db.query<{ n: number }>(
      'SELECT COALESCE(MAX(sort_order), -1) + 1 AS n FROM reason_tags',
    )
    return db.run('INSERT INTO reason_tags (name, sort_order) VALUES (?, ?)', [name, order[0].n])
  }

  function rename(id: number, name: string) {
    return db.run('UPDATE reason_tags SET name = ? WHERE id = ?', [name, id])
  }

  function reorder(id: number, sortOrder: number) {
    return db.run('UPDATE reason_tags SET sort_order = ? WHERE id = ?', [sortOrder, id])
  }

  function remove(id: number) {
    return db.run('DELETE FROM reason_tags WHERE id = ?', [id])
  }

  return { list, create, rename, reorder, remove }
}
