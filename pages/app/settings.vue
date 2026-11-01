<script setup lang="ts">
import type { Habit } from '~/composables/useHabits'
import type { ReasonTag } from '~/composables/useEntries'

const db = useDb()
const habitsRepo = useHabits()
const entriesRepo = useEntries()
const reasonsRepo = useReasons()
const backup = useBackup()
const syncApi = useSync()
const { pref, apply: applyTheme, accent, accentHex, applyAccent, mono, setMono } = useTheme()
const { locale, setLocale } = useLocale()
const reminder = useReminder()
const updater = useUpdater()
const { show: toast } = useToast()
const native = useTabBar().enabled

const today = todayStr()
const startDate = ref('')
const counterOn = ref(true)
const habits = ref<Habit[]>([])
const archivedCount = ref(0)
const reasons = ref<ReasonTag[]>([])
const todayFraction = ref(0)
const hapticsOn = ref(true)
const reminderAt = ref(reminder.time.value ?? DEFAULT_REMINDER)
const codeInput = ref('')
const fileInput = ref<HTMLInputElement | null>(null)

async function load() {
  startDate.value = (await db.getMeta('challenge_start_date')) ?? today
  counterOn.value = (await db.getMeta('day_counter')) !== '0'
  habits.value = await habitsRepo.listActive()
  archivedCount.value = (await habitsRepo.listArchived()).length
  reasons.value = await reasonsRepo.list()
  todayFraction.value = dayFraction(habits.value, await entriesRepo.getForDate(today), today) ?? 0
  hapticsOn.value = hapticsEnabled()
}
onMounted(load)
watch(syncApi.dataVersion, load)

const dayNo = computed(() => challengeDay(startDate.value || today, today) ?? 1)
const heroNum = computed(() => String(counterOn.value ? dayNo.value : Number(today.slice(8))))
const heroGrad = computed(() => fillGradient(todayFraction.value, accentHex.value, 'var(--k-empty)', 8, 80))

async function toggleCounter() {
  counterOn.value = !counterOn.value
  haptic()
  await db.setMeta('day_counter', counterOn.value ? '1' : '0')
}
async function saveStart() {
  if (!startDate.value || startDate.value > today) startDate.value = today
  await db.setMeta('challenge_start_date', startDate.value)
  toast(t('settings.startDateSaved'))
}

function toggleHaptics() {
  hapticsOn.value = !hapticsOn.value
  localStorage.setItem('haptics', hapticsOn.value ? '1' : '0')
  haptic()
}

function habitSub(h: Habit) {
  const W = 0b0111110
  const E = 0b1000001
  const days = !h.days ? t('habit.plan.all') : h.days === W ? t('habit.plan.weekdays') : h.days === E ? t('habit.plan.weekends') : t('habit.plan.custom')
  return [h.kind === 'quit' ? t('habits.kindQuit') : '', days, h.goal && h.kind !== 'quit' ? `${fmtAmount(h.goal)}${h.unit ? ` ${h.unit}` : ''}` : '', h.group_name ?? ''].filter(Boolean).join(' · ')
}

const drag = ref<{ from: number; to: number; dy: number } | null>(null)
const settling = ref(false)
let startY = 0
let rowStep = 0

