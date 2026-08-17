<script setup lang="ts">
import type { ReasonTag } from '~/composables/useEntries'

const db = useDb()
const reasonsRepo = useReasons()
const backup = useBackup()
const syncApi = useSync()
const { theme, apply: applyTheme } = useTheme()
const { show: toast } = useToast()

const codeInput = ref('')

async function startSync() {
  syncApi.setCode(syncApi.generateCode())
  await syncApi.sync()
  toast('Senkronizasyon başladı ✓')
}
async function linkSync() {
  const c = codeInput.value.trim().toLowerCase()
  if (!c) return
  syncApi.setCode(c)
  codeInput.value = ''
  await syncApi.sync()
  toast('Bağlandı ✓')
}
async function unlinkSync() {
  const ok = await useAsk().confirm({
    title: 'Bağlantı kesilsin mi?',
    message: 'Bu cihazın senkronu durur. Veriler cihazda kalır.',
    okLabel: 'Kes',
    danger: true,
  })
  if (!ok) return
  syncApi.setCode(null)
  toast('Bağlantı kesildi')
}
async function copyCode() {
  if (!syncApi.code.value) return
  await navigator.clipboard.writeText(syncApi.code.value)
  toast('Kod kopyalandı')
}
async function syncNow() {
  const ok = await syncApi.sync()
  if (ok) toast('Güncel ✓')
  else toast('Güncellenemedi — bağlantını kontrol et', true)
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
  toast('Başlangıç tarihi güncellendi')
}

async function addReason() {
  const n = await useAsk().text({ title: 'Yeni etiket', input: 'Örn. yorgundum', okLabel: 'Ekle' })
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
  a.download = `lifebootstrap-yedek-${todayStr()}.json`
  a.click()
  URL.revokeObjectURL(url)
  toast('Yedek dışa aktarıldı ✓')
}

async function onImportFile(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0]
  if (!file) return
  const ok = await useAsk().confirm({
    title: 'Yedek geri yüklensin mi?',
    message: 'Mevcut tüm veri silinip yedekle değiştirilecek.',
    okLabel: 'Geri yükle',
    danger: true,
  })
  if (!ok) {
    if (fileInput.value) fileInput.value.value = ''
    return
  }
  try {
    await backup.importAll(JSON.parse(await file.text()))
    await load()
    toast('İçe aktarıldı ✓')
  } catch (err: any) {
    toast('Hata: ' + (err?.message ?? 'içe aktarılamadı'), true)
  } finally {
    if (fileInput.value) fileInput.value.value = ''
  }
}
</script>

