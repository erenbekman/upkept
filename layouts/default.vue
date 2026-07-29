<script setup lang="ts">
const { msg, show: toast } = useToast()
const { code, sync, status, dataVersion } = useSync()

// Pinch-zoom has no useful state in a fixed-width tracker — it just strands the
// tab bar off-screen. Scoped to /app so the marketing pages stay zoomable, and
// mobile Safari ignores maximum-scale anyway; only the native webview obeys it.
useHead({
  meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover' }],
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
    toast(code.value ? (ok ? 'Güncel ✓' : 'Güncellenemedi — bağlantını kontrol et') : 'Yenilendi ✓')
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

const tabs = [
  { to: '/app', icon: '☼', label: 'Bugün' },
  { to: '/app/grid', icon: '▦', label: 'Grid' },
  { to: '/app/stats', icon: '◔', label: 'İstatistik' },
  { to: '/app/habits', icon: '❋', label: 'Alışkanlıklar' },
  { to: '/app/settings', icon: '⚙︎', label: 'Ayarlar' },
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

    <slot />

    <nav class="tabbar">
      <NuxtLink v-for="t in tabs" :key="t.to" :to="t.to" class="tab" :aria-label="t.label" :title="t.label">
        <span class="tab-icon">{{ t.icon }}</span>
        <span class="tab-label">{{ t.label }}</span>
      </NuxtLink>
    </nav>

    <div v-if="msg" :key="msg" class="toast">{{ msg }}</div>
  </div>
</template>
