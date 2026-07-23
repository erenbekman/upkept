import type { SQLiteDBConnection } from '@capacitor-community/sqlite'

export function useDb() {
  const app = useNuxtApp()
  const conn = app.$sqliteConn as SQLiteDBConnection
  const save = app.$sqliteSave as () => Promise<unknown>

  async function query<T = Record<string, any>>(
    sql: string, params: any[] = [],
  ): Promise<T[]> {
    const res = await conn.query(sql, params)
    return (res.values ?? []) as T[]
  }

  async function run(sql: string, params: any[] = []) {
    const res = await conn.run(sql, params)
    await save()
    if (import.meta.client && !(window as any).__upkeptImporting) {
      localStorage.setItem('upkept_mutated_at', String(Date.now()))
      window.dispatchEvent(new Event('upkept:mutated'))
    }
    return res
  }

  async function lastInsertId(): Promise<number> {
    const r = await query<{ id: number }>('SELECT last_insert_rowid() AS id')
    return r[0]?.id ?? 0
  }

  async function getMeta(key: string): Promise<string | null> {
    const r = await query<{ value: string }>(
      'SELECT value FROM app_meta WHERE key = ?', [key],
    )
    return r[0]?.value ?? null
  }

  async function setMeta(key: string, value: string) {
    await run(
      `INSERT INTO app_meta (key, value) VALUES (?, ?)
       ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      [key, value],
    )
  }

  return { query, run, lastInsertId, getMeta, setMeta }
}
