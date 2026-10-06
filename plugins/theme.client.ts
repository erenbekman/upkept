export default defineNuxtPlugin(() => {
  // No stored choice means first run: follow the OS instead of forcing light,
  // which flashed a white screen at anyone on a dark desktop.
  const t = (localStorage.getItem('theme') as Theme) || systemTheme()
  document.documentElement.setAttribute('data-theme', t)
  useState('theme', () => t).value = t

  const stored = localStorage.getItem('palette') as PaletteId | null
  const p = PALETTES.some(x => x.id === stored) ? stored! : 'upkept'
  setPaletteAttr(p)
  useState('palette', () => p).value = p
})
