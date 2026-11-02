<script setup lang="ts">
import type { Habit, HabitDraft } from '~/composables/useHabits'

const repo = useHabits()
const reminder = useReminder()
const { show: toast } = useToast()
const router = useRouter()

const existing = ref<Habit[]>([])
const draft = ref<HabitDraft>(habitDraft(null, HABIT_COLORS[7].hex))
const busy = ref(false)

onMounted(async () => {
  existing.value = await repo.listActive()
  draft.value = habitDraft(null, nextHabitColor(existing.value.map(h => h.color)))
})

const groups = computed(() => existing.value.map(h => h.group_name).filter(Boolean) as string[])
const suggestions = computed(() => tList<{ name: string; kind?: 'build' | 'quit'; goal?: number; unit?: string }>('habit.suggestions'))
const canAdd = computed(() => !!draft.value.name.trim() && !busy.value)

const preview = computed(() => {
  const list = [...existing.value.slice(0, 3).map(h => ({ id: h.id, color: h.color || '#ff5a36' })), { id: -1, color: draft.value.color }]
  const n = Math.max(4, list.length)
  return list.map(l => ({ ...l, value: 0.75 / n, faded: false }))
})
const previewSub = computed(() => {
  const d = draft.value
  const days = d.days == null ? t('habit.plan.all') : d.days === 0b0111110 ? t('habit.plan.weekdays') : d.days === 0b1000001 ? t('habit.plan.weekends') : t('habit.plan.nDays', { n: countBits(d.days) })
  return [d.kind === 'quit' ? t('habits.kindQuit') : '', days, d.goalOn && d.kind !== 'quit' ? `${fmtAmount(d.goal)} ${d.unit}`.trim() : '', d.group ?? ''].filter(Boolean).join(' · ')
})

function countBits(n: number) {
  let c = 0
  for (let x = n; x; x >>= 1) c += x & 1
  return c
}

function useSuggestion(s: { name: string; kind?: 'build' | 'quit'; goal?: number; unit?: string }) {
  draft.value = { ...draft.value, name: s.name, kind: s.kind ?? 'build', goalOn: !!s.goal, goal: s.goal ?? draft.value.goal, unit: s.unit ?? draft.value.unit }
  haptic()
}

function close() {
  if (window.history.state?.back) router.back()
  else navigateTo('/app')
}

async function add() {
  if (!canAdd.value) return
  busy.value = true
  const id = await repo.create(draftFields(draft.value))
  const permitted = !reminder.supported || !draft.value.remind || await reminder.setHabitTime(id, draft.value.remind)
  busy.value = false
  haptic('success')
  toast(permitted ? t('habit.added', { name: draft.value.name.trim() }) : t('reminder.denied'), !permitted)
  close()
}
</script>

<template>
  <div class="k-page k-sheet-page" style="animation: kRise .38s cubic-bezier(.2,.9,.25,1) both;">
    <div class="k-modal-head">
      <button class="k-back" @click="close">{{ t('common.cancel') }}</button>
      <b>{{ t('habits.newLabel') }}</b>
      <button class="k-btn small" :class="{ accent: canAdd }" :disabled="!canAdd" :style="canAdd ? { background: draft.color, color: '#fff' } : undefined" @click="add">{{ t('settings.add') }}</button>
    </div>

    <div class="k-stack" style="padding-top:4px; padding-bottom:40px;">
      <div class="k-hero">
        <span class="k-fill-text" aria-hidden="true" style="font-size:76px; line-height:0.9;" :style="{ backgroundImage: layerGradient(preview, 'var(--k-empty)') }">{{ new Date().getDate() }}</span>
        <span class="k-hero-text">
          <b style="font-size:17px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">{{ draft.name.trim() || t('habits.newLabel') }}</b>
          <span>{{ previewSub }}. {{ t('habit.layerNote') }}</span>
        </span>
      </div>

      <section>
        <input v-model="draft.name" class="k-input" maxlength="60" :placeholder="t('habit.namePlaceholder')" :aria-label="t('habits.nameLabel')" enterkeyhint="done" />
        <div class="k-chips" style="padding-top:10px;">
          <button
            v-for="s in suggestions" :key="s.name" class="k-chip card" :class="{ on: draft.name === s.name }"
            style="height:34px; font-size:14px;" @click="useSuggestion(s)"
          >{{ s.name }}</button>
        </div>
      </section>

      <HabitForm v-model="draft" :groups="groups" />

      <p class="k-micro">{{ t('habit.addNote') }}</p>
    </div>
  </div>
</template>
