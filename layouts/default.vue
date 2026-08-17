<script setup lang="ts">
const { msg, isError, show: toast, dismiss: dismissToast } = useToast()
const { code, sync, status, dataVersion } = useSync()

// No maximum-scale: it was the one thing the native webview actually obeyed, so
// it capped pinch zoom there and nowhere else — a WCAG 1.4.4 failure on the only
// platform it reached. touch-action: manipulation on .app-shell still kills the
// double-tap delay while leaving pinch zoom alone.
useHead({
  meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' }],
})

let debounce: ReturnType<typeof setTimeout>
const onMutated = () => { clearTimeout(debounce); debounce = setTimeout(() => sync(), 1500) }
const onVisible = () => { if (!document.hidden) sync() }

// Pull-to-refresh: at the top of the page, dragging down past the threshold
// re-syncs and reloads the screens. Gives touch users the "get the other
// device's changes" gesture they already expect.
const PULL_MAX = 90
const PULL_TRIGGER = 62
const pull = ref(0)
const refreshing = ref(false)
let startY = 0
let tracking = false

const scrollTop = () => window.scrollY || document.documentElement.scrollTop || 0

function onTouchStart(e: TouchEvent) {
  if (refreshing.value || scrollTop() > 0 || e.touches.length !== 1) return
  startY = e.touches[0].clientY
  tracking = true
}

function onTouchMove(e: TouchEvent) {
  if (!tracking) return
  const d = e.touches[0].clientY - startY
  if (d <= 0 || scrollTop() > 0) { pull.value = 0; tracking = false; return }
  pull.value = Math.min(PULL_MAX, d * 0.5)
  if (pull.value > 4 && e.cancelable) e.preventDefault()
}

async function onTouchEnd() {
  if (!tracking) return
  tracking = false
  const fire = pull.value >= PULL_TRIGGER
  pull.value = 0
  if (!fire) return
  refreshing.value = true
  try {
    const ok = code.value ? await sync() : true
    dataVersion.value++
    if (code.value && !ok) toast('Güncellenemedi — bağlantını kontrol et', true)
    else toast(code.value ? 'Güncel ✓' : 'Yenilendi ✓')
  } finally {
    refreshing.value = false
  }
}

onMounted(() => {
  if (code.value) sync()
  window.addEventListener('upkept:mutated', onMutated)
  window.addEventListener('focus', sync)
  document.addEventListener('visibilitychange', onVisible)
  window.addEventListener('touchstart', onTouchStart, { passive: true })
  window.addEventListener('touchmove', onTouchMove, { passive: false })
  window.addEventListener('touchend', onTouchEnd)
  window.addEventListener('touchcancel', onTouchEnd)
})
onUnmounted(() => {
  window.removeEventListener('upkept:mutated', onMutated)
  window.removeEventListener('focus', sync)
  document.removeEventListener('visibilitychange', onVisible)
  window.removeEventListener('touchstart', onTouchStart)
  window.removeEventListener('touchmove', onTouchMove)
  window.removeEventListener('touchend', onTouchEnd)
  window.removeEventListener('touchcancel', onTouchEnd)
})

const spinning = computed(() => refreshing.value || status.value === 'syncing')

// Inline SVG, not text glyphs: the labels are hidden on mobile, so the icon is
// the only affordance — and ☼ ▦ ◔ ❋ ⚙︎ render from whatever font falls back,
// inconsistently across iOS versions (⚙︎ turns into an emoji on some).
const tabs = [
  { to: '/app', label: 'Bugün', path: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4"/>' },
  { to: '/app/grid', label: 'Grid', path: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>' },
  { to: '/app/stats', label: 'İstatistik', path: '<path d="M21.2 15.9A10 10 0 1 1 8 2.8"/><path d="M22 12A10 10 0 0 0 12 2v10z"/>' },
  { to: '/app/habits', label: 'Alışkanlıklar', path: '<path d="M7 20h10"/><path d="M10 20c5.5-2.5.8-6.4 3-10"/><path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4 0 5.5.8z"/><path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z"/>' },
  { to: '/app/settings', label: 'Ayarlar', path: '<path d="M20 7h-9"/><path d="M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/>' },
]
</script>

<template>
  <div class="app-shell">
    <div
      v-show="pull > 0 || refreshing"
      class="ptr"
      :style="{ transform: `translate(-50%, ${refreshing ? 34 : pull}px)`, opacity: refreshing ? 1 : Math.min(1, pull / 40) }"
    >
      <span class="ptr-ic" :class="{ spin: spinning }">⟳</span>
      <span>{{ refreshing ? 'Güncelleniyor…' : (pull >= 62 ? 'Bırak, güncellensin' : 'Aşağı çek') }}</span>
    </div>

    <main>
      <slot />
    </main>

    <nav class="tabbar">
      <NuxtLink v-for="t in tabs" :key="t.to" :to="t.to" class="tab" :aria-label="t.label" :title="t.label">
        <svg
          class="tab-icon" width="23" height="23" viewBox="0 0 24 24" fill="none" aria-hidden="true"
          stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"
          v-html="t.path"
        />
        <span class="tab-label">{{ t.label }}</span>
      </NuxtLink>
    </nav>

    <AppAsk />

    <!-- The live region has to exist before the message lands or a screen reader
         never announces it — so the wrapper stays mounted, not the toast.
         An error is urgent and persistent: assertive, no auto-dismiss, and a real
         button so it can be cleared by pointer and keyboard alike. -->
    <div role="status" aria-live="polite">
      <div v-if="msg && !isError" :key="msg" class="toast">{{ msg }}</div>
    </div>
    <div role="alert">
      <button v-if="msg && isError" class="toast toast-error" @click="dismissToast">
        {{ msg }}<span class="toast-x" aria-hidden="true">✕</span>
        <span class="tab-label">Kapat</span>
      </button>
    </div>
  </div>
</template>
