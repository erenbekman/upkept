import { Capacitor } from '@capacitor/core'

const BASE = 17

export default defineNuxtPlugin(() => {
  if (Capacitor.getPlatform() !== 'ios') return
  const probe = document.createElement('span')
  probe.textContent = 'x'
  probe.style.cssText = 'font: -apple-system-body; position: absolute; visibility: hidden; pointer-events: none'
  document.body.appendChild(probe)
  const apply = () => {
    const size = parseFloat(getComputedStyle(probe).fontSize) || BASE
    const scale = Math.min(1.35, Math.max(1, size / BASE))
    document.documentElement.style.setProperty('--type-scale', scale.toFixed(3))
    document.documentElement.toggleAttribute('data-large-type', scale > 1.12)
  }
  apply()
  new ResizeObserver(apply).observe(probe)
  document.addEventListener('visibilitychange', () => { if (!document.hidden) apply() })
})
