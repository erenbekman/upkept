<script setup lang="ts">
const { msg } = useToast()

const tabs = [
  { to: '/', icon: '☼', label: 'Bugün' },
  { to: '/grid', icon: '▦', label: 'Grid' },
  { to: '/stats', icon: '◔', label: 'İstatistik' },
  { to: '/habits', icon: '❋', label: 'Alışkanlıklar' },
  { to: '/settings', icon: '⚙︎', label: 'Ayarlar' },
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
