<script setup lang="ts">
import type { EntryStatus, Entry, ReasonTag } from '~/composables/useEntries'

// withDefaults, not optional props: Vue casts an absent Boolean prop to false,
// which silently disabled the day arrows on any screen that omitted them.
const props = withDefaults(defineProps<{
  habitId: number
  habitName: string
  date: string
  current: Entry | null
  canPrev?: boolean
  canNext?: boolean
}>(), { canPrev: true, canNext: true })
// The parent owns which dates are reachable, so the sheet only asks — it never
// decides. That keeps the grid (bounded to its month) and the Bugün screen
// (bounded by today) from needing the same rules.
const emit = defineEmits<{ saved: []; close: []; goto: [date: string] }>()

const entries = useEntries()
const reasons = ref<ReasonTag[]>([])

const status = ref<EntryStatus | null>(props.current?.status ?? null)
const reasonId = ref<number | null>(props.current?.reason_tag_id ?? null)
const note = ref<string>(props.current?.note ?? '')
const saved = ref(false)

// Moving to another day inside the sheet has to reload what that day holds,
// otherwise the previous day's status stays selected and the next tap overwrites it.
watch(() => props.date, () => {
  status.value = props.current?.status ?? null
  reasonId.value = props.current?.reason_tag_id ?? null
  note.value = props.current?.note ?? ''
  saved.value = false
})

let savedTimer: ReturnType<typeof setTimeout>
let closeTimer: ReturnType<typeof setTimeout>

onMounted(async () => { reasons.value = await entries.listReasons() })

const sheetRef = ref<InstanceType<typeof AppSheet> | null>(null)

// The sheet animates itself out first, so the parent unmounts us only once the
// exit has actually played.
async function leave(reason: 'saved' | 'close') {
  await sheetRef.value?.dismiss()
  emit(reason)
}

const STATUSES: EntryStatus[] = ['done', 'partial', 'missed']
const showReasons = computed(() => status.value === 'partial' || status.value === 'missed')

function flashSaved() {
  saved.value = true
  clearTimeout(savedTimer)
  savedTimer = setTimeout(() => { saved.value = false }, 1400)
}

async function write() {
  if (!status.value) return
  await entries.upsert({
    habit_id: props.habitId,
    date: props.date,
    status: status.value,
    reason_tag_id: reasonId.value,
    note: note.value.trim() || null,
  })
  flashSaved()
}

async function pick(s: EntryStatus) {
  status.value = s
  if (s === 'done') reasonId.value = null
  await write()
  if (s === 'done') {
    clearTimeout(closeTimer)
    closeTimer = setTimeout(() => leave('saved'), 650)
  }
}

async function pickReason(id: number) {
  reasonId.value = reasonId.value === id ? null : id
  await write()
}

async function clear() {
  await entries.remove(props.habitId, props.date)
  leave('saved')
}

function onPick(e: Event) {
  const v = (e.target as HTMLInputElement).value
  if (v && v <= todayStr()) emit('goto', v)
}
</script>

<template>
  <AppSheet ref="sheetRef" :label="habitName" @close="emit('close')">
    <template #head>
      <div class="row spread" style="align-items:baseline;">
        <div class="sheet-title">{{ habitName }}</div>
        <span class="saved-flag" :style="{ opacity: saved ? 1 : 0 }">✓ Kaydedildi</span>
      </div>
    </template>

    <!-- The grid highlight sits behind a dimmed overlay, so the day being edited
         has to be unmistakable here instead. Arrows walk days without closing;
         tapping the label opens the platform date picker. -->
    <div class="sheet-date">
      <button
        class="date-nav" :disabled="!canPrev"
        aria-label="Önceki gün" @click="emit('goto', shiftDate(date, -1))"
      >‹</button>
      <label class="date-label">
        <span class="date-main">{{ date === todayStr() ? 'Bugün' : fmtShort(date) }}</span>
        <span class="date-sub">{{ fmtWeekdayLong(date) }}<template v-if="date !== todayStr()"> · {{ new Date(date + 'T00:00:00').getFullYear() }}</template></span>
        <input type="date" :value="date" :max="todayStr()" aria-label="Tarih seç" @change="onPick" />
      </label>
      <button
        class="date-nav" :disabled="!canNext"
        aria-label="Sonraki gün" @click="emit('goto', shiftDate(date, 1))"
      >›</button>
    </div>

    <div class="status-btns">
      <button
        v-for="s in STATUSES"
        :key="s"
        class="status-btn"
        :class="[statusMeta(s).cls, { on: status === s }]"
        :aria-pressed="status === s"
        @click="pick(s)"
      >
        <span class="glyph-dot">{{ statusMeta(s).glyph }}</span>
        <span class="status-label">{{ statusMeta(s).label }}</span>
      </button>
    </div>

    <Transition name="reveal">
    <div v-if="showReasons" style="margin-top:24px;">
      <div class="reason-title">Bir sebep eklemek istersen <span>(opsiyonel)</span></div>
      <div class="chips-wrap">
        <button
          v-for="r in reasons"
          :key="r.id"
          class="reason-chip"
          :class="{ on: reasonId === r.id }"
          :aria-pressed="reasonId === r.id"
          @click="pickReason(r.id)"
        >{{ r.name }}</button>
      </div>
      <textarea
        v-model="note"
        class="note-area"
        rows="2"
        aria-label="Not"
        placeholder="Kısa bir not… (opsiyonel)"
        @change="write"
      />
    </div>
    </Transition>

    <button class="btn btn-primary" style="margin-top:24px; width:100%;" @click="leave('saved')">Bitti</button>
    <button v-if="current" class="clear-link" @click="clear">Kaydı temizle</button>
    <div class="micro" style="margin-top:14px;">Kaçırmak da yolculuğun bir parçası.</div>
  </AppSheet>
</template>
