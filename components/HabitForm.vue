<script setup lang="ts">
import type { HabitDraft } from '~/composables/useHabits'

const props = defineProps<{ modelValue: HabitDraft; groups?: string[] }>()
const emit = defineEmits<{ 'update:modelValue': [value: HabitDraft] }>()
const reminder = useReminder()

const d = computed(() => props.modelValue)
function set<K extends keyof HabitDraft>(key: K, value: HabitDraft[K]) {
  emit('update:modelValue', { ...props.modelValue, [key]: value })
  haptic()
}

const WEEK = [1, 2, 3, 4, 5, 6, 0].map(day => ({ bit: 1 << day, date: shiftDate('2024-01-07', day) }))
const WEEKDAYS = 0b0111110
const WEEKENDS = 0b1000001
const mask = computed(() => d.value.days ?? ALL_DAYS)
const plan = computed(() => (mask.value === ALL_DAYS ? 'all' : mask.value === WEEKDAYS ? 'weekdays' : mask.value === WEEKENDS ? 'weekends' : 'custom'))
const PLANS = [
  { id: 'all', days: null },
  { id: 'weekdays', days: WEEKDAYS },
  { id: 'weekends', days: WEEKENDS },
] as const

function toggleDay(bit: number) {
  const next = mask.value ^ bit
  if (!next) return
  set('days', normalizeDays(next))
}

const swatches = computed(() => {
  const c = d.value.color
  return c && !HABIT_COLORS.some(x => x.hex === c) ? [{ hex: c, name: '' }, ...HABIT_COLORS.slice(0, 15)] : HABIT_COLORS.slice(0, 16)
})
const units = computed(() => tList<string>('habit.units'))
const groupChoices = computed(() => [...new Set([...tList<string>('habit.groups'), ...(props.groups ?? [])])])
const quit = computed(() => d.value.kind === 'quit')

function step(dir: 1 | -1) {
  const g = d.value.goal
  const s = g >= 10 ? 5 : 1
  set('goal', Math.max(1, g + dir * s))
}
</script>