function onGrab(e: PointerEvent, i: number) {
  const handle = e.currentTarget as HTMLElement
  rowStep = (handle.closest('.k-reorder') as HTMLElement).offsetHeight
  startY = e.clientY
  handle.setPointerCapture(e.pointerId)
  drag.value = { from: i, to: i, dy: 0 }
  haptic()
}
function onDrag(e: PointerEvent) {
  const d = drag.value
  if (!d) return
  const last = habits.value.length - 1
  const dy = Math.min(Math.max(e.clientY - startY, -d.from * rowStep), (last - d.from) * rowStep)
  const to = d.from + Math.round(dy / rowStep)
  if (to !== d.to) haptic()
  drag.value = { ...d, dy, to }
}
async function onDrop() {
  const d = drag.value
  if (!d) return
  settling.value = true
  drag.value = null
  if (d.from !== d.to) {
    const list = [...habits.value]
    list.splice(d.to, 0, ...list.splice(d.from, 1))
    habits.value = list
    requestAnimationFrame(() => requestAnimationFrame(() => { settling.value = false }))
    for (const [i, h] of list.entries()) await habitsRepo.reorder(h.id, i)
  } else {
    requestAnimationFrame(() => { settling.value = false })
  }
}
function rowStyle(i: number) {
  const d = drag.value
  if (!d) return undefined
  if (i === d.from) return { transform: `translateY(${d.dy}px)` }
  if (d.from < d.to && i > d.from && i <= d.to) return { transform: `translateY(${-rowStep}px)` }
  if (d.from > d.to && i < d.from && i >= d.to) return { transform: `translateY(${rowStep}px)` }
  return undefined
}
async function onHandleKey(e: KeyboardEvent, i: number) {
  const dir = e.key === 'ArrowUp' ? -1 : e.key === 'ArrowDown' ? 1 : 0
  if (!dir || !habits.value[i + dir]) return
  e.preventDefault()
  const list = [...habits.value]
  list.splice(i + dir, 0, ...list.splice(i, 1))
  habits.value = list
  for (const [j, h] of list.entries()) await habitsRepo.reorder(h.id, j)
}

async function setReminder(on: boolean) {
  haptic()
  if (!on) {
    await reminder.disable()
    toast(t('reminder.off'))
    return
  }
  if (await reminder.enable(reminderAt.value)) toast(t('reminder.set', { time: reminderAt.value }))
  else toast(t('reminder.denied'), true)
}
async function changeReminderTime() {
  if (reminder.time.value) await setReminder(true)
}

async function addReason() {
  const n = await useAsk().text({ title: t('settings.newReason'), input: t('settings.newReasonInput'), okLabel: t('settings.add') })
  if (!n?.trim()) return
  await reasonsRepo.create(n.trim())
  reasons.value = await reasonsRepo.list()
}
async function removeReason(r: ReasonTag) {
  await reasonsRepo.remove(r.id)
  reasons.value = await reasonsRepo.list()
}

async function startSync() {
  syncApi.setCode(syncApi.generateCode())
  await syncApi.sync()
  toast(t('settings.syncStarted'))
}
async function linkSync() {
  const c = codeInput.value.trim().toLowerCase()
  if (!c) return
  syncApi.setCode(c)
  codeInput.value = ''
  await syncApi.sync()
  toast(t('settings.linked'))
}
async function unlinkSync() {
  const ok = await useAsk().confirm({ title: t('settings.unlinkTitle'), message: t('settings.unlinkText'), okLabel: t('settings.unlinkOk'), danger: true })
  if (!ok) return
  syncApi.setCode(null)
  toast(t('settings.unlinked'))
}
async function copyCode() {
  if (!syncApi.code.value) return
  await navigator.clipboard.writeText(syncApi.code.value)
  toast(t('settings.copied'))
}
async function syncNow() {
  const ok = await syncApi.sync()
  if (ok) toast(t('common.upToDate'))
  else toast(t('common.syncFailed'), true)
}

