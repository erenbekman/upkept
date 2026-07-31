import { Capacitor } from '@capacitor/core'
import {
  CapacitorSQLite,
  SQLiteConnection,
  type SQLiteDBConnection,
} from '@capacitor-community/sqlite'
import { defineCustomElements as defineJeep } from 'jeep-sqlite/loader'
import { SCHEMA_SQL, SCHEMA_VERSION, DEFAULT_REASON_TAGS, ALTERS } from '~/db/schema'

const DB_NAME = 'lifebootstrap'

// A throw in here leaves the user staring at a black screen with no clue, so
// surface the reason instead of failing silently.
function fatal(err: unknown): never {
  const box = document.createElement('div')
  box.setAttribute('style', 'font:15px/1.5 system-ui;padding:40px 24px;color:#4a463f;background:#fbf8f0;min-height:100vh')
  const head = document.createElement('b')
  head.textContent = 'Veritabanı açılamadı.'
  const hint = document.createElement('p')
  hint.textContent = 'Uygulamayı tamamen kapatıp yeniden açmayı dene.'
  const detail = document.createElement('pre')
  detail.setAttribute('style', 'font-size:12px;color:#9a5236;white-space:pre-wrap')
  detail.textContent = (err as any)?.message ?? String(err)
  box.append(head, hint, detail)
  document.body.replaceChildren(box)
  throw err
}

export default defineNuxtPlugin(async () => {
  const isWeb = Capacitor.getPlatform() === 'web'
  const sqlite = new SQLiteConnection(CapacitorSQLite)
  let db: SQLiteDBConnection

  try {
    if (isWeb) {
      defineJeep(window)
      const jeepEl = document.createElement('jeep-sqlite')
      document.body.appendChild(jeepEl)
      await customElements.whenDefined('jeep-sqlite')
      await sqlite.initWebStore()
    }

    // The native side keeps its connection registry across a webview reload
    // while this JS-side one starts empty, so createConnection throws
    // "Connection lifebootstrap already exists" and the app dies on a black
    // screen. checkConnectionsConsistency() with an empty JS registry closes the
    // stale native connections, making the create below safe on every boot.
    await sqlite.checkConnectionsConsistency().catch(() => null)

    db = await sqlite.createConnection(DB_NAME, false, 'no-encryption', SCHEMA_VERSION, false)
    if (!(await db.isDBOpen()).result) await db.open()
    await db.execute(SCHEMA_SQL)
    // Additive column adds for pre-existing databases; already-applied ones throw
    // "duplicate column name", which is the expected steady state.
    // Braces are required: Nuxt's unctx transform rewrites `await` into a
    // statement, and a brace-less loop body ends up outside the loop.
    for (const sql of ALTERS) {
      await db.execute(sql).catch(() => null)
    }

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
  } catch (err) {
    fatal(err)
  }

  return {
    provide: {
      sqliteConn: db,
      sqliteSave: () => (isWeb ? sqlite.saveToStore(DB_NAME) : Promise.resolve()),
    },
  }
})
