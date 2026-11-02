<script setup lang="ts">
import type { Habit } from '~/composables/useHabits'

const repo = useHabits()
const entriesRepo = useEntries()
const { show: toast } = useToast()
const router = useRouter()

const archived = ref<Habit[]>([])
const counts = ref<Record<number, number>>({})
const loaded = ref(false)

async function load() {
  archived.value = await repo.listArchived()
  const all = await entriesRepo.getRange('2000-01-01', todayStr())
  const c: Record<number, number> = {}
  for (const e of all) c[e.habit_id] = (c[e.habit_id] ?? 0) + 1
  counts.value = c
  loaded.value = true
}
onMounted(load)
watch(useSync().dataVersion, load)

async function restore(h: Habit) {
  await repo.restore(h.id)
  haptic('success')
  toast(t('habits.restored', { name: h.name }))
  await load()
}

function back() {
  if (window.history.state?.back) router.back()
  else navigateTo('/app/settings')
}
</script>

<template>
  <div class="k-page k-push">
    <div class="k-nav">
      <button class="k-back" @click="back">
        <svg viewBox="0 0 12 20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 2L2 10l8 8" /></svg>
        {{ t('tabs.settings') }}
      </button>
    </div>
    <div class="k-head" style="padding-top:4px;"><h1 class="k-large">{{ t('habits.archive') }}</h1></div>

    <div v-if="loaded && archived.length" style="padding-top:18px;">
      <div class="k-group">
        <div v-for="h in archived" :key="h.id" class="k-row tall">
          <span class="k-dot" :style="{ background: h.color || 'var(--k-accent)', opacity: 0.55 }" />
          <NuxtLink :to="`/app/habit/${h.id}`" class="k-row-label" style="text-decoration:none; color:inherit;">
            <span style="font-size:16.5px; font-weight:650;">{{ h.name }}</span>
            <small>{{ t('archive.records', { n: counts[h.id] ?? 0 }) }}</small>
          </NuxtLink>
          <button class="k-btn small" :aria-label="t('habits.restoreN', { name: h.name })" @click="restore(h)">{{ t('habits.restore') }}</button>
        </div>
      </div>
      <p class="k-foot">{{ t('habits.archiveFooter') }}</p>
    </div>

    <div v-else-if="loaded" class="k-empty" style="padding-top:120px;">
      <span class="k-fill-text" aria-hidden="true" style="font-size:92px; line-height:0.9; color:var(--k-empty); -webkit-text-fill-color:var(--k-empty);">0</span>
      <b>{{ t('archive.emptyTitle') }}</b>
      <span>{{ t('archive.emptyText') }}</span>
    </div>
  </div>
</template>
