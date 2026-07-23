import { Capacitor } from '@capacitor/core'
import {
  CapacitorSQLite,
  SQLiteConnection,
  type SQLiteDBConnection,
} from '@capacitor-community/sqlite'
import { defineCustomElements as defineJeep } from 'jeep-sqlite/loader'
import { SCHEMA_SQL, SCHEMA_VERSION, DEFAULT_REASON_TAGS } from '~/db/schema'

const DB_NAME = 'lifebootstrap'

export default defineNuxtPlugin(async () => {
  const isWeb = Capacitor.getPlatform() === 'web'
  const sqlite = new SQLiteConnection(CapacitorSQLite)

  if (isWeb) {
    defineJeep(window)
    const jeepEl = document.createElement('jeep-sqlite')
    document.body.appendChild(jeepEl)
    await customElements.whenDefined('jeep-sqlite')
    await sqlite.initWebStore()
  }

  const db: SQLiteDBConnection = await sqlite.createConnection(
    DB_NAME, false, 'no-encryption', SCHEMA_VERSION, false,
  )
  await db.open()
  await db.execute(SCHEMA_SQL)

  const rt = await db.query('SELECT COUNT(*) AS c FROM reason_tags')
  if ((rt.values?.[0]?.c ?? 0) === 0) {
    for (let i = 0; i < DEFAULT_REASON_TAGS.length; i++) {
      await db.run(
        'INSERT INTO reason_tags (name, sort_order) VALUES (?, ?)',
        [DEFAULT_REASON_TAGS[i], i],
      )
    }
  }

  const cs = await db.query(
    'SELECT value FROM app_meta WHERE key = ?', ['challenge_start_date'],
  )
  if (!cs.values?.length) {
    const today = new Date().toISOString().slice(0, 10)
    await db.run(
      'INSERT INTO app_meta (key, value) VALUES (?, ?)',
      ['challenge_start_date', today],
    )
  }

  if (isWeb) await sqlite.saveToStore(DB_NAME)

  return {
    provide: {
      sqliteConn: db,
      sqliteSave: () => (isWeb ? sqlite.saveToStore(DB_NAME) : Promise.resolve()),
    },
  }
})
