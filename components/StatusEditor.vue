<script setup lang="ts">
import type { EntryStatus, Entry, ReasonTag } from '~/composables/useEntries'

const props = defineProps<{
  habitId: number
  habitName: string
  date: string
  current: Entry | null
}>()
const emit = defineEmits<{ saved: []; close: [] }>()

const entries = useEntries()
const reasons = ref<ReasonTag[]>([])

const status = ref<EntryStatus | null>(props.current?.status ?? null)
const reasonId = ref<number | null>(props.current?.reason_tag_id ?? null)
const note = ref<string>(props.current?.note ?? '')
const saved = ref(false)

let savedTimer: ReturnType<typeof setTimeout>
let closeTimer: ReturnType<typeof setTimeout>

const sheet = ref<HTMLElement | null>(null)

const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') emit('close') }

onMounted(async () => {
  reasons.value = await entries.listReasons()
  document.addEventListener('keydown', onKey)
  // Focus has to enter the sheet, or a keyboard user is still tabbing the page
  // behind the overlay.
  sheet.value?.querySelector<HTMLElement>('button')?.focus()
})
onUnmounted(() => document.removeEventListener('keydown', onKey))

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
    closeTimer = setTimeout(() => emit('saved'), 650)
  }
}

async function pickReason(id: number) {
  reasonId.value = reasonId.value === id ? null : id
  await write()
}

async function clear() {
  await entries.remove(props.habitId, props.date)
  emit('saved')
}
</script>

<template>
  <div class="overlay" @click="emit('close')" />
  <div ref="sheet" class="sheet" role="dialog" aria-modal="true" :aria-label="habitName">
    <div class="grabber" />

    <div class="row spread" style="align-items:baseline; margin-bottom:4px;">
      <div class="sheet-title">{{ habitName }}</div>
      <span class="saved-flag" :style="{ opacity: saved ? 1 : 0 }">✓ Kaydedildi</span>
    </div>
    <div class="sub" style="margin-bottom:20px;">
      {{ date === todayStr() ? 'Bugünü nasıl geçirdin?' : `${fmtLong(date)} nasıl geçti?` }}
    </div>

    <div class="status-btns">
      <button
        v-for="s in STATUSES"
        :key="s"
        class="status-btn"
        :class="[statusMeta(s).cls, { on: status === s }]"
        @click="pick(s)"
      >
        <span class="glyph-dot">{{ statusMeta(s).glyph }}</span>
        <span class="status-label">{{ statusMeta(s).label }}</span>
      </button>
    </div>

    <div v-if="showReasons" style="margin-top:24px; animation: fadeIn 0.28s ease;">
      <div class="reason-title">Bir sebep eklemek istersen <span>(opsiyonel)</span></div>
      <div class="chips-wrap">
        <button
          v-for="r in reasons"
          :key="r.id"
          class="reason-chip"
          :class="{ on: reasonId === r.id }"
          @click="pickReason(r.id)"
        >{{ r.name }}</button>
      </div>
      <textarea
        v-model="note"
        class="note-area"
        rows="2"
        placeholder="Kısa bir not… (opsiyonel)"
        @change="write"
      />
    </div>

    <button class="btn btn-primary" style="margin-top:24px; width:100%;" @click="emit('saved')">Bitti</button>
    <button v-if="current" class="clear-link" @click="clear">Kaydı temizle</button>
    <div class="micro" style="margin-top:14px;">Kaçırmak da yolculuğun bir parçası.</div>
  </div>
</template>
