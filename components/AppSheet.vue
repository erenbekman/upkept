<script setup lang="ts">
// The one bottom sheet. It used to be copy-pasted markup in two places, which is
// exactly how the habit editor ended up stranded off-screen: .sheet defaults to
// translate(-50%, 110%) and only the copy that drove --sheet-y ever came back.
//
// Owns entrance, drag, dismissal and the dialog semantics. Parents render the
// title via the #head slot (part of the drag handle) and the body as default.
const props = defineProps<{ label: string }>()
const emit = defineEmits<{ close: [] }>()

const sheet = ref<HTMLElement | null>(null)
const y = ref(0)
const height = ref(0)
const dragging = ref(false)
const progress = computed(() => (height.value ? Math.min(1, Math.max(0, y.value / height.value)) : 0))

const reduced = () => import.meta.client && matchMedia('(prefers-reduced-motion: reduce)').matches
// Wide screens show a centred modal whose transform carries a -50% Y centring
// that dragging would fight.
const isSheet = () => import.meta.client && matchMedia('(max-width: 859px)').matches

let raf = 0
let grabOffset = 0
let hist: { t: number; y: number }[] = []

const liveY = (el: HTMLElement) => new DOMMatrixReadOnly(getComputedStyle(el).transform).m42

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

// Only the last ~100ms counts: pointer events stop arriving when the finger
// stops, so an unfiltered history throws a held-still sheet off-screen.
function releaseVelocity(): number {
  const now = performance.now()
  const recent = hist.filter(s => now - s.t < 100)
  if (recent.length < 2) return 0
  const a = recent[0]
  const b = recent[recent.length - 1]
  const dt = (b.t - a.t) / 1000
  return dt > 0 ? (b.y - a.y) / dt : 0
}

// Exit mirrors the entrance path — down, the way it came in. Awaitable so a
// parent can finish its own work only once the sheet is actually gone.
function dismiss(v0 = 0): Promise<void> {
  return new Promise((resolve) => {
    if (reduced() || !isSheet() || !sheet.value) return resolve()
    height.value = height.value || sheet.value.getBoundingClientRect().height
    spring(height.value, v0, 1, 0.25, resolve)
  })
}

async function requestClose(v0 = 0) {
  await dismiss(v0)
  emit('close')
}

function onDown(e: PointerEvent) {
  if (!isSheet() || reduced() || !sheet.value) return
  cancelAnimationFrame(raf)
  height.value = sheet.value.getBoundingClientRect().height
  // Start from the presentation value so a grab mid-entrance is picked up where
  // the sheet actually is rather than jumping.
  y.value = Math.max(0, liveY(sheet.value))
  grabOffset = e.clientY - y.value
  hist = [{ t: performance.now(), y: y.value }]
  dragging.value = true
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
}

function onMove(e: PointerEvent) {
  if (!dragging.value) return
  const raw = e.clientY - grabOffset
  // Above the open position the sheet resists instead of stopping dead.
  y.value = raw >= 0 ? raw : -rubberband(-raw, height.value)
  hist.push({ t: performance.now(), y: y.value })
  if (hist.length > 6) hist.shift()
}

function onUp() {
  if (!dragging.value) return
  dragging.value = false
  const v = releaseVelocity()
  // Capped in pixels: a tall sheet would otherwise demand a pull far past what
  // the gesture implies.
  const threshold = Math.min(height.value * 0.25, 180)
  if (y.value + project(v) > threshold) requestClose(v)
  else spring(0, v, 0.8, 0.3) // carried momentum, so a little bounce is honest
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

// Focus reached the sheet but nothing held it: nine Tabs walked straight out into
// the tab bar behind the overlay, and Escape then returned focus to whatever link
// it had landed on rather than the row that opened the sheet.
function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape') return requestClose()
  if (e.key !== 'Tab' || !sheet.value) return
  const items = [...sheet.value.querySelectorAll<HTMLElement>(FOCUSABLE)]
    .filter(el => el.offsetParent !== null)
  if (!items.length) return
  const first = items[0]
  const last = items[items.length - 1]
  const active = document.activeElement
  if (e.shiftKey && (active === first || !sheet.value.contains(active))) {
    e.preventDefault(); last.focus()
  } else if (!e.shiftKey && active === last) {
    e.preventDefault(); first.focus()
  }
}

let returnTo: HTMLElement | null = null

onMounted(() => {
  const el = sheet.value!
  returnTo = document.activeElement as HTMLElement | null
  height.value = el.getBoundingClientRect().height
  if (reduced() || !isSheet()) {
    y.value = 0
  } else {
    y.value = height.value
    spring(0, 0, 0.8, 0.3) // Apple's drawer values
  }
  document.addEventListener('keydown', onKey)
  // Focus must enter the sheet or a keyboard user keeps tabbing the page behind
  // the overlay.
  el.querySelector<HTMLElement>('input, button, textarea')?.focus()
})
onUnmounted(() => {
  document.removeEventListener('keydown', onKey)
  cancelAnimationFrame(raf)
  // Back to the control that opened it, not wherever Tab wandered.
  returnTo?.focus?.()
})

defineExpose({ dismiss })
</script>

<template>
  <div class="overlay overlay-tracked" :style="{ opacity: 1 - progress }" @click="requestClose()" />
  <div
    ref="sheet" class="sheet" role="dialog" aria-modal="true" :aria-label="props.label"
    :class="{ dragging }" :style="{ '--sheet-y': y + 'px' }"
  >
    <!-- Drag handle: grabber + whatever the parent puts in #head. Keeping it off
         the scrollable body means no scroll-vs-drag arbitration is needed. -->
    <div
      class="sheet-head"
      @pointerdown="onDown" @pointermove="onMove"
      @pointerup="onUp" @pointercancel="onUp"
    >
      <div class="grabber" />
      <slot name="head" />
    </div>
    <slot />
  </div>
</template>
