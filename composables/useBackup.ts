const TABLES = ['app_meta', 'habits', 'reason_tags', 'entries'] as const

// Column names get interpolated into INSERT SQL, and import data can come from
// the network (sync). Whitelist identifiers per table so a crafted key can't
// inject SQL; unknown keys are dropped. Values are always parameterized.
const COLUMNS: Record<string, Set<string>> = {
  app_meta: new Set(['key', 'value']),
  habits: new Set(['id', 'user_id', 'name', 'target_desc', 'color', 'icon', 'sort_order', 'active', 'created_at']),
  reason_tags: new Set(['id', 'user_id', 'name', 'sort_order']),
  entries: new Set(['id', 'user_id', 'habit_id', 'date', 'status', 'reason_tag_id', 'note', 'created_at']),
}

export interface Backup {
  schema_version: number
  exported_at: string
  tables: Record<string, Record<string, any>[]>
}

export function useBackup() {
  const db = useDb()

  async function exportAll(): Promise<Backup> {
    const tables: Record<string, Record<string, any>[]> = {}
    for (const t of TABLES) tables[t] = await db.query(`SELECT * FROM ${t}`)
    return { schema_version: 1, exported_at: new Date().toISOString(), tables }
  }

  // Overwrites everything. Preserves ids so FK links stay intact.
  async function importAll(data: Backup) {
    if (!data?.tables) throw new Error('Geçersiz yedek dosyası')
    // Suppress the local-mutation stamp/event so a pull doesn't echo back as a push.
    if (import.meta.client) (window as any).__upkeptImporting = true
    try {
      // delete children first
      await db.run('DELETE FROM entries')
      await db.run('DELETE FROM habits')
      await db.run('DELETE FROM reason_tags')
      await db.run('DELETE FROM app_meta')

      for (const t of TABLES) {
        for (const row of data.tables[t] ?? []) {
          const cols = Object.keys(row).filter(c => COLUMNS[t].has(c))
          if (!cols.length) continue
          const placeholders = cols.map(() => '?').join(', ')
          await db.run(
            `INSERT INTO ${t} (${cols.join(', ')}) VALUES (${placeholders})`,
            cols.map(c => row[c]),
          )
        }
      }
    } finally {
      if (import.meta.client) (window as any).__upkeptImporting = false
    }
  }

  return { exportAll, importAll }
}