async function doExport() {
  const data = await backup.exportAll()
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${t('settings.exportFile')}-${today}.json`
  a.click()
  URL.revokeObjectURL(url)
  toast(t('settings.exported'))
}
async function onImportFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const ok = await useAsk().confirm({ title: t('settings.importTitle'), message: t('settings.importText'), okLabel: t('settings.importOk'), danger: true })
  if (ok) {
    try {
      await backup.importAll(JSON.parse(await file.text()))
      await load()
      toast(t('settings.imported'))
    } catch (err: any) {
      toast(t('settings.importError', { msg: err?.message ?? t('settings.importFailed') }), true)
    }
  }
  if (fileInput.value) fileInput.value.value = ''
}
async function checkUpdate() {
  const msg = await updater.check(true)
  if (msg) toast(msg)
}

const syncStatus = computed(() => {
  if (syncApi.status.value === 'syncing') return t('common.syncing')
  if (syncApi.status.value === 'error') return t('settings.syncErrorLong')
  if (syncApi.status.value === 'outdated') return t('settings.syncOutdatedLong')
  return fmtAgo(syncApi.lastAt.value)
})
const privacyPath = computed(() => (locale.value === 'en' ? '/privacy' : '/gizlilik'))
</script>

<template>
  <div class="k-page">
    <div class="k-head"><h1 class="k-large">{{ t('settings.title') }}</h1></div>

    <div class="k-stack" style="padding-top:18px;">
      <div class="k-hero">
        <span class="k-fill-text" aria-hidden="true" style="font-size:78px; line-height:0.9;" :style="{ backgroundImage: heroGrad }">{{ heroNum }}</span>
        <span class="k-hero-text">
          <b style="font-size:16px;">{{ counterOn ? t('today.dayN', { n: dayNo }) : t('today.monthDay', { date: fmtShort(today) }) }}</b>
          <span>{{ counterOn ? t('settings.counterSince', { date: fmtShort(startDate || today) }) : t('settings.counterMonth') }}</span>
        </span>
      </div>

      <section>
        <h2 class="k-eyebrow">{{ t('settings.homeNumber') }}</h2>
        <div class="k-group">
          <div class="k-row">
            <span>{{ t('settings.challenge') }}</span>
            <button type="button" role="switch" class="k-switch" :class="{ on: counterOn }" :aria-checked="counterOn" :aria-label="t('settings.challenge')" @click="toggleCounter"><span /></button>
          </div>
          <div class="k-row">
            <span :style="{ opacity: counterOn ? 1 : 0.4 }">{{ t('settings.startDate') }}</span>
            <label class="k-pill-input k-date-pill" :style="{ opacity: counterOn ? 1 : 0.4 }">
              <span aria-hidden="true">{{ fmtDate(startDate || today) }}</span>
              <input v-model="startDate" type="date" :max="today" :disabled="!counterOn" :aria-label="t('settings.startDateLabel')" @change="saveStart" />
            </label>
          </div>
        </div>
        <p class="k-foot">{{ counterOn ? t('settings.counterFoot') : t('settings.counterOffFoot') }}</p>
      </section>

      <section>
        <h2 class="k-eyebrow">{{ t('habits.title') }}</h2>
        <div class="k-group" :class="{ 'k-settling': settling }">
          <div v-for="(h, i) in habits" :key="h.id" class="k-row tall k-reorder" :class="{ dragging: drag?.from === i }" :style="rowStyle(i)">
            <button
              class="k-drag" data-no-ptr :aria-label="t('habits.reorder', { name: h.name })"
              @pointerdown.prevent="onGrab($event, i)" @pointermove="onDrag" @pointerup="onDrop" @pointercancel="onDrop" @keydown="onHandleKey($event, i)"
            >
              <svg viewBox="0 0 14 20" aria-hidden="true"><circle v-for="p in [[4, 4], [10, 4], [4, 10], [10, 10], [4, 16], [10, 16]]" :key="p.join()" :cx="p[0]" :cy="p[1]" r="1.6" /></svg>
            </button>
            <NuxtLink :to="`/app/habit/${h.id}`" style="display:flex; align-items:center; gap:12px; flex:1; min-width:0; color:inherit; text-decoration:none; align-self:stretch;" :aria-label="t('habits.edit', { name: h.name })">
              <span class="k-dot" style="width:12px; height:12px; border-radius:6px;" :style="{ background: h.color || 'var(--k-accent)' }" />
              <span class="k-row-label">
                <span style="font-weight:600;">{{ h.name }}</span>
                <small>{{ habitSub(h) }}</small>
              </span>
              <svg class="k-chev" viewBox="0 0 8 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1.5 1.5L6.5 7l-5 5.5" /></svg>
            </NuxtLink>
          </div>
          <NuxtLink to="/app/habit/new" class="k-row accent" style="justify-content:flex-start;">
            <span aria-hidden="true" style="font-size:20px; width:14px;">+</span>{{ t('habits.newLabel') }}
          </NuxtLink>
          <NuxtLink to="/app/archive" class="k-row">
            <span>{{ t('habits.archive') }}</span>
            <span class="k-row-value">{{ archivedCount }}<svg class="k-chev" viewBox="0 0 8 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1.5 1.5L6.5 7l-5 5.5" /></svg></span>
          </NuxtLink>
        </div>
        <p class="k-foot">{{ t('settings.habitsFoot') }}</p>
      </section>

      <section>
        <h2 class="k-eyebrow">{{ t('settings.appearance') }}</h2>
        <div class="k-group">
          <div class="k-row">
            <span>{{ t('settings.theme') }}</span>
            <div class="k-seg" role="radiogroup" :aria-label="t('settings.theme')">
              <button v-for="th in (['light', 'dark', 'auto'] as const)" :key="th" role="radio" :class="{ on: pref === th }" :aria-checked="pref === th" @click="applyTheme(th); haptic()">{{ t(`settings.${th}`) }}</button>
            </div>
          </div>
          <div class="k-row" style="min-height:62px;">
            <span>{{ t('settings.accent') }}</span>
            <div role="radiogroup" :aria-label="t('settings.accent')" style="display:flex; gap:8px;">
              <button
                v-for="a in ACCENTS" :key="a.id" role="radio" class="k-swatch" :class="{ on: accent === a.id }" :aria-checked="accent === a.id"
                :aria-label="t(`settings.accents.${a.id}`)" :style="{ width: '28px', height: '28px', background: a.id === 'ink' ? 'var(--k-ink)' : a.hex, '--k-swatch': a.id === 'ink' ? 'var(--k-ink)' : a.hex }"
                @click="applyAccent(a.id); haptic()"
              />
            </div>
          </div>
          <div class="k-row tall">
            <span class="k-row-label">
              <span>{{ t('settings.mono') }}</span>
              <small style="white-space:normal;">{{ t('settings.monoSub') }}</small>
            </span>
            <button type="button" role="switch" class="k-switch" :class="{ on: mono }" :aria-checked="mono" :aria-label="t('settings.mono')" @click="setMono(!mono); haptic()"><span /></button>
          </div>
          <div v-if="native" class="k-row">
            <span>{{ t('settings.haptics') }}</span>
            <button type="button" role="switch" class="k-switch" :class="{ on: hapticsOn }" :aria-checked="hapticsOn" :aria-label="t('settings.haptics')" @click="toggleHaptics"><span /></button>
          </div>
          <div class="k-row">
            <span>{{ t('settings.language') }}</span>
            <div class="k-seg" role="radiogroup" :aria-label="t('settings.language')">
              <button v-for="l in LOCALES" :key="l.code" role="radio" :lang="l.code" :class="{ on: locale === l.code }" :aria-checked="locale === l.code" @click="setLocale(l.code); haptic()">{{ l.label }}</button>
            </div>
          </div>
        </div>
      </section>

      <section v-if="reminder.supported">
        <h2 class="k-eyebrow">{{ t('reminder.section') }}</h2>
        <div class="k-group">
          <div class="k-row">
            <span>{{ t('reminder.label') }}</span>
            <button type="button" role="switch" class="k-switch" :class="{ on: !!reminder.time.value }" :aria-checked="!!reminder.time.value" :aria-label="t('reminder.label')" @click="setReminder(!reminder.time.value)"><span /></button>
          </div>
          <div class="k-row">
            <span :style="{ opacity: reminder.time.value ? 1 : 0.4 }">{{ t('reminder.time') }}</span>
            <input v-model="reminderAt" type="time" class="k-pill-input" :disabled="!reminder.time.value" :style="{ opacity: reminder.time.value ? 1 : 0.4 }" :aria-label="t('reminder.time')" @change="changeReminderTime" />
          </div>
        </div>
        <p class="k-foot">{{ t('settings.reminderFoot') }}</p>
      </section>

      <section>
        <h2 class="k-eyebrow">{{ t('settings.reasons') }}</h2>
        <div class="k-group" style="padding:14px 16px;">
          <div class="k-chips">
            <span v-for="r in reasons" :key="r.id" class="k-chip" style="cursor:default;">
              {{ r.name }}
              <button class="k-chip-x" :aria-label="t('settings.removeReason', { name: r.name })" @click="removeReason(r)">✕</button>
            </span>
            <button class="k-chip dashed" @click="addReason">{{ t('settings.addReason') }}</button>
          </div>
        </div>
        <p class="k-foot">{{ t('settings.reasonsFoot') }}</p>
      </section>

      <section>
        <h2 class="k-eyebrow">{{ t('settings.sync') }}</h2>
        <div v-if="!syncApi.code.value" class="k-group">
          <button class="k-row accent" @click="startSync">
            <span>{{ t('settings.syncStart') }}</span>
            <svg class="k-chev" viewBox="0 0 8 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1.5 1.5L6.5 7l-5 5.5" /></svg>
          </button>
          <div class="k-row">
            <input
              v-model="codeInput" class="k-input soft" style="height:38px; font-size:15px; flex:1;" :aria-label="t('settings.codeLabel')"
              :placeholder="t('settings.codePlaceholder')" autocomplete="off" autocapitalize="off" spellcheck="false" @keydown.enter="linkSync"
            />
            <button class="k-btn small" :disabled="!codeInput.trim()" @click="linkSync">{{ t('settings.link') }}</button>
          </div>
        </div>
        <div v-else class="k-group">
          <div class="k-row tall">
            <span class="k-row-label">
              <small>{{ t('settings.codeLabel') }}</small>
              <span style="font-size:18px; font-weight:750; letter-spacing:0.06em; font-family:ui-monospace, 'SF Mono', Menlo, monospace;">{{ syncApi.code.value }}</span>
            </span>
            <button class="k-link" style="color:var(--k-accent-ink); padding:8px 0;" @click="copyCode">{{ t('settings.copy') }}</button>
          </div>
          <button class="k-row" @click="syncNow">
            <span>{{ t('settings.syncNow') }}</span>
            <span class="k-row-value" style="font-size:13px; max-width:55%; text-align:right;">{{ syncStatus }}</span>
          </button>
          <button class="k-row danger" @click="unlinkSync">{{ t('settings.unlink') }}</button>
        </div>
        <p class="k-foot">{{ syncApi.code.value ? t('settings.syncHelp') : t('settings.syncIntro') }}</p>
      </section>

      <section>
        <h2 class="k-eyebrow">{{ t('settings.data') }}</h2>
        <div class="k-group">
          <button class="k-row" @click="doExport"><span>{{ t('settings.export') }}</span><span class="k-row-value" style="font-size:13px;">.json</span></button>
          <button class="k-row" @click="fileInput?.click()"><span>{{ t('settings.import') }}</span></button>
          <input ref="fileInput" type="file" accept="application/json" style="display:none" @change="onImportFile" />
        </div>
      </section>

      <section>
        <div class="k-group">
          <button v-if="isDesktop()" class="k-row" :disabled="updater.busy.value" @click="checkUpdate">
            <span>{{ updater.busy.value ? t('settings.checking') : t('settings.checkNow') }}</span>
          </button>
          <NuxtLink :to="privacyPath" class="k-row">
            <span>{{ t('settings.privacy') }}</span>
            <svg class="k-chev" viewBox="0 0 8 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1.5 1.5L6.5 7l-5 5.5" /></svg>
          </NuxtLink>
        </div>
        <p class="k-foot" style="text-align:center; padding-top:14px;">{{ syncApi.code.value ? t('settings.footerSynced') : t('settings.footerLocal') }}</p>
      </section>
    </div>
  </div>
</template>
