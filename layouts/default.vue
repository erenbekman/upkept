<script setup lang="ts">
import type { TabId } from '~/composables/useTabBar'

const { msg, isError, show: toast, dismiss: dismissToast } = useToast()
const { code, sync, status, dataVersion } = useSync()

useHead({
  htmlAttrs: { class: 'k-app' },
  meta: [{ name: 'viewport', content: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover' }],
})

let debounce: ReturnType<typeof setTimeout>
const widget = useWidget()
const reminder = useReminder()
const refreshNative = () => Promise.all([widget.refresh(), reminder.reschedule()])
const { locale } = useLocale()
let nativeDebounce: ReturnType<typeof setTimeout>
const refreshSoon = () => { clearTimeout(nativeDebounce); nativeDebounce = setTimeout(refreshNative, 300) }
const onMutated = () => {
  clearTimeout(debounce); debounce = setTimeout(() => sync(), 1500)
  refreshSoon()
}
async function catchUp() {
  await sync()
  if (await widget.applyPending()) dataVersion.value++
}
const onVisible = () => {
  if (!document.hidden) catchUp()
  else refreshNative()
}

const PULL_MAX = 90
const PULL_TRIGGER = 62
const pull = ref(0)
const refreshing = ref(false)
let startY = 0
let tracking = false

const scrollTop = () => window.scrollY || document.documentElement.scrollTop || 0

function onTouchStart(e: TouchEvent) {
  if (refreshing.value || scrollTop() > 0 || e.touches.length !== 1) return
  if ((e.target as Element).closest('[data-no-ptr]')) return
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
    if (code.value && !ok) toast(t('common.syncFailed'), true)
    else toast(code.value ? t('common.upToDate') : t('ptr.refreshed'))
  } finally {
    refreshing.value = false
  }
}

const route = useRoute()
const tabBar = useTabBar()
const { accentHex, mono, pref } = useTheme()
const chromeHidden = useState('chrome_hidden', () => false)
const activeTab = computed(() => (chromeHidden.value ? null : tabForPath(route.path)))
const webFooter = computed(() => !tabBar.enabled && !!activeTab.value)

watch(activeTab, id => tabBar.sync(id))
watch(locale, () => { tabBar.label(activeTab.value); refreshSoon() })
watch(dataVersion, refreshSoon)
watch(accentHex, (c) => { tabBar.tint(c); refreshSoon() })
watch(mono, refreshSoon)
watch(pref, p => tabBar.style(p))

onMounted(async () => {
  catchUp().then(refreshNative)
  window.addEventListener('upkept:mutated', onMutated)
  window.addEventListener('focus', sync)
  document.addEventListener('visibilitychange', onVisible)
  window.addEventListener('touchstart', onTouchStart, { passive: true })
  window.addEventListener('touchmove', onTouchMove, { passive: false })
  window.addEventListener('touchend', onTouchEnd)
  window.addEventListener('touchcancel', onTouchEnd)
  await tabBar.setup((id) => {
    const tab = TABS.find(x => x.id === id)
    if (!tab) return
    haptic()
    if (route.path.replace(/(.)\/$/, '$1') === tab.to) window.scrollTo({ top: 0, behavior: 'smooth' })
    else navigateTo(tab.to)
  })
  await tabBar.label(activeTab.value)
  await tabBar.tint(accentHex.value)
  await tabBar.style(pref.value)
  await tabBar.sync(activeTab.value)
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

const ICONS: Record<TabId, string> = {
  today: '<rect x="4" y="3" width="14" height="16" rx="4"/><path d="M4 12c2.5-1.5 4.5-1.5 7 0s4.5 1.5 7 0" stroke-linecap="round"/>',
  progress: '<path d="M5 18V12M11 18V5M17 18v-9" stroke-linecap="round"/>',
  settings: '<path d="M4 7h9M17 7h1M4 15h1M9 15h9" stroke-linecap="round"/><circle cx="15" cy="7" r="2"/><circle cx="7" cy="15" r="2"/>',
}
</script>

<template>
  <div class="k-shell" :class="{ 'has-web-footer': webFooter }">
    <div
      v-show="pull > 0 || refreshing"
      class="ptr"
      :style="{ transform: `translate(-50%, ${refreshing ? 34 : pull}px)`, opacity: refreshing ? 1 : Math.min(1, pull / 40) }"
    >
      <BrandMark class="ptr-ic" :class="{ spin: spinning }" :style="spinning ? undefined : { transform: `rotate(${pull * 4}deg)` }" />
      <span>{{ refreshing ? t('common.syncing') : (pull >= PULL_TRIGGER ? t('ptr.release') : t('ptr.pull')) }}</span>
    </div>

    <main>
      <slot />
    </main>

    <nav v-if="webFooter" class="k-web-footer k-glass" :aria-label="t('tabs.label')">
      <NuxtLink
        v-for="tab in TABS" :key="tab.id" :to="tab.to" :class="{ on: activeTab === tab.id }"
        :aria-current="activeTab === tab.id ? 'page' : undefined"
      >
        <svg viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="1.9" aria-hidden="true" v-html="ICONS[tab.id]" />
        <span>{{ t(`tabs.${tab.id}`) }}</span>
      </NuxtLink>
    </nav>

    <AppAsk />

    <div role="status" aria-live="polite">
      <div v-if="msg && !isError" :key="msg" class="toast">{{ msg }}</div>
    </div>
    <div role="alert">
      <button v-if="msg && isError" class="toast toast-error" @click="dismissToast">
        {{ msg }}<span class="toast-x" aria-hidden="true">✕</span>
        <span class="sr-only">{{ t('common.close') }}</span>
      </button>
    </div>
  </div>
</template>
