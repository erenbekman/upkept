// Web: same-origin so /api hits the Pages Functions on whatever domain served
// the app (up-kept.app, *.pages.dev). Native (Capacitor/Tauri) loads from a
// localhost/file origin, so it needs the absolute production URL.
function apiBase(): string {
  if (import.meta.client) {
    const h = location.hostname
    if (h === 'up-kept.app' || h.endsWith('.pages.dev')) return `${location.origin}/api`
  }
  return 'https://up-kept.app/api'
}
const API_BASE = apiBase()
const CODE_KEY = 'upkept_sync_code'
const MUT_KEY = 'upkept_mutated_at'
const AT_KEY = 'upkept_sync_at'

let inFlight: Promise<boolean> | null = null

export function useSync() {
  const backup = useBackup()
  const code = useState<string | null>('sync_code', () =>
    import.meta.client ? localStorage.getItem(CODE_KEY) : null)
  const status = useState<'idle' | 'syncing' | 'ok' | 'error'>('sync_status', () => 'idle')
  const lastAt = useState<number | null>('sync_last', () =>
    import.meta.client ? Number(localStorage.getItem(AT_KEY)) || null : null)
  // Bumped after a pull; screens watch it and reload their data. Replaces a
  // location.reload(), which on iOS re-ran the sqlite plugin against a still-open
  // native connection and blacked out the app.
  const dataVersion = useState('data_version', () => 0)

  // The code is the ONLY access control to a user's synced data, so it must be
  // hard to guess: 25 symbols over a 31-char alphabet ≈ 124 bits. Rejection
  // sampling (drop bytes >= 248) removes the modulo bias of a plain b % 31.
  function generateCode(): string {
    const abc = '23456789abcdefghjkmnpqrstuvwxyz' // no ambiguous 0/o/1/l/i
    const max = 256 - (256 % abc.length) // 248
    const out: string[] = []
    const buf = new Uint8Array(32)
    while (out.length < 25) {
      crypto.getRandomValues(buf)
      for (const b of buf) {
        if (b >= max) continue
        out.push(abc[b % abc.length])
        if (out.length === 25) break
      }
    }
    return out.join('').replace(/(.{5})(?=.)/g, '$1-') // xxxxx-xxxxx-xxxxx-xxxxx-xxxxx
  }

  function setCode(c: string | null) {
    code.value = c
    if (!import.meta.client) return
    if (c) localStorage.setItem(CODE_KEY, c)
    else localStorage.removeItem(CODE_KEY)
  }

  const localMut = () => (import.meta.client ? Number(localStorage.getItem(MUT_KEY) || 0) : 0)
  const setLocalMut = (v: number) => { if (import.meta.client) localStorage.setItem(MUT_KEY, String(v)) }

  function markSynced() {
    status.value = 'ok'
    lastAt.value = Date.now()
    if (import.meta.client) localStorage.setItem(AT_KEY, String(lastAt.value))
  }

  // Pull if the cloud copy changed more recently than ours; otherwise push.
  async function run(): Promise<boolean> {
    status.value = 'syncing'
    try {
      const res = await fetch(`${API_BASE}/sync/${code.value}`)
      if (!res.ok) throw new Error(`GET ${res.status}`)
      const remote = await res.json()
      const lm = localMut()

      if (remote.exists && Number(remote.mutatedAt) > lm) {
        await backup.importAll(JSON.parse(remote.data))
        setLocalMut(Number(remote.mutatedAt))
        markSynced()
        dataVersion.value++
        return true
      }

      const data = JSON.stringify(await backup.exportAll())
      const stamp = lm || Date.now()
      const put = await fetch(`${API_BASE}/sync/${code.value}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data, mutatedAt: stamp }),
      })
      if (!put.ok) throw new Error(`PUT ${put.status}`)
      setLocalMut(stamp)
      markSynced()
      return true
    } catch {
      status.value = 'error'
      return false
    }
  }

  // Focus + visibilitychange + mutation debounce can all fire at once; a second
  // pass while the first is mid-import would race on the same tables.
  function sync(): Promise<boolean> {
    if (!code.value || !import.meta.client) return Promise.resolve(false)
    if (!inFlight) inFlight = run().finally(() => { inFlight = null })
    return inFlight
  }

  return { code, status, lastAt, dataVersion, generateCode, setCode, sync }
}
