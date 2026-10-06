<script setup lang="ts">
defineProps<{ art: 'grid' | 'stats'; title: string; text: string; cta?: string }>()

const GRID = [
  'done', 'done', 'partial', 'done', 'none', 'none', 'none',
  'done', 'miss', 'done', 'done', 'none', 'none', 'none',
  'partial', 'done', 'done', 'none', 'none', 'none', 'none',
]
</script>

<template>
  <div class="empty-card">
    <svg v-if="art === 'grid'" class="empty-art" viewBox="0 0 146 62" aria-hidden="true">
      <rect
        v-for="(s, i) in GRID" :key="i"
        :x="(i % 7) * 21" :y="Math.floor(i / 7) * 21" width="17" height="17" rx="5"
        :class="`ea-${s}`"
      />
    </svg>

    <svg v-else-if="art === 'stats'" class="empty-art" viewBox="0 0 72 72" aria-hidden="true">
      <circle cx="36" cy="36" r="28" class="ea-track" />
      <circle cx="36" cy="36" r="28" class="ea-arc" pathLength="100" />
      <text x="36" y="42" text-anchor="middle" class="ea-num">%</text>
    </svg>

    <h2 class="empty-title">{{ title }}</h2>
    <div class="empty-text">{{ text }}</div>
    <button v-if="cta" class="btn btn-primary" @click="navigateTo('/app/habits')">{{ cta }}</button>
  </div>
</template>
