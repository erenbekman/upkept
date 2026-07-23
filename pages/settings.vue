<script setup lang="ts">
import type { ReasonTag } from '~/composables/useEntries'

const db = useDb()
const reasonsRepo = useReasons()
const backup = useBackup()
const { theme, apply: applyTheme } = useTheme()
const { show: toast } = useToast()

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
      <div class="eyebrow">Görünüm</div>
      <div class="row spread field">
        <span style="font-size:15.5px; font-weight:600; color:var(--ink2);">Tema</span>
        <div class="seg">
          <button :class="{ on: theme === 'light' }" @click="applyTheme('light')">Açık</button>
          <button :class="{ on: theme === 'dark' }" @click="applyTheme('dark')">Koyu</button>
        </div>
      </div>
    </div>

    <div class="micro" style="margin-top:2px;">Verilerin cihazında kalır.</div>
  </div>
</template>
