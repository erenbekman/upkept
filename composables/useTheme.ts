export type Theme = 'light' | 'dark'

export function useTheme() {
  const theme = useState<Theme>('theme', () => 'light')

  function apply(t: Theme) {
    theme.value = t
    if (import.meta.client) {
      localStorage.setItem('theme', t)
      document.documentElement.setAttribute('data-theme', t)
    }
  }

  function init() {
    if (import.meta.client) {
      apply((localStorage.getItem('theme') as Theme) || 'light')
    }
  }

  return { theme, apply, init }
}
