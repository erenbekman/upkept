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
function unlinkSync() {
  if (!confirm('Bu cihazın senkron bağlantısı kesilsin mi? Veriler cihazda kalır.')) return
  syncApi.setCode(null)
  toast('Bağlantı kesildi')
}
async function copyCode() {
  if (!syncApi.code.value) return
  await navigator.clipboard.writeText(syncApi.code.value)
  toast('Kod kopyalandı')
}
async function syncNow() {
  toast((await syncApi.sync()) ? 'Senkronize edildi ✓' : 'Senkron hatası')
}

const startDate = ref('')
const reasons = ref<ReasonTag[]>([])
const fileInput = ref<HTMLInputElement | null>(null)

async function load() {
  startDate.value = (await db.getMeta('challenge_start_date')) ?? todayStr()
  reasons.value = await reasonsRepo.list()
}
onMounted(load)

async function saveStart() {
  await db.setMeta('challenge_start_date', startDate.value)
  toast('Başlangıç tarihi güncellendi')
}

async function addReason() {
  const n = prompt('Yeni etiket')?.trim()
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
  if (!confirm('Mevcut tüm veri silinip yedekle değiştirilecek. Emin misin?')) {
    if (fileInput.value) fileInput.value.value = ''
    return
  }
  try {
    await backup.importAll(JSON.parse(await file.text()))
    await load()
    toast('İçe aktarıldı ✓')
  } catch (err: any) {
    alert('Hata: ' + (err?.message ?? 'içe aktarılamadı'))
  } finally {
    if (fileInput.value) fileInput.value.value = ''
  }
}
</script>

<template>
  <div class="screen">
    <div class="title">Ayarlar</div>
  </div>

  <div class="screen" style="padding-top:0; display:flex; flex-direction:column; gap:18px;">
    <div>
      <div class="eyebrow">Challenge</div>
      <div class="row spread field">
        <div>
          <div style="font-size:15.5px; font-weight:600; color:var(--ink2);">Başlangıç tarihi</div>
          <div style="font-size:13px; color:var(--muted); margin-top:2px;">Gün sayacı buradan başlar</div>
        </div>
        <input v-model="startDate" type="date" class="date-pill" @change="saveStart" />
      </div>
    </div>

    <div>
      <div class="eyebrow">Sebep etiketleri</div>
      <div class="field">
        <div class="chips-wrap">
          <div v-for="r in reasons" :key="r.id" class="chip">
            {{ r.name }}
            <button class="chip-x" @click="removeReason(r)">✕</button>
          </div>
          <button class="chip-add" @click="addReason">+ Etiket</button>
        </div>
      </div>
    </div>

    <div>
      <div class="eyebrow">Veri</div>
      <div class="row" style="gap:12px;">
        <button class="btn" style="flex:1;" @click="doExport">↑ Dışa aktar</button>
        <button class="btn" style="flex:1;" @click="fileInput?.click()">↓ İçe aktar</button>
        <input ref="fileInput" type="file" accept="application/json" style="display:none" @change="onImportFile" />
      </div>
    </div>

    <div>
      <div class="eyebrow">Senkronizasyon</div>
      <div class="field" style="display:flex; flex-direction:column; gap:12px;">
        <template v-if="!syncApi.code.value">
          <div style="font-size:13px; color:var(--muted); line-height:1.5;">Cihazlarını login olmadan bağla. Bir cihazda başlat, çıkan kodu diğerlerine gir. En son değişen taraf kazanır.</div>
          <button class="btn btn-primary" @click="startSync">Bu cihazda başlat</button>
          <div style="text-align:center; font-size:12px; color:var(--muted2);">veya</div>
          <div class="row" style="gap:8px;">
            <input v-model="codeInput" class="note-area" style="margin-top:0; flex:1;" placeholder="kodu yapıştır" />
            <button class="btn" @click="linkSync">Bağla</button>
          </div>
        </template>
        <template v-else>
          <div class="row spread">
            <div>
              <div style="font-size:13px; color:var(--muted);">Senkron kodu</div>
              <div style="font-family:monospace; font-size:18px; font-weight:700; color:var(--ink); letter-spacing:1px;">{{ syncApi.code.value }}</div>
            </div>
            <button class="btn" @click="copyCode">Kopyala</button>
          </div>
          <div style="font-size:12.5px; color:var(--muted);">
            <span v-if="syncApi.status.value === 'syncing'">Senkronize ediliyor…</span>
            <span v-else-if="syncApi.status.value === 'error'" style="color:var(--miss-text);">Bağlantı hatası — tekrar dene</span>
            <span v-else-if="syncApi.status.value === 'ok'">Bulutla senkronize ✓</span>
            <span v-else>Hazır</span>
          </div>
          <div class="row" style="gap:12px;">
            <button class="btn" style="flex:1;" @click="syncNow">Şimdi senkronize et</button>
            <button class="btn" style="flex:1;" @click="unlinkSync">Bağlantıyı kes</button>
          </div>
        </template>
      </div>
    </div>

    <div>
      <div class="eyebrow">Görünüm</div>
      <div class="row spread field">
        <span style="font-size:15.5px; font-weight:600; color:var(--ink2);">Tema</span>
        <div class="seg">
          <button :class="{ on: theme === 'light' }" @click="applyTheme('light')">Açık</button>
          <button :class="{ on: theme === 'dark' }" @click="applyTheme('dark')">Koyu</button>
        </div>
      </div>
    </div>

    <div class="micro" style="margin-top:2px;">{{ syncApi.code.value ? 'Verilerin cihazlarında ve bulutta senkron.' : 'Verilerin cihazında kalır.' }}</div>
  </div>
</template>
