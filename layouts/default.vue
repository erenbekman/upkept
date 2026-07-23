<script setup lang="ts">
const { msg } = useToast()
const { code, sync } = useSync()

let debounce: ReturnType<typeof setTimeout>
const onMutated = () => { clearTimeout(debounce); debounce = setTimeout(() => sync(), 1500) }
const onVisible = () => { if (!document.hidden) sync() }

onMounted(() => {
  if (code.value) sync()
  window.addEventListener('upkept:mutated', onMutated)
  window.addEventListener('focus', sync)
  document.addEventListener('visibilitychange', onVisible)
})
onUnmounted(() => {
  window.removeEventListener('upkept:mutated', onMutated)
  window.removeEventListener('focus', sync)
  document.removeEventListener('visibilitychange', onVisible)
})

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
    <slot />

    <nav class="tabbar">
      <NuxtLink v-for="t in tabs" :key="t.to" :to="t.to" class="tab">
        <span class="tab-icon">{{ t.icon }}</span>
        <span class="tab-label">{{ t.label }}</span>
      </NuxtLink>
    </nav>

    <div v-if="msg" :key="msg" class="toast">{{ msg }}</div>
  </div>
</template>
