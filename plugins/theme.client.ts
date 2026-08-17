export default defineNuxtPlugin(() => {
  // No stored choice means first run: follow the OS instead of forcing light,
  // which flashed a white screen at anyone on a dark desktop.
  const t = (localStorage.getItem('theme') as 'light' | 'dark') || systemTheme()
  document.documentElement.setAttribute('data-theme', t)
  useState('theme', () => t).value = t
})
