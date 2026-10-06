<script setup lang="ts">
import type { ReasonTag } from '~/composables/useEntries'

const db = useDb()
const reasonsRepo = useReasons()
const backup = useBackup()
const syncApi = useSync()
const { theme, apply: applyTheme, palette, applyPalette } = useTheme()
const { locale, setLocale } = useLocale()
const reminder = useReminder()
const reminderAt = ref(reminder.time.value ?? DEFAULT_REMINDER)

async function setReminder(on: boolean) {
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
const { show: toast } = useToast()

const codeInput = ref('')

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
  const ok = await useAsk().confirm({
    title: t('settings.unlinkTitle'),
    message: t('settings.unlinkText'),
    okLabel: t('settings.unlinkOk'),
    danger: true,
  })
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

const updater = useUpdater()
async function checkUpdate() {
  const msg = await updater.check(true)
  if (msg) toast(msg)
}

const startDate = ref('')
const reasons = ref<ReasonTag[]>([])
const fileInput = ref<HTMLInputElement | null>(null)

async function load() {
  startDate.value = (await db.getMeta('challenge_start_date')) ?? todayStr()
  reasons.value = await reasonsRepo.list()
}
onMounted(load)
watch(syncApi.dataVersion, load)

async function saveStart() {
  await db.setMeta('challenge_start_date', startDate.value)
  toast(t('settings.startDateSaved'))
}

async function addReason() {
  const n = await useAsk().text({ title: t('settings.newReason'), input: t('settings.newReasonInput'), okLabel: t('settings.add') })
  if (!n) return
  await reasonsRepo.create(n)
  reasons.value = await reasonsRepo.list()
}

async function removeReason(r: ReasonTag) {
  await reasonsRepo.remove(r.id)
  reasons.value = await reasonsRepo.list()
}

async function doExport() {
  const data = await backup.exportAll()
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${t('settings.exportFile')}-${todayStr()}.json`
  a.click()
  URL.revokeObjectURL(url)
  toast(t('settings.exported'))
}

async function onImportFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const ok = await useAsk().confirm({
    title: t('settings.importTitle'),
    message: t('settings.importText'),
    okLabel: t('settings.importOk'),
    danger: true,
  })
  if (!ok) {
    if (fileInput.value) fileInput.value.value = ''
    return
  }
  try {
    await backup.importAll(JSON.parse(await file.text()))
    await load()
    toast(t('settings.imported'))
  } catch (err: any) {
    toast(t('settings.importError', { msg: err?.message ?? t('settings.importFailed') }), true)
  } finally {
    if (fileInput.value) fileInput.value.value = ''
  }
}
</script>

<template>
  <div class="screen">
    <h1 class="title">{{ t('settings.title') }}</h1>
  </div>

  <!-- 24px between sections against 12px inside a field: the gap has to be at
       least double the intra-group one or the sections read as one list. -->
  <div class="screen" style="padding-top:0; display:flex; flex-direction:column; gap:24px;">
    <div>
      <h2 class="eyebrow">{{ t('settings.challenge') }}</h2>
      <div class="row spread field">
        <div>
          <div style="font-size:var(--fs-lg); font-weight:600; color:var(--ink2);">{{ t('settings.startDate') }}</div>
          <div style="font-size:var(--fs-sm); color:var(--muted); margin-top:2px;">{{ t('settings.startDateSub') }}</div>
        </div>
        <input v-model="startDate" type="date" class="date-pill" :aria-label="t('settings.startDateLabel')" @change="saveStart" />
      </div>
    </div>

    <div>
      <h2 class="eyebrow">{{ t('settings.reasons') }}</h2>
      <div class="field">
        <div class="chips-wrap">
          <div v-for="r in reasons" :key="r.id" class="chip">
            {{ r.name }}
            <button class="chip-x" :aria-label="t('settings.removeReason', { name: r.name })" @click="removeReason(r)">✕</button>
          </div>
          <button class="chip-add" @click="addReason">{{ t('settings.addReason') }}</button>
        </div>
      </div>
    </div>

    <div>
      <h2 class="eyebrow">{{ t('settings.data') }}</h2>
      <div class="row" style="gap:12px;">
        <button class="btn" style="flex:1;" @click="doExport">{{ t('settings.export') }}</button>
        <button class="btn" style="flex:1;" @click="fileInput?.click()">{{ t('settings.import') }}</button>
        <input ref="fileInput" type="file" accept="application/json" style="display:none" @change="onImportFile" />
      </div>
    </div>

    <div>
      <h2 class="eyebrow">{{ t('settings.sync') }}</h2>
      <div class="field" style="display:flex; flex-direction:column; gap:12px;">
        <template v-if="!syncApi.code.value">
          <div style="font-size:var(--fs-sm); color:var(--muted); line-height:1.5;">{{ t('settings.syncIntro') }}</div>
          <button class="btn btn-primary" @click="startSync">{{ t('settings.syncStart') }}</button>
          <div style="text-align:center; font-size:var(--fs-xs); color:var(--muted2);">{{ t('settings.or') }}</div>
          <div class="row" style="gap:8px;">
            <input
              v-model="codeInput" class="note-area" style="margin-top:0; flex:1;"
              :aria-label="t('settings.codeLabel')" :placeholder="t('settings.codePlaceholder')"
              autocomplete="off" autocapitalize="off" spellcheck="false"
            />
            <button class="btn" @click="linkSync">{{ t('settings.link') }}</button>
          </div>
        </template>
        <template v-else>
          <div class="row spread">
            <div>
              <div style="font-size:var(--fs-sm); color:var(--muted);">{{ t('settings.codeLabel') }}</div>
              <div style="font-family:monospace; font-size:var(--fs-xl); font-weight:700; color:var(--ink); letter-spacing:1px;">{{ syncApi.code.value }}</div>
            </div>
            <button class="btn" @click="copyCode">{{ t('settings.copy') }}</button>
          </div>
          <div style="font-size:var(--fs-xs); color:var(--muted);">
            <span v-if="syncApi.status.value === 'syncing'">{{ t('common.syncing') }}</span>
            <span v-else-if="syncApi.status.value === 'error'" style="color:var(--miss-text);">{{ t('settings.syncErrorLong') }}</span>
            <span v-else>{{ t('settings.lastSync', { ago: fmtAgo(syncApi.lastAt.value) }) }}</span>
          </div>
          <div style="font-size:var(--fs-xs); color:var(--muted); line-height:1.5;">
            {{ t('settings.syncHelp') }}
          </div>
          <div class="row" style="gap:12px;">
            <button class="btn btn-primary" style="flex:1;" @click="syncNow">{{ t('settings.syncNow') }}</button>
            <button class="btn" style="flex:1;" @click="unlinkSync">{{ t('settings.unlink') }}</button>
          </div>
        </template>
      </div>
    </div>

    <div v-if="reminder.supported">
      <h2 class="eyebrow">{{ t('reminder.section') }}</h2>
      <div class="field" style="display:flex; flex-direction:column; gap:12px;">
        <div class="row spread">
          <div>
            <div style="font-size:var(--fs-lg); font-weight:600; color:var(--ink2);">{{ t('reminder.label') }}</div>
            <div style="font-size:var(--fs-sm); color:var(--muted); margin-top:2px;">{{ t('reminder.sub') }}</div>
          </div>
          <div class="seg">
            <button :class="{ on: !reminder.time.value }" :aria-pressed="!reminder.time.value" @click="setReminder(false)">{{ t('settings.off') }}</button>
            <button :class="{ on: !!reminder.time.value }" :aria-pressed="!!reminder.time.value" @click="setReminder(true)">{{ t('settings.on') }}</button>
          </div>
        </div>
        <input
          v-if="reminder.time.value" v-model="reminderAt" type="time" class="date-pill" style="align-self:flex-start;"
          :aria-label="t('reminder.time')" @change="changeReminderTime"
        />
      </div>
    </div>

    <div v-if="isDesktop()">
      <h2 class="eyebrow">{{ t('settings.app') }}</h2>
      <div class="row spread field">
        <div>
          <div style="font-size:var(--fs-lg); font-weight:600; color:var(--ink2);">{{ t('settings.updates') }}</div>
          <div style="font-size:var(--fs-sm); color:var(--muted); margin-top:2px;">{{ t('settings.updatesSub') }}</div>
        </div>
        <button class="btn" :disabled="updater.busy.value" @click="checkUpdate">
          {{ updater.busy.value ? t('settings.checking') : t('settings.checkNow') }}
        </button>
      </div>
    </div>

    <div>
      <h2 class="eyebrow">{{ t('settings.appearance') }}</h2>
      <div class="row spread field">
        <span style="font-size:var(--fs-lg); font-weight:600; color:var(--ink2);">{{ t('settings.theme') }}</span>
        <div class="seg">
          <button :class="{ on: theme === 'light' }" :aria-pressed="theme === 'light'" @click="applyTheme('light')">{{ t('settings.light') }}</button>
          <button :class="{ on: theme === 'dark' }" :aria-pressed="theme === 'dark'" @click="applyTheme('dark')">{{ t('settings.dark') }}</button>
        </div>
      </div>
      <div class="field" style="margin-top:12px;">
        <div style="font-size:var(--fs-lg); font-weight:600; color:var(--ink2);">{{ t('settings.palette') }}</div>
        <div style="font-size:var(--fs-sm); color:var(--muted); margin:2px 0 12px;">{{ t('settings.paletteSub') }}</div>
        <div class="palette-grid">
          <button
            v-for="pal in PALETTES" :key="pal.id"
            class="palette-opt" :class="{ on: palette === pal.id }" :aria-pressed="palette === pal.id"
            @click="applyPalette(pal.id)"
          >
            <span class="palette-strip" aria-hidden="true">
              <span v-for="c in pal.swatch" :key="c" :style="{ background: c }" />
            </span>
            <span class="palette-name">{{ t(`palettes.${pal.id}`) }}</span>
          </button>
        </div>
      </div>
      <div class="row spread field" style="margin-top:12px;">
        <span style="font-size:var(--fs-lg); font-weight:600; color:var(--ink2);">{{ t('settings.language') }}</span>
        <div class="seg">
          <button
            v-for="l in LOCALES" :key="l.code" :lang="l.code"
            :class="{ on: locale === l.code }" :aria-pressed="locale === l.code"
            @click="setLocale(l.code)"
          >{{ l.label }}</button>
        </div>
      </div>
    </div>

    <div class="micro" style="margin-top:2px;">{{ syncApi.code.value ? t('settings.footerSynced') : t('settings.footerLocal') }}</div>
  </div>
</template>