<template>
  <section>
    <h2 class="k-eyebrow">{{ t('habits.kind') }}</h2>
    <div class="k-kinds" role="radiogroup" :aria-label="t('habits.kind')">
      <button
        v-for="k in (['build', 'quit'] as const)" :key="k" role="radio" class="k-kind" :class="{ on: d.kind === k }"
        :aria-checked="d.kind === k" :style="{ '--k-kind': d.color }" @click="set('kind', k)"
      >
        <b>{{ k === 'build' ? t('habits.kindBuild') : t('habits.kindQuit') }}</b>
        <span>{{ k === 'build' ? t('habit.buildSub') : t('habit.quitSub') }}</span>
      </button>
    </div>
  </section>

  <section>
    <h2 class="k-eyebrow">{{ t('habit.colorTitle') }}</h2>
    <div class="k-group k-swatches" role="radiogroup" :aria-label="t('habits.color')">
      <button
        v-for="c in swatches" :key="c.hex" role="radio" class="k-swatch" :class="{ on: d.color === c.hex }"
        :style="{ background: c.hex, '--k-swatch': c.hex }" :aria-checked="d.color === c.hex"
        :aria-label="c.name ? t(`colors.${c.name}`) : t('habits.customColor')" @click="set('color', c.hex)"
      />
    </div>
  </section>

  <section>
    <h2 class="k-eyebrow">{{ t('habits.days') }}</h2>
    <div class="k-group" style="padding:12px; display:flex; flex-direction:column; gap:12px;">
      <div class="k-seg" role="radiogroup" :aria-label="t('habits.days')">
        <button
          v-for="p in PLANS" :key="p.id" role="radio" :class="{ on: plan === p.id }" :aria-checked="plan === p.id"
          @click="set('days', p.days)"
        >{{ t(`habit.plan.${p.id}`) }}</button>
      </div>
      <div class="k-days">
        <button
          v-for="w in WEEK" :key="w.bit" class="k-day" :class="{ on: mask & w.bit }" :style="{ '--k-day': d.color }"
          :aria-pressed="!!(mask & w.bit)" :aria-label="fmtWeekdayLong(w.date)" @click="toggleDay(w.bit)"
        >{{ fmtWeekdayMin(w.date) }}</button>
      </div>
    </div>
    <p class="k-foot">{{ t('habit.daysFoot') }}</p>
  </section>

  <section>
    <h2 class="k-eyebrow">{{ t('habits.goal') }}</h2>
    <div class="k-group">
      <div class="k-row">
        <span :style="{ opacity: quit ? 0.4 : 1 }">{{ t('habit.amountTrack') }}</span>
        <button
          type="button" role="switch" class="k-switch" :class="{ on: d.goalOn && !quit }" :aria-checked="d.goalOn && !quit"
          :aria-label="t('habit.amountTrack')" :disabled="quit" @click="set('goalOn', !d.goalOn)"
        ><span /></button>
      </div>
      <div v-if="d.goalOn && !quit" class="k-sub-row" style="padding:12px 16px 14px; display:flex; flex-direction:column; gap:12px; position:relative;">
        <div class="k-stepper">
          <button class="k-round" :aria-label="t('habit.less')" @click="step(-1)">−</button>
          <span style="display:flex; align-items:baseline; gap:6px;">
            <span class="k-tnum" style="font-size:40px; font-weight:850; letter-spacing:-0.04em;">{{ fmtAmount(d.goal) }}</span>
            <span style="font-size:17px; font-weight:600; color:var(--k-sub);">{{ d.unit }}</span>
          </span>
          <button class="k-round" :aria-label="t('habit.more')" @click="step(1)">+</button>
        </div>
        <div class="k-chips" role="radiogroup" :aria-label="t('habits.unit')">
          <button
            v-for="u in units" :key="u" role="radio" class="k-chip" :class="{ on: d.unit === u }" :aria-checked="d.unit === u"
            style="height:32px; font-size:14px;" @click="set('unit', u)"
          >{{ u }}</button>
        </div>
      </div>
    </div>
    <p class="k-foot">{{ quit ? t('habit.goalQuitFoot') : d.goalOn ? t('habit.goalOnFoot') : t('habit.goalOffFoot') }}</p>
  </section>

  <section>
    <h2 class="k-eyebrow">{{ t('habit.timeTitle') }}</h2>
    <div class="k-chips" role="radiogroup" :aria-label="t('habits.group')">
      <button class="k-chip card" role="radio" :class="{ on: !d.group }" :aria-checked="!d.group" @click="set('group', null)">{{ t('habit.noGroup') }}</button>
      <button
        v-for="g in groupChoices" :key="g" role="radio" class="k-chip card" :class="{ on: d.group === g }" :aria-checked="d.group === g"
        @click="set('group', d.group === g ? null : g)"
      >{{ g }}</button>
    </div>
    <p class="k-foot">{{ t('habit.timeFoot') }}</p>
  </section>

  <section v-if="reminder.supported">
    <h2 class="k-eyebrow">{{ t('reminder.habitLabel') }}</h2>
    <div class="k-group">
      <div class="k-row">
        <span>{{ t('habit.remindMe') }}</span>
        <button
          type="button" role="switch" class="k-switch" :class="{ on: !!d.remind }" :aria-checked="!!d.remind"
          :aria-label="t('habit.remindMe')" @click="set('remind', d.remind ? null : '20:00')"
        ><span /></button>
      </div>
      <div v-if="d.remind" class="k-row">
        <span>{{ t('reminder.time') }}</span>
        <input :value="d.remind" type="time" class="k-pill-input" :aria-label="t('reminder.time')" @change="set('remind', ($event.target as HTMLInputElement).value || '20:00')" />
      </div>
    </div>
  </section>
</template>
