export type Theme = 'light' | 'dark'

export const systemTheme = (): Theme =>
  matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'

export function useTheme() {
  const theme = useState<Theme>('theme', () => 'light')

  function apply(t: Theme) {
    theme.value = t
    if (!import.meta.client) return
    localStorage.setItem('theme', t)
    // A theme flip recolours nearly every element at once, so every colour
    // transition on the page fires together and the switch smears. Kill them
    // for one frame, then hand them back.
    const kill = document.createElement('style')
    kill.textContent = '*,*::before,*::after{transition:none !important}'
    document.head.appendChild(kill)
    document.documentElement.setAttribute('data-theme', t)
    void document.body.offsetHeight
    requestAnimationFrame(() => kill.remove())
  }

  return { theme, apply }
}
