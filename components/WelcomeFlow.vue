<script setup lang="ts">
const emit = defineEmits<{ done: [] }>()

const repo = useHabits()
const reminder = useReminder()
const { show: toast } = useToast()

const step = ref(0)
const suggestions = computed(() => tList<{ icon: string; name: string }>('onboarding.suggestions'))
const colors = computed(() => suggestions.value.map((_, i) => HABIT_COLORS[(i * 7 + 1) % HABIT_COLORS.length].hex))
const picked = ref<number[]>([])
const minutes = ref(21 * 60)
const busy = ref(false)
const intro = ref<{ id: number; color: string; value: number; faded: boolean }[]>([
  { id: 1, color: '#ff5a36', value: 0, faded: false },
  { id: 2, color: '#ff9f1c', value: 0, faded: false },
  { id: 3, color: '#8b5cf6', value: 0, faded: false },
])
let introTimer: ReturnType<typeof setTimeout>
onMounted(() => {
  introTimer = setTimeout(() => {
    intro.value = intro.value.map(l => ({ ...l, value: 0.27 }))
  }, 350)
})
onUnmounted(() => clearTimeout(introTimer))

const steps = computed(() => (reminder.supported ? 3 : 2))
const pickLayers = computed(() => {
  const n = Math.max(3, picked.value.length)
  return picked.value.map(i => ({ id: i, color: colors.value[i], value: 1 / n, faded: false }))
})
const time = computed(() => `${String(Math.floor(minutes.value / 60)).padStart(2, '0')}:${String(minutes.value % 60).padStart(2, '0')}`)

function toggle(i: number) {
  picked.value = picked.value.includes(i) ? picked.value.filter(x => x !== i) : [...picked.value, i]
  haptic()
}

async function create() {
  if (!picked.value.length || busy.value) return
  busy.value = true
  for (const i of picked.value) {
    const s = suggestions.value[i]
    await repo.create({ name: s.name, icon: s.icon, color: colors.value[i] })
  }
  busy.value = false
  if (reminder.supported) step.value = 2
  else emit('done')
}

async function remind() {
  const ok = await reminder.enable(time.value)
  if (ok) toast(t('reminder.set', { time: time.value }))
  else toast(t('reminder.denied'), true)
  emit('done')
}

function own() {
  navigateTo('/app/habit/new')
}
</script>

<template>
  <div class="k-welcome">
    <div class="k-welcome-dots" aria-hidden="true">
      <span v-for="i in steps" :key="i" :class="{ on: step === i - 1 }" />
    </div>

    <template v-if="step === 0">
      <div class="k-welcome-body">
        <div style="padding:10px 30px 0;">
          <FillNumber text="1" :layers="intro" live :label="t('welcome.dayOne')" />
        </div>
        <h1>{{ t('welcome.title1') }}<br>{{ t('welcome.title2') }}</h1>
        <p>{{ t('welcome.text') }}</p>
        <p style="font-size:14px; font-weight:600; color:var(--k-faint);">{{ t('welcome.note') }}</p>
      </div>
      <div class="k-welcome-actions">
        <button class="k-btn primary block" style="height:58px; border-radius:29px; font-size:17px;" @click="step = 1">{{ t('welcome.start') }}</button>
      </div>
    </template>

    <template v-else-if="step === 1">
      <div class="k-welcome-body" style="gap:18px;">
        <div style="display:flex; align-items:center; gap:16px;">
          <span class="k-fill-text" aria-hidden="true" style="font-size:112px; line-height:0.82;" :style="{ backgroundImage: layerGradient(pickLayers, 'var(--k-empty)') }">1</span>
          <span style="display:flex; flex-direction:column; gap:6px;">
            <h1 style="font-size:28px;">{{ t('onboarding.title') }}</h1>
            <p style="font-size:15px;">{{ t('welcome.pickText') }}</p>
          </span>
        </div>
        <div class="k-suggest" role="group" :aria-label="t('onboarding.title')">
          <button
            v-for="(s, i) in suggestions" :key="s.name" :class="{ on: picked.includes(i) }" :aria-pressed="picked.includes(i)"
            :style="picked.includes(i) ? { background: colors[i] } : undefined" @click="toggle(i)"
          >
            <i aria-hidden="true">{{ s.icon }}</i>
            <b>{{ s.name }}</b>
          </button>
        </div>
        <p v-if="picked.length > 3" style="font-size:14px; color:var(--k-accent-ink);">{{ t('onboarding.tooMany') }}</p>
      </div>
      <div class="k-welcome-actions">
        <button class="k-link" @click="own">{{ t('onboarding.own') }}</button>
        <button class="k-btn primary block" style="height:58px; border-radius:29px; font-size:17px;" :disabled="!picked.length || busy" @click="create">
          {{ picked.length ? t('onboarding.start', { n: picked.length }) : t('onboarding.pickOne') }}
        </button>
      </div>
    </template>

    <template v-else>
      <div class="k-welcome-body" style="align-items:center; text-align:center; justify-content:center;">
        <div class="k-card" style="width:100%; max-width:320px; padding:14px 16px; display:flex; gap:12px; align-items:center; text-align:left; box-shadow:var(--k-shadow);">
          <span aria-hidden="true" style="width:38px; height:38px; border-radius:10px; background:var(--k-ink); color:var(--k-accent); display:flex; align-items:center; justify-content:center; font-weight:900;">1</span>
          <span style="display:flex; flex-direction:column; gap:2px;">
            <b style="font-size:14px;">{{ t('reminder.title') }}</b>
            <span style="font-size:13px; color:var(--k-sub);">{{ t('reminder.body') }}</span>
          </span>
        </div>
        <h1 style="font-size:30px; padding-top:24px;">{{ t('onboarding.remindTitle') }}</h1>
        <p style="font-size:16px;">{{ t('onboarding.remindText') }}</p>
        <div style="display:flex; align-items:center; gap:14px; padding-top:8px;">
          <button class="k-round" style="background:var(--k-card);" :aria-label="t('welcome.earlier')" @click="minutes = Math.max(360, minutes - 30)">−</button>
          <span class="k-tnum" style="font-size:44px; font-weight:850; letter-spacing:-0.03em; min-width:130px;">{{ time }}</span>
          <button class="k-round" style="background:var(--k-card);" :aria-label="t('welcome.later')" @click="minutes = Math.min(1410, minutes + 30)">+</button>
        </div>
      </div>
      <div class="k-welcome-actions">
        <button class="k-link" @click="emit('done')">{{ t('onboarding.notNow') }}</button>
        <button class="k-btn primary block" style="height:58px; border-radius:29px; font-size:17px;" @click="remind">{{ t('onboarding.remindOk') }}</button>
      </div>
    </template>
  </div>
</template>
