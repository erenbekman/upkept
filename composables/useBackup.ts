const TABLES = ['app_meta', 'habits', 'reason_tags', 'entries'] as const

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
          const cols = Object.keys(row)
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
