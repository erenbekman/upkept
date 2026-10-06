<script setup lang="ts">
const emit = defineEmits<{ done: [] }>()

const repo = useHabits()
const reminder = useReminder()
const { show: toast } = useToast()

const suggestions = computed(() => tList<{ icon: string; name: string }>('onboarding.suggestions'))
const picked = ref<number[]>([])
const step = ref<1 | 2>(1)
const at = ref(DEFAULT_REMINDER)
const busy = ref(false)

function toggle(i: number) {
  picked.value = picked.value.includes(i) ? picked.value.filter(x => x !== i) : [...picked.value, i]
  haptic()
}

async function create() {
  if (!picked.value.length || busy.value) return
  busy.value = true
  const used: string[] = []
  for (const i of picked.value) {
    const s = suggestions.value[i]
    const color = nextHabitColor(used)
    used.push(color)
    await repo.create({ name: s.name, icon: s.icon, color })
  }
  busy.value = false
  if (reminder.supported) step.value = 2
  else emit('done')
}

async function remind() {
  const ok = await reminder.enable(at.value)
  if (ok) toast(t('reminder.set', { time: at.value }))
  else toast(t('reminder.denied'), true)
  emit('done')
}
</script>

<template>
  <div class="onboard">
    <template v-if="step === 1">
      <div v-if="reminder.supported" class="onboard-step">1 / 2</div>
      <h2 class="onboard-title">{{ t('onboarding.title') }}</h2>
      <p class="onboard-text">{{ t('onboarding.text') }}</p>
      <div class="suggest-grid">
        <button
          v-for="(s, i) in suggestions" :key="s.name"
          class="suggest" :class="{ on: picked.includes(i) }" :aria-pressed="picked.includes(i)"
          @click="toggle(i)"
        >
          <span class="suggest-icon">{{ s.icon }}</span>
          <span class="suggest-name">{{ s.name }}</span>
        </button>
      </div>
      <p v-if="picked.length > 3" class="onboard-hint">{{ t('onboarding.tooMany') }}</p>
      <button class="btn btn-primary onboard-cta" :disabled="!picked.length || busy" @click="create">
        {{ picked.length ? t('onboarding.start', { n: picked.length }) : t('onboarding.pickOne') }}
      </button>
      <button class="clear-link" @click="navigateTo('/app/habits')">{{ t('onboarding.own') }}</button>
    </template>

    <template v-else>
      <div class="onboard-step">2 / 2</div>
      <div class="onboard-bell" aria-hidden="true">🔔</div>
      <h2 class="onboard-title">{{ t('onboarding.remindTitle') }}</h2>
      <p class="onboard-text">{{ t('onboarding.remindText') }}</p>
      <input v-model="at" type="time" class="date-pill onboard-time" :aria-label="t('reminder.time')" />
      <button class="btn btn-primary onboard-cta" @click="remind">{{ t('onboarding.remindOk') }}</button>
      <button class="clear-link" @click="emit('done')">{{ t('onboarding.notNow') }}</button>
    </template>
  </div>
</template>
