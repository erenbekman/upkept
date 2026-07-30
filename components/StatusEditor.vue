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

const sheet = ref<HTMLElement | null>(null)

// ---- Grabbable sheet -------------------------------------------------------
// A bottom sheet you cannot pull down reads as a web page, not an app. The
// entrance keyframe stays (it is not gesture-driven), but a grab cancels it and
// takes over from the *presentation* value, so the sheet can be caught and
// reversed mid-flight instead of finishing first.
const y = ref(0)
const height = ref(0)
const dragging = ref(false)
const progress = computed(() => (height.value ? Math.min(1, Math.max(0, y.value / height.value)) : 0))

const reduced = () => import.meta.client && matchMedia('(prefers-reduced-motion: reduce)').matches
// Wide screens show a centred modal, not a sheet — its transform carries a -50%
// Y centring that dragging would fight.
const isSheet = () => import.meta.client && matchMedia('(max-width: 859px)').matches

let raf = 0
let grabOffset = 0
let hist: { t: number; y: number }[] = []

function liveY(el: HTMLElement): number {
  return new DOMMatrixReadOnly(getComputedStyle(el).transform).m42
}

// Apple's exponential-decay projection, not the v²/2a textbook form.
const project = (v: number, d = 0.998) => (v / 1000) * d / (1 - d)
const rubberband = (over: number, dim: number, c = 0.55) =>
  (over * dim * c) / (dim + c * Math.abs(over))

function spring(target: number, v0: number, zeta: number, response: number, done?: () => void) {
  cancelAnimationFrame(raf)
  const k = (2 * Math.PI / response) ** 2
  const c = 4 * Math.PI * zeta / response
  let x = y.value
  let v = v0
  let last = performance.now()
  const step = (now: number) => {
    const dt = Math.min((now - last) / 1000, 1 / 30)
    last = now
    v += (-k * (x - target) - c * v) * dt
    x += v * dt
    y.value = x
    if (Math.abs(x - target) < 0.5 && Math.abs(v) < 25) {
      y.value = target
      done?.()
      return
    }
    raf = requestAnimationFrame(step)
  }
  raf = requestAnimationFrame(step)
}

// Only the last ~100ms counts. Pointer events stop arriving when the finger
// stops, so an unfiltered history would hand a held-still sheet the velocity it
// had before the pause and throw it off-screen.
function releaseVelocity(): number {
  const now = performance.now()
  const recent = hist.filter(s => now - s.t < 100)
  if (recent.length < 2) return 0
  const a = recent[0]
  const b = recent[recent.length - 1]
  const dt = (b.t - a.t) / 1000
  return dt > 0 ? (b.y - a.y) / dt : 0
}

// Exit mirrors the entrance path — down, the way it came in (§7).
function leave(reason: 'saved' | 'close', v0 = 0) {
  if (reduced() || !isSheet()) return emit(reason)
  height.value = height.value || sheet.value!.getBoundingClientRect().height
  spring(height.value, v0, 1, 0.25, () => emit(reason))
}

function onDown(e: PointerEvent) {
  if (!isSheet() || reduced()) return
  const el = sheet.value!
  cancelAnimationFrame(raf)
  height.value = el.getBoundingClientRect().height
  // Start from the presentation value, so a grab mid-entrance is picked up where
  // the sheet actually is rather than jumping (§3).
  y.value = Math.max(0, liveY(el))
  grabOffset = e.clientY - y.value
  hist = [{ t: performance.now(), y: y.value }]
  dragging.value = true
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
}

function onMove(e: PointerEvent) {
  if (!dragging.value) return
  const raw = e.clientY - grabOffset
  // Above the open position the sheet resists instead of stopping dead (§9).
  y.value = raw >= 0 ? raw : -rubberband(-raw, height.value)
  hist.push({ t: performance.now(), y: y.value })
  if (hist.length > 6) hist.shift()
}

function onUp() {
  if (!dragging.value) return
  dragging.value = false
  const v = releaseVelocity()
  // Land where the throw is going, not where the finger left off (§6). The
  // threshold is capped in pixels: a tall sheet (718px with reasons open) would
  // otherwise demand a 287px pull to dismiss, far past what the gesture implies.
  const threshold = Math.min(height.value * 0.25, 180)
  if (y.value + project(v) > threshold) leave('close', v)
  else spring(0, v, 0.8, 0.3) // carried momentum, so a little bounce is honest
}

const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') leave('close') }

onMounted(async () => {
  // The entrance runs on the same spring as the drag: one owner of transform.
  // A CSS keyframe would keep ownership and silently override the drag.
  const el = sheet.value!
  height.value = el.getBoundingClientRect().height
  if (reduced() || !isSheet()) {
    y.value = 0
  } else {
    y.value = height.value
    spring(0, 0, 0.8, 0.3) // Apple's drawer values
  }

  reasons.value = await entries.listReasons()
  document.addEventListener('keydown', onKey)
  // Focus has to enter the sheet, or a keyboard user is still tabbing the page
  // behind the overlay. Land on a status button, not the day arrow — that's what
  // the sheet is for.
  sheet.value?.querySelector<HTMLElement>('.status-btn')?.focus()
})
onUnmounted(() => {
  document.removeEventListener('keydown', onKey)
  cancelAnimationFrame(raf)
})

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
  <div
    class="overlay overlay-tracked"
    :style="{ opacity: 1 - progress }" @click="leave('close')"
  />
  <div
    ref="sheet" class="sheet" role="dialog" aria-modal="true" :aria-label="habitName"
    :class="{ dragging }" :style="{ '--sheet-y': y + 'px' }"
  >
    <!-- Drag handle: the grabber and the title row. Keeping it off the scrollable
         body means no scroll-vs-drag arbitration is needed at all. -->
    <div
      class="sheet-head"
      @pointerdown="onDown" @pointermove="onMove"
      @pointerup="onUp" @pointercancel="onUp"
    >
      <div class="grabber" />
      <div class="row spread" style="align-items:baseline;">
        <div class="sheet-title">{{ habitName }}</div>
        <span class="saved-flag" :style="{ opacity: saved ? 1 : 0 }">✓ Kaydedildi</span>
      </div>
    </div>

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
        <input type="date" :value="date" :max="todayStr()" @change="onPick" />
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

    <button class="btn btn-primary" style="margin-top:24px; width:100%;" @click="leave('saved')">Bitti</button>
    <button v-if="current" class="clear-link" @click="clear">Kaydı temizle</button>
    <div class="micro" style="margin-top:14px;">Kaçırmak da yolculuğun bir parçası.</div>
  </div>
</template>