<template>
  <div class="screen">
    <h1 class="title">Ayarlar</h1>
  </div>

  <!-- 24px between sections against 12px inside a field: the gap has to be at
       least double the intra-group one or the sections read as one list. -->
  <div class="screen" style="padding-top:0; display:flex; flex-direction:column; gap:24px;">
    <div>
      <h2 class="eyebrow">Challenge</h2>
      <div class="row spread field">
        <div>
          <div style="font-size:var(--fs-lg); font-weight:600; color:var(--ink2);">Başlangıç tarihi</div>
          <div style="font-size:var(--fs-sm); color:var(--muted); margin-top:2px;">Gün sayacı buradan başlar</div>
        </div>
        <input v-model="startDate" type="date" class="date-pill" aria-label="Challenge başlangıç tarihi" @change="saveStart" />
      </div>
    </div>

    <div>
      <h2 class="eyebrow">Sebep etiketleri</h2>
      <div class="field">
        <div class="chips-wrap">
          <div v-for="r in reasons" :key="r.id" class="chip">
            {{ r.name }}
            <button class="chip-x" :aria-label="`${r.name} etiketini sil`" @click="removeReason(r)">✕</button>
          </div>
          <button class="chip-add" @click="addReason">+ Etiket</button>
        </div>
      </div>
    </div>

    <div>
      <h2 class="eyebrow">Veri</h2>
      <div class="row" style="gap:12px;">
        <button class="btn" style="flex:1;" @click="doExport">↑ Dışa aktar</button>
        <button class="btn" style="flex:1;" @click="fileInput?.click()">↓ İçe aktar</button>
        <input ref="fileInput" type="file" accept="application/json" style="display:none" @change="onImportFile" />
      </div>
    </div>

    <div>
      <h2 class="eyebrow">Senkronizasyon</h2>
      <div class="field" style="display:flex; flex-direction:column; gap:12px;">
        <template v-if="!syncApi.code.value">
          <div style="font-size:var(--fs-sm); color:var(--muted); line-height:1.5;">Cihazlarını login olmadan bağla. Bir cihazda başlat, çıkan kodu diğerlerine gir. En son değişen taraf kazanır.</div>
          <button class="btn btn-primary" @click="startSync">Bu cihazda başlat</button>
          <div style="text-align:center; font-size:var(--fs-xs); color:var(--muted2);">veya</div>
          <div class="row" style="gap:8px;">
            <input
              v-model="codeInput" class="note-area" style="margin-top:0; flex:1;"
              aria-label="Senkron kodu" placeholder="kodu yapıştır"
              autocomplete="off" autocapitalize="off" spellcheck="false"
            />
            <button class="btn" @click="linkSync">Bağla</button>
          </div>
        </template>
        <template v-else>
          <div class="row spread">
            <div>
              <div style="font-size:var(--fs-sm); color:var(--muted);">Senkron kodu</div>
              <div style="font-family:monospace; font-size:var(--fs-xl); font-weight:700; color:var(--ink); letter-spacing:1px;">{{ syncApi.code.value }}</div>
            </div>
            <button class="btn" @click="copyCode">Kopyala</button>
          </div>
          <div style="font-size:var(--fs-xs); color:var(--muted);">
            <span v-if="syncApi.status.value === 'syncing'">Güncelleniyor…</span>
            <span v-else-if="syncApi.status.value === 'error'" style="color:var(--miss-text);">Güncellenemedi — internetini kontrol edip tekrar dene</span>
            <span v-else>Son güncelleme: {{ fmtAgo(syncApi.lastAt.value) }}</span>
          </div>
          <div style="font-size:var(--fs-xs); color:var(--muted); line-height:1.5;">
            Başka bir cihazda işaretleme yaptıysan <b>Şimdi güncelle</b>’ye bas — ya da ekranı aşağı çek. Uygulamayı her açtığında da kendiliğinden güncellenir.
          </div>
          <div class="row" style="gap:12px;">
            <button class="btn btn-primary" style="flex:1;" @click="syncNow">Şimdi güncelle</button>
            <button class="btn" style="flex:1;" @click="unlinkSync">Bağlantıyı kes</button>
          </div>
        </template>
      </div>
    </div>

    <div v-if="isDesktop()">
      <h2 class="eyebrow">Uygulama</h2>
      <div class="row spread field">
        <div>
          <div style="font-size:var(--fs-lg); font-weight:600; color:var(--ink2);">Güncellemeler</div>
          <div style="font-size:var(--fs-sm); color:var(--muted); margin-top:2px;">Açılışta kendiliğinden denetlenir</div>
        </div>
        <button class="btn" :disabled="updater.busy.value" @click="checkUpdate">
          {{ updater.busy.value ? 'Denetleniyor…' : 'Şimdi denetle' }}
        </button>
      </div>
    </div>

    <div>
      <h2 class="eyebrow">Görünüm</h2>
      <div class="row spread field">
        <span style="font-size:var(--fs-lg); font-weight:600; color:var(--ink2);">Tema</span>
        <div class="seg">
          <button :class="{ on: theme === 'light' }" :aria-pressed="theme === 'light'" @click="applyTheme('light')">Açık</button>
          <button :class="{ on: theme === 'dark' }" :aria-pressed="theme === 'dark'" @click="applyTheme('dark')">Koyu</button>
        </div>
      </div>
    </div>

    <div class="micro" style="margin-top:2px;">{{ syncApi.code.value ? 'Verilerin cihazlarında ve bulutta senkron.' : 'Verilerin cihazında kalır.' }}</div>
  </div>
</template>
