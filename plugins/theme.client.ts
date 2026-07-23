export default defineNuxtPlugin(() => {
  const t = (localStorage.getItem('theme') as 'light' | 'dark') || 'light'
  document.documentElement.setAttribute('data-theme', t)
  useState('theme', () => t).value = t
})
