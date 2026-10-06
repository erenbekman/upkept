export type Theme = 'light' | 'dark'
export type PaletteId = 'upkept' | 'pastel' | 'bordo' | 'night' | 'garden' | 'forest'

// Swatches are the original Color Hunt palettes; the app tokens derived from
// them live in assets/main.css under [data-palette].
export const PALETTES: { id: PaletteId; swatch: string[] }[] = [
  { id: 'upkept', swatch: ['#6d6fae', '#898abd', '#e6efe1', '#f6f5f2'] },
  { id: 'pastel', swatch: ['#f29191', '#f7adad', '#b1e5e6', '#ccfbfa'] },
  { id: 'bordo', swatch: ['#800020', '#d45060', '#f3e6d5', '#fff9f2'] },
  { id: 'night', swatch: ['#010736', '#0d1c42', '#22396f', '#fcf1d0'] },
  { id: 'garden', swatch: ['#8ea66b', '#d8a2a2', '#ffdcdc', '#fff9d6'] },
  { id: 'forest', swatch: ['#123f36', '#2a6b5c', '#c49a45', '#e8dcc4'] },
]

export const systemTheme = (): Theme =>
  matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'

export function setPaletteAttr(id: PaletteId) {
  if (id === 'upkept') document.documentElement.removeAttribute('data-palette')
  else document.documentElement.setAttribute('data-palette', id)
}

// A theme flip recolours nearly every element at once, so every colour
// transition on the page fires together and the switch smears. Kill them
// for one frame, then hand them back.
function withoutTransitions(change: () => void) {
  const kill = document.createElement('style')
  kill.textContent = '*,*::before,*::after{transition:none !important}'
  document.head.appendChild(kill)
  change()
  void document.body.offsetHeight
  requestAnimationFrame(() => kill.remove())
}

export function useTheme() {
  const theme = useState<Theme>('theme', () => 'light')
  const palette = useState<PaletteId>('palette', () => 'upkept')

  function apply(t: Theme) {
    theme.value = t
    if (!import.meta.client) return
    localStorage.setItem('theme', t)
    withoutTransitions(() => document.documentElement.setAttribute('data-theme', t))
  }

  function applyPalette(id: PaletteId) {
    palette.value = id
    if (!import.meta.client) return
    localStorage.setItem('palette', id)
    withoutTransitions(() => setPaletteAttr(id))
  }

  return { theme, apply, palette, applyPalette }
}
