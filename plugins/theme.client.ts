export default defineNuxtPlugin(() => {
  const pref = readThemePref()
  const theme = resolveTheme(pref)
  document.documentElement.setAttribute('data-theme', theme)
  useState('theme_pref', () => pref).value = pref
  useState('theme', () => theme).value = theme

  const accent = readAccent()
  setAccentAttr(accent)
  useState('accent', () => accent).value = accent
  useState('mono_fill', () => false).value = localStorage.getItem('mono_fill') === '1'

  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (readThemePref() !== 'auto') return
    const next = systemTheme()
    document.documentElement.setAttribute('data-theme', next)
    useState('theme').value = next
  })
})
