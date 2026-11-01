export type Theme = 'light' | 'dark'
export type ThemePref = Theme | 'auto'
export type AccentId = 'coral' | 'indigo' | 'emerald' | 'sky' | 'ink'

export const ACCENTS: { id: AccentId; hex: string }[] = [
  { id: 'coral', hex: '#ff5a36' },
  { id: 'indigo', hex: '#6c4cff' },
  { id: 'emerald', hex: '#14a37f' },
  { id: 'sky', hex: '#2f80ed' },
  { id: 'ink', hex: '#111114' },
]

export const systemTheme = (): Theme =>
  matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'

export const resolveTheme = (pref: ThemePref): Theme => (pref === 'auto' ? systemTheme() : pref)

export function readThemePref(): ThemePref {
  const v = localStorage.getItem('theme')
  return v === 'light' || v === 'dark' ? v : 'auto'
}

export function readAccent(): AccentId {
  const v = localStorage.getItem('accent') as AccentId | null
  return ACCENTS.some(a => a.id === v) ? v! : 'coral'
}

export function setAccentAttr(id: AccentId) {
  if (id === 'coral') document.documentElement.removeAttribute('data-accent')
  else document.documentElement.setAttribute('data-accent', id)
}

function withoutTransitions(change: () => void) {
  const kill = document.createElement('style')
  kill.textContent = '*,*::before,*::after{transition:none !important}'
  document.head.appendChild(kill)
  change()
  void document.body.offsetHeight
  requestAnimationFrame(() => kill.remove())
}

export function useTheme() {
  const pref = useState<ThemePref>('theme_pref', () => 'auto')
  const theme = useState<Theme>('theme', () => 'light')
  const accent = useState<AccentId>('accent', () => 'coral')
  const mono = useState<boolean>('mono_fill', () => false)

  function apply(next: ThemePref) {
    pref.value = next
    theme.value = resolveTheme(next)
    if (!import.meta.client) return
    if (next === 'auto') localStorage.removeItem('theme')
    else localStorage.setItem('theme', next)
    withoutTransitions(() => document.documentElement.setAttribute('data-theme', theme.value))
  }

  function applyAccent(id: AccentId) {
    accent.value = id
    if (!import.meta.client) return
    localStorage.setItem('accent', id)
    withoutTransitions(() => setAccentAttr(id))
  }

  function setMono(on: boolean) {
    mono.value = on
    if (import.meta.client) localStorage.setItem('mono_fill', on ? '1' : '0')
  }

  const accentHex = computed(() => {
    const a = ACCENTS.find(x => x.id === accent.value)!
    return a.id === 'ink' && theme.value === 'dark' ? '#f4f5f7' : a.hex
  })

  return { pref, theme, apply, accent, accentHex, applyAccent, mono, setMono }
}
