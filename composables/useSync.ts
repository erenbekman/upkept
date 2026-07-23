// ponytail: hardcoded API base; change here if you move to a custom domain.
const API_BASE = 'https://upkept.pages.dev/api'
const CODE_KEY = 'upkept_sync_code'
const MUT_KEY = 'upkept_mutated_at'

export function useSync() {
  const backup = useBackup()
  const code = useState<string | null>('sync_code', () =>
    import.meta.client ? localStorage.getItem(CODE_KEY) : null)
  const status = useState<'idle' | 'syncing' | 'ok' | 'error'>('sync_status', () => 'idle')
  const lastAt = useState<number | null>('sync_last', () => null)

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

  // Pull if the cloud copy changed more recently than ours; otherwise push.
  async function sync(): Promise<boolean> {
    if (!code.value || !import.meta.client) return false
    status.value = 'syncing'
    try {
      const remote = await (await fetch(`${API_BASE}/sync/${code.value}`)).json()
      const lm = localMut()
      if (remote.exists && Number(remote.mutatedAt) > lm) {
        await backup.importAll(JSON.parse(remote.data))
        setLocalMut(Number(remote.mutatedAt))
        status.value = 'ok'
        lastAt.value = Date.now()
        location.reload() // simplest way to surface pulled data on every open page
        return true
      }
      const data = JSON.stringify(await backup.exportAll())
      const stamp = lm || Date.now()
      await fetch(`${API_BASE}/sync/${code.value}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data, mutatedAt: stamp }),
      })
      setLocalMut(stamp)
      status.value = 'ok'
      lastAt.value = Date.now()
      return true
    } catch {
      status.value = 'error'
      return false
    }
  }

  return { code, status, lastAt, generateCode, setCode, sync }
}
