<script setup lang="ts">
import type { FillLayer } from '~/composables/useDayFill'

const props = withDefaults(defineProps<{
  text: string
  layers: FillLayer[]
  label: string
  live?: boolean
  flash?: boolean
  slowId?: number | null
  glow?: string
}>(), { live: false, flash: false, slowId: null, glow: 'var(--k-accent)' })

const W = 350
const uid = useId()
const clipId = `kclip-${uid}`

const fs = computed(() => Math.min(300, Math.floor(345 / (Math.max(1, props.text.length) * 0.6))))
const H = computed(() => Math.round(fs.value * 0.8))
const base = computed(() => fs.value * 0.765)
const fullH = computed(() => fs.value * 0.725 + 4)
const spacing = computed(() => `${(-fs.value * 0.06).toFixed(1)}px`)

const amounts = new Map<number, number>()
const paths = ref<{ id: number; d: string; color: string; opacity: number }[]>([])
let phase = 0
let tilt = 0
let tiltTarget = 0
let dragX: number | null = null
let raf = 0
const reduced = import.meta.client && matchMedia('(prefers-reduced-motion: reduce)').matches

function build(animated: boolean) {
  let cum = 0
  const list = props.layers.map((l) => {
    const cur = amounts.get(l.id) ?? (animated ? 0 : l.value)
    cum += cur
    return { l, cum }
  })
  const total = cum
  const slope = Math.tan((tilt * Math.PI) / 180)
  const bottom = H.value + 10
  const out: typeof paths.value = []
  for (let i = list.length - 1; i >= 0; i--) {
    const { l, cum: c } = list[i]
    if (c <= 0.001) continue
    const isTop = out.length === 0
    const amp = !animated ? 0 : isTop ? (total > 0.02 && total < 0.985 ? 3.4 : 0.6) : 1.1
    const yb = base.value + 3 - c * fullH.value
    let d = `M0 ${bottom} L0 `
    for (let x = 0; x <= W; x += 7) {
      const y = yb + slope * (x - W / 2) + Math.sin(x * 0.045 + phase * (isTop ? 1 : 0.6) + i) * amp
      d += (x === 0 ? '' : ` L${x} `) + y.toFixed(1)
    }
    out.push({ id: l.id, d: `${d} L${W} ${bottom} Z`, color: l.color, opacity: l.faded ? 0.35 : 1 })
  }
  paths.value = out
}

function step() {
  for (const l of props.layers) {
    const cur = amounts.get(l.id) ?? 0
    const k = props.slowId === l.id ? 0.055 : 0.12
    amounts.set(l.id, cur + (l.value - cur) * k)
  }
  for (const id of [...amounts.keys()]) if (!props.layers.some(l => l.id === id)) amounts.delete(id)
  tilt += (tiltTarget - tilt) * 0.09
  phase = (phase + 0.045) % (Math.PI * 400)
  build(true)
  raf = requestAnimationFrame(step)
}

function start() {
  cancelAnimationFrame(raf)
  if (props.live && !reduced && !document.hidden) raf = requestAnimationFrame(step)
  else {
    for (const l of props.layers) amounts.set(l.id, l.value)
    build(false)
  }
}

watch(() => props.layers, () => { if (!props.live || reduced) start() }, { deep: true })
watch(() => [props.live, props.text], start)

function onOrient(e: DeviceOrientationEvent) {
  if (dragX === null && typeof e.gamma === 'number') tiltTarget = Math.max(-22, Math.min(22, e.gamma))
}
function onVisibility() { start() }

function onDown(e: PointerEvent) {
  if (!props.live) return
  dragX = e.clientX
}
function onMove(e: PointerEvent) {
  if (dragX === null) return
  tiltTarget = Math.max(-22, Math.min(22, (e.clientX - dragX) * 0.18))
}
function onUp() {
  dragX = null
  tiltTarget = 0
}

onMounted(() => {
  if (!props.live) for (const l of props.layers) amounts.set(l.id, l.value)
  start()
  document.addEventListener('visibilitychange', onVisibility)
  if (props.live) window.addEventListener('deviceorientation', onOrient)
})
onUnmounted(() => {
  cancelAnimationFrame(raf)
  document.removeEventListener('visibilitychange', onVisibility)
  window.removeEventListener('deviceorientation', onOrient)
})
</script>

<template>
  <div
    class="k-number" role="img" :aria-label="label"
    @pointerdown="onDown" @pointermove="onMove" @pointerup="onUp" @pointercancel="onUp" @pointerleave="onUp"
  >
    <svg :viewBox="`0 0 ${W} ${H}`" aria-hidden="true">
      <defs>
        <clipPath :id="clipId">
          <text :x="W / 2" :y="base" text-anchor="middle" :font-size="fs" font-weight="900" :letter-spacing="spacing" style="font-family: var(--k-font)">{{ text }}</text>
        </clipPath>
      </defs>
      <text :x="W / 2" :y="base" text-anchor="middle" :font-size="fs" font-weight="900" :letter-spacing="spacing" fill="var(--k-empty)" style="font-family: var(--k-font)">{{ text }}</text>
      <g :clip-path="`url(#${clipId})`">
        <path v-for="p in paths" :key="p.id" :d="p.d" :fill="p.color" :fill-opacity="p.opacity" />
      </g>
      <text
        v-if="flash" class="k-number-glow" :x="W / 2" :y="base" text-anchor="middle" :font-size="fs" font-weight="900"
        :letter-spacing="spacing" fill="none" :stroke="glow" stroke-width="3" style="font-family: var(--k-font)"
      >{{ text }}</text>
    </svg>
    <slot />
  </div>
</template>

<style scoped>
.k-number-glow { animation: glow 1.1s ease-out both; transform-box: fill-box; transform-origin: center; }
@keyframes glow { 0% { opacity: 0; transform: scale(.96); } 30% { opacity: 1; transform: scale(1.02); } 100% { opacity: 0; transform: scale(1); } }
</style>
