<script setup lang="ts">
definePageMeta({ layout: false })

useSeoMeta({
  title: 'upkept — Kusursuz değil, sürekli ol.',
  description: 'Sakin ve yargısız aylık alışkanlık takibi. Kaçırdığın günü sebebiyle kaydet; metrikler süreklilik yüzdesi etrafında kurulu. Hesap yok, offline çalışır, verilerin sende kalır.',
  ogTitle: 'upkept — Kusursuz değil, sürekli ol.',
  ogDescription: 'Sakin, yargısız aylık alışkanlık takibi. Web · macOS · iOS. Hesap yok, verilerin sende kalır.',
  ogImage: 'https://up-kept.app/og.png',
  ogUrl: 'https://up-kept.app/',
  twitterCard: 'summary_large_image',
  twitterTitle: 'upkept — Kusursuz değil, sürekli ol.',
  twitterDescription: 'Sakin, yargısız aylık alışkanlık takibi. Hesap yok, verilerin sende kalır.',
  twitterImage: 'https://up-kept.app/og.png',
})
useHead({ link: [{ rel: 'canonical', href: 'https://up-kept.app/' }] })

// Installed contexts redirect to /app in middleware/installed-to-app.global.ts.

const DMG_URL = 'https://github.com/erenbekman/upkept/releases/latest/download/Upkept.dmg'
const IOS_URL = 'https://apps.apple.com/us/app/upkept/id6794236887'

// ---- "Fark" section (illustrative, static) ----
const missBtns = [
  { glyph: '✓', label: 'Yaptım', border: '#e6ddc8', bg: '#fbf8f0', dotBg: '#5f8a58', labelColor: '#8a8172' },
  { glyph: '~', label: 'Kısmen', border: '#e6ddc8', bg: '#fbf8f0', dotBg: '#c79433', labelColor: '#8a8172' },
  { glyph: '✕', label: 'Yapamadım', border: '#c07d63', bg: '#f2e1d9', dotBg: '#bd7659', labelColor: '#9a5236' },
]
const missChips = [
  { label: 'Yorgundum', on: true }, { label: 'Seyahatteydim', on: false },
  { label: 'Hastaydım', on: false }, { label: 'Unuttum', on: false },
]
const reasonBars = [
  { label: 'Yorgundum', count: 8, color: '#bd7659' },
  { label: 'Vaktim olmadı', count: 5, color: '#c79433' },
  { label: 'Seyahatteydim', count: 4, color: '#6d6fae' },
  { label: 'Unuttum', count: 3, color: '#9aa088' },
].map(r => ({ ...r, w: Math.round((r.count / 8) * 100) + '%' }))

// ---- Live demo date so the mockups never go stale ----
// Stable seed for prerender/hydration; onMounted shifts it to the real date on
// the client, so the phone + grid always show the current month/day.
const MONTHS_TR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık']
const DAYS_TR = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi']
const today = ref(new Date(2026, 6, 24))
onMounted(() => { today.value = new Date() })

const dom = computed(() => today.value.getDate())
const dim = computed(() => new Date(today.value.getFullYear(), today.value.getMonth() + 1, 0).getDate())
const todayIdx = computed(() => dom.value - 1)
const phoneDay = computed(() => `Gün ${dom.value}`)
const phoneDate = computed(() => `${dom.value} ${MONTHS_TR[today.value.getMonth()]} ${today.value.getFullYear()} ${DAYS_TR[today.value.getDay()]}`)
const monthTitle = computed(() => `${MONTHS_TR[today.value.getMonth()]} ${today.value.getFullYear()}`)

// ---- Monthly grid showcase (illustrative) ----
function gmeta(s: string | null) {
  switch (s) {
    case 'done': return { glyph: '✓', bg: '#e6efe1', color: '#3f6b3a' }
    case 'partial': return { glyph: '~', bg: '#f5ead1', color: '#8a6414' }
    case 'miss': return { glyph: '✕', bg: '#f2e1d9', color: '#9a5236' }
    default: return { glyph: '·', bg: 'transparent', color: '#c3b79b' }
  }
}
const pats: Record<string, string> = {
  'Egzersiz': 'dddpdmdddpddnddddpddmd',
  'Su içmek': 'dddddddpdddddddpdddddd',
  'Kitap okumak': 'dpdmddpdnddpdmddpddnpd',
  'Meditasyon': 'pdmdnddpdmddndpddmddnd',
  'Erken uyumak': 'ddnddpddndmddpddnddpdd',
}
const cm: Record<string, string | null> = { d: 'done', p: 'partial', m: 'miss', n: null }
const gDays = computed(() => Array.from({ length: dim.value }, (_, i) => ({
  n: i + 1,
  color: i === todayIdx.value ? '#6d6fae' : (i > todayIdx.value ? '#cbc1ac' : '#a89f8c'),
})))
const gridRows = computed(() => Object.entries(pats).map(([name, p]) => {
  const full = (p + p).slice(0, 31) // repeat the hand-tuned pattern to cover any month length
  const cells = []
  for (let i = 0; i < dim.value; i++) {
    if (i > todayIdx.value) {
      cells.push({ glyph: '', bg: 'transparent', color: 'transparent', border: '1px dashed #ece3ce', opacity: 0.55, today: false })
      continue
    }
    const st = cm[full[i]] ?? null
    const m = gmeta(st)
    const none = !st
    cells.push({
      glyph: none ? '·' : m.glyph,
      bg: none ? 'transparent' : m.bg,
      color: none ? '#c3b79b' : m.color,
      border: none ? '1px dashed #ece3ce' : '1px solid transparent',
      opacity: 1,
      today: i === todayIdx.value,
    })
  }
  return { name, cells }
}))
const gLegend = [
  { ...gmeta('done'), label: 'Yaptım', border: '1px solid transparent' },
  { ...gmeta('partial'), label: 'Kısmen', border: '1px solid transparent' },
  { ...gmeta('miss'), label: 'Yapamadım', border: '1px solid transparent' },
  { glyph: '·', bg: 'transparent', color: '#c3b79b', label: 'Kayıt yok', border: '1px dashed #e6ddc8' },
]

// ---- Steps / Privacy / Platforms ----
const steps = [
  { n: '1', title: 'Alışkanlığını ekle', body: 'Az ama sürdürülebilir. Bir–üç alışkanlıkla başla, gerisini zaman getirir.' },
  { n: '2', title: 'Günü işaretle', body: 'Yaptım, kısmen ya da yapamadım. İstersen sebebini bırak — hepsi opsiyonel.' },
  { n: '3', title: 'Süreklilik gör', body: 'Grid ve istatistiklerde ilerlemeni izle. Kusursuzluk değil, devamlılık.' },
]
// Inline SVG, not emoji: these read as interface icons, and emoji render as a
// different picture on every platform.
const privacy = [
  {
    title: 'Hesap yok', body: 'Ne e-posta ne şifre. Aç ve başla.',
    icon: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="m17 8 5 5M22 8l-5 5"/>',
  },
  {
    title: 'Bulut opsiyonel', body: 'İstersen anonim kodla senkronla, istemezsen cihazda kalır.',
    icon: '<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>',
  },
  {
    title: 'İnternetsiz', body: 'Uçakta, dağda, her yerde çalışır.',
    icon: '<path d="M12 20h.01"/><path d="M8.5 16.4a5 5 0 0 1 7 0"/><path d="M5 12.9a10 10 0 0 1 5.2-2.7"/><path d="M2 8.8a15 15 0 0 1 4.2-2.5"/><path d="m2 2 20 20"/><path d="M16.8 13.7a10 10 0 0 1 2.2-.8"/>',
  },
  {
    title: 'Dışa aktar', body: 'Verini dilediğin an yedekle, taşı.',
    icon: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
  },
]
const platforms = [
  { title: 'Web', body: 'Tarayıcıda anında aç, kurulum yok. Günün durumunu hızlıca gözden geçir.', soon: false, cta: { label: 'Tarayıcıda aç', to: '/app' } },
  { title: 'Masaüstü', body: 'Geniş ekranda ayın tamamını gör, alışkanlıklarını rahatça düzenle. macOS (.dmg).', soon: false, cta: { label: 'macOS için indir', href: DMG_URL } },
  { title: 'iOS', body: 'Cebinde, tek dokunuşla. iPhone ve iPad için App Store’da yayında.', soon: false, cta: { label: 'App Store’dan indir', href: IOS_URL } },
]

// ---- Hero phone mockup (mirrors the app's Bugün screen) ----
const phoneRows = [
  { name: 'Egzersiz', sub: 'Henüz işaretlemedin', subColor: '#b0a894', glyph: '+', dotBg: 'transparent', dotText: '#c3b79b', dotBorder: '1.5px dashed #cdc2a8' },
  { name: 'Su içmek', sub: 'Bugün yaptın', subColor: '#5f8a58', glyph: '✓', dotBg: '#5f8a58', dotText: '#fbf8f0', dotBorder: 'none' },
  { name: 'Kitap okumak', sub: 'Yorgundum', subColor: '#b3862c', glyph: '~', dotBg: '#c79433', dotText: '#fbf8f0', dotBorder: 'none' },
  { name: 'Meditasyon', sub: 'Yarın yeni bir gün', subColor: '#b57254', glyph: '✕', dotBg: '#bd7659', dotText: '#fbf8f0', dotBorder: 'none' },
  { name: 'Erken uyumak', sub: 'Henüz işaretlemedin', subColor: '#b0a894', glyph: '+', dotBg: 'transparent', dotText: '#c3b79b', dotBorder: '1.5px dashed #cdc2a8' },
]
const phoneTabs = [
  { label: 'Bugün', icon: '☼', color: '#6d6fae' },
  { label: 'Grid', icon: '▦', color: '#b0a894' },
  { label: 'İstatistik', icon: '◔', color: '#b0a894' },
  { label: 'Alışkanlık', icon: '❋', color: '#b0a894' },
  { label: 'Ayarlar', icon: '⚙︎', color: '#b0a894' },
]
</script>

<template>
  <div class="lp">
    <svg class="arc arc-tr" viewBox="0 0 600 600" aria-hidden="true">
      <path d="M470 220 A190 190 0 1 0 490 340" fill="none" stroke="#6d6fae" stroke-width="2" stroke-linecap="round" stroke-dasharray="620" />
      <circle cx="470" cy="140" r="14" fill="#6d6fae" opacity="0.5" />
    </svg>

    <div class="wrap">
      <nav class="nav">
        <div class="lp-brand">
          <svg width="28" height="28" viewBox="0 0 60 60" fill="none">
            <path d="M47 22 A19 19 0 1 0 49 34" stroke="#6d6fae" stroke-width="6.5" stroke-linecap="round" />
            <circle cx="47" cy="14" r="4.6" fill="#6d6fae" />
          </svg>
          <span>upkept</span>
        </div>
        <div class="nav-links">
          <a href="#fark">Fark</a>
          <a href="#grid">Aylık grid</a>
          <a href="#how">Nasıl çalışır</a>
          <NuxtLink to="/app" class="nav-cta">Başla</NuxtLink>
        </div>
      </nav>

      <!-- HERO -->
      <section class="lp-hero">
        <div class="hero-copy">
          <h1>Kusursuz değil,<br><span class="em">sürekli</span> ol.</h1>
          <p>Alışkanlıklarını sakin ve yargısız takip et. Bir günü kaçırmak bir alarm değil — sadece sessizce kaydedilir.</p>
          <div class="hero-cta">
            <NuxtLink to="/app" class="btn-dark">Bugün başla</NuxtLink>
            <a :href="IOS_URL" class="btn-store" target="_blank" rel="noopener"> App Store’dan indir</a>
            <span class="hero-note">Hesap yok · internetsiz çalışır</span>
          </div>
        </div>

        <div class="phone-wrap">
          <div class="phone">
            <div class="ph-status">
              <span>9:41</span>
              <span class="ph-ind">▲ ▬ ⬤</span>
            </div>
            <div class="ph-head">
              <div class="ph-brand">
                <svg width="20" height="20" viewBox="0 0 60 60" fill="none">
                  <path d="M47 22 A19 19 0 1 0 49 34" stroke="#6d6fae" stroke-width="6.5" stroke-linecap="round" />
                  <circle cx="47" cy="14" r="4.6" fill="#6d6fae" />
                </svg>
                <span>upkept</span>
              </div>
              <div class="ph-day">{{ phoneDay }}</div>
              <div class="ph-date">{{ phoneDate }}</div>
            </div>
            <div class="ph-rows">
              <div v-for="r in phoneRows" :key="r.name" class="ph-row">
                <div class="ph-rowmain">
                  <div class="ph-name">{{ r.name }}</div>
                  <div class="ph-sub" :style="{ color: r.subColor }">{{ r.sub }}</div>
                </div>
                <div class="ph-dot" :style="{ background: r.dotBg, color: r.dotText, border: r.dotBorder }">{{ r.glyph }}</div>
              </div>
            </div>
            <div class="ph-tabs">
              <div v-for="t in phoneTabs" :key="t.label" class="ph-tab">
                <div class="ph-tab-ic" :style="{ color: t.color }">{{ t.icon }}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- FARK -->
      <section id="fark" class="sec">
        <div class="sec-head wide">
          <div class="lp-eyebrow">upkept farkı</div>
          <h2>Neden kaçırdığını da <span class="em">kaydet.</span></h2>
          <p class="lead">Bir günü kaçırdığında suçlanmazsın. Sebebini bir dokunuşla bırakırsın — ve zamanla bu küçük notlar örüntüye dönüşür. Kaçırmak bir hata değil, <b>veridir.</b></p>
        </div>

        <div class="fark-two">
          <div class="lp-card miss-card">
            <div class="miss-title">Meditasyon</div>
            <div class="miss-sub">Bugünü nasıl geçirdin?</div>
            <div class="sbtns">
              <div v-for="b in missBtns" :key="b.label" class="sbtn" :style="{ borderColor: b.border, background: b.bg }">
                <div class="sdot" :style="{ background: b.dotBg }">{{ b.glyph }}</div>
                <div class="slabel" :style="{ color: b.labelColor }">{{ b.label }}</div>
              </div>
            </div>
            <div class="reason-label">Bir sebep <span>(opsiyonel)</span></div>
            <div class="fark-chips">
              <div
                v-for="c in missChips" :key="c.label" class="fark-chip"
                :style="c.on
                  ? { borderColor: '#6d6fae', background: '#6d6fae', color: '#fbf8f0' }
                  : { borderColor: '#e2d8c1', background: '#fbf8f0', color: '#6b6459' }"
              >{{ c.label }}</div>
            </div>
            <div class="note-prev">Yatağa geç girdim, yarın erken denerim…</div>
          </div>

          <div class="lp-card summary-card">
            <div class="sum-eyebrow">Zamanla</div>
            <div class="sum-title">En sık kaçırma sebebin</div>
            <div class="bars">
              <div v-for="r in reasonBars" :key="r.label" class="bar-row">
                <div class="bar-top">
                  <span class="bar-label">{{ r.label }}</span>
                  <span class="bar-count">{{ r.count }} kez</span>
                </div>
                <div class="bar-track"><div class="bar-fill" :style="{ width: r.w, background: r.color }" /></div>
              </div>
            </div>
            <div class="sum-foot">Yargı yok — sadece kendini tanıman için sakin bir örüntü.</div>
          </div>
        </div>
      </section>

      <!-- AYLIK GRID -->
      <section id="grid" class="sec">
        <div class="sec-head wide">
          <div class="lp-eyebrow">İmza ekran</div>
          <h2>Bütün ay, <span class="em">tek bakışta.</span></h2>
          <p class="lead">Satır senin alışkanlığın, sütun ayın günü. Her hücrede yumuşak bir renk ve işaret — bugün vurgulu, gelecek günler sessiz. İlerlemeni zorlamadan görürsün.</p>
        </div>

        <div class="lp-card grid-card">
          <div class="grid-head">
            <div class="grid-title">{{ monthTitle }}</div>
            <div class="lp-legend">
              <div v-for="l in gLegend" :key="l.label" class="lp-legend-item">
                <div class="lp-legend-box" :style="{ background: l.bg, color: l.color, border: l.border }">{{ l.glyph }}</div>
                <span>{{ l.label }}</span>
              </div>
            </div>
          </div>
          <!-- One CSS grid with fractional day columns: the headline promises the
               whole month, so it has to fit at every width instead of scrolling. -->
          <div
            class="monthgrid" aria-hidden="true"
            :style="{ gridTemplateColumns: `minmax(60px, 128px) repeat(${dim}, minmax(0, 1fr))` }"
          >
            <div class="mg-corner" />
            <div v-for="d in gDays" :key="d.n" class="mg-day" :style="{ color: d.color }">{{ d.n }}</div>

            <template v-for="row in gridRows" :key="row.name">
              <div class="mg-name">{{ row.name }}</div>
              <div
                v-for="(c, i) in row.cells" :key="i" class="mg-cell" :class="{ 'mg-today': c.today }"
                :style="{ background: c.bg, color: c.color, border: c.border, opacity: c.opacity }"
              >{{ c.glyph }}</div>
            </template>
          </div>
        </div>
      </section>

      <!-- NASIL ÇALIŞIR -->
      <section id="how" class="sec">
        <div class="sec-head wide">
          <div class="lp-eyebrow">Zahmetsiz</div>
          <h2>Günde <span class="em">on saniye.</span></h2>
        </div>
        <div class="cols3">
          <div v-for="s in steps" :key="s.n" class="hstep">
            <div class="hstep-n">{{ s.n }}</div>
            <div class="hstep-title">{{ s.title }}</div>
            <div class="hstep-body">{{ s.body }}</div>
          </div>
        </div>
      </section>

      <!-- VERİLERİN SENDE KALIR -->
      <section id="gizlilik" class="sec">
        <div class="privacy-card">
          <div class="sec-head wide" style="margin-bottom:34px;">
            <div class="lp-eyebrow">Gizlilik</div>
            <h2 class="h2-sm">Verilerin <span class="em">sende kalır.</span></h2>
            <p class="lead">Ne zorunlu hesap, ne reklam, ne izleme. upkept cihazında çalışır — internetin olmasa bile.</p>
          </div>
          <div class="privacy-grid">
            <div v-for="p in privacy" :key="p.title" class="pv">
              <div class="pv-ic">
                <svg
                  width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true"
                  stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"
                  v-html="p.icon"
                />
              </div>
              <div class="pv-title">{{ p.title }}</div>
              <div class="pv-body">{{ p.body }}</div>
            </div>
          </div>
          <div class="pv-foot">
            <svg
              width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true"
              stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"
            ><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /></svg>
            <span>Sunucularımızda hesabın yok — çünkü hesap diye bir şey yok.</span>
          </div>
        </div>
      </section>

      <!-- PLATFORMLAR -->
      <section id="platforms" class="sec">
        <div class="sec-head wide">
          <div class="lp-eyebrow">Her yerde</div>
          <h2>Nerede istersen, <span class="em">orada.</span></h2>
        </div>
        <div class="cols3">
          <div v-for="p in platforms" :key="p.title" class="plat" :class="{ soon: p.soon }">
            <div class="plat-head">
              <div class="plat-title">{{ p.title }}</div>
              <span v-if="p.soon" class="plat-badge">Yakında</span>
            </div>
            <div class="plat-body">{{ p.body }}</div>
            <NuxtLink v-if="p.cta?.to" :to="p.cta.to" class="plat-cta">{{ p.cta.label }} →</NuxtLink>
            <a v-else-if="p.cta?.href" :href="p.cta.href" class="plat-cta" target="_blank" rel="noopener">{{ p.cta.label }} ↓</a>
          </div>
        </div>
        <div class="plat-note">macOS uygulaması Apple tarafından onaylı — indir, Applications'a sürükle, aç. Windows &amp; Android yakında.</div>
      </section>

      <!-- KAPANIŞ -->
      <section class="closing">
        <h2 class="close-h">Kusursuz olmana gerek yok. <span class="em">Sadece devam et.</span></h2>
        <p class="close-p">Hesap gerekmez. Bugünden başla.</p>
        <NuxtLink to="/app" class="btn-dark">Bugün başla</NuxtLink>
      </section>

      <!-- FOOTER -->
      <footer class="foot">
        <div class="foot-top">
          <div>
            <div class="lp-brand" style="margin-bottom:14px;">
              <svg width="24" height="24" viewBox="0 0 60 60" fill="none">
                <path d="M47 22 A19 19 0 1 0 49 34" stroke="#6d6fae" stroke-width="6.5" stroke-linecap="round" />
                <circle cx="47" cy="14" r="4.6" fill="#6d6fae" />
              </svg>
              <span>upkept</span>
            </div>
            <p class="foot-desc">Sakin, yargısız bir aylık alışkanlık günlüğü. Verilerin sende kalır.</p>
          </div>
          <div>
            <div class="foot-col-title">Uygulama</div>
            <div class="foot-col">
              <NuxtLink to="/app">Web</NuxtLink>
              <a href="#platforms">Masaüstü</a>
              <a :href="IOS_URL" target="_blank" rel="noopener">iOS · App Store</a>
            </div>
          </div>
          <div>
            <div class="foot-col-title">upkept</div>
            <div class="foot-col">
              <NuxtLink to="/privacy">Gizlilik</NuxtLink>
              <a href="#how">Nasıl çalışır</a>
              <a href="mailto:erenbekman@gmail.com">İletişim</a>
            </div>
          </div>
        </div>
        <div class="foot-bottom">
          <span>© 2026 upkept</span>
          <span class="foot-quote">Kaçırmak da yolculuğun bir parçası.</span>
        </div>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.lp {
  position: relative; min-height: 100vh; overflow: hidden;
  background: #f7f4ed; color: #262420;
  font-family: 'Karla', system-ui, sans-serif;
}
.arc { position: absolute; pointer-events: none; }
.arc-tr { top: -160px; right: -180px; width: 600px; height: 600px; opacity: 0.45; }
.arc-tr path { animation: drawArc 2.2s ease forwards; }
@keyframes drawArc { from { stroke-dashoffset: 620; } to { stroke-dashoffset: 0; } }
@keyframes fadeUp { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
@keyframes floaty { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-9px); } }

.wrap { position: relative; max-width: 1140px; margin: 0 auto; padding: 0 44px; }

.nav { display: flex; align-items: center; justify-content: space-between; padding: 28px 0; }
.lp-brand { display: flex; align-items: center; gap: 10px; }
.lp-brand span { font-family: 'Spectral', serif; font-weight: 500; font-size: 23px; letter-spacing: -0.8px; color: #262420; }
.nav-links { display: flex; align-items: center; gap: 34px; font-size: 15px; font-weight: 600; color: #6b6459; }
.nav-links a { color: #6b6459; }
.nav-links a:hover { opacity: 0.7; }
.nav-cta { border: 1.5px solid #262420; color: #262420 !important; padding: 10px 20px; border-radius: 999px; font-weight: 700; }

.lp-hero { display: grid; grid-template-columns: 1fr 320px; gap: 56px; align-items: center; padding: 56px 0 88px; }
.hero-copy { animation: fadeUp 0.7s ease; }
h1 { font-family: 'Spectral', serif; font-weight: 400; font-size: 74px; line-height: 1.02; letter-spacing: -2.5px; margin: 0 0 24px; color: #201e1a; }
.em { font-style: italic; color: #6d6fae; }
.hero-copy p { font-size: 19px; line-height: 1.6; color: #6b6459; max-width: 430px; margin: 0 0 34px; }
.hero-cta { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
.btn-store { border: 1.5px solid #d8cfba; color: #4a463f !important; background: #fbf8f0; font-size: 15px; font-weight: 700; padding: 14px 24px; border-radius: 999px; display: inline-block; }
.btn-store:hover { background: #f4efe2; }
.btn-dark { background: #262420; color: #f7f4ed !important; font-size: 16px; font-weight: 700; padding: 16px 32px; border-radius: 999px; display: inline-block; }
.btn-dark:hover { opacity: 0.85; }
.hero-note { font-size: 14.5px; font-weight: 600; color: #8a8172; }

.phone-wrap { justify-self: center; animation: floaty 6s ease-in-out infinite; }
.phone {
  position: relative; width: 300px; height: 610px; border-radius: 42px;
  background: #f4efe3; overflow: hidden; font-family: 'Karla', system-ui, sans-serif;
  box-shadow: 0 40px 80px -30px rgba(74,63,44,0.55), 0 0 0 9px #171412, 0 0 0 11px #2c2822;
}
.ph-status { display: flex; align-items: flex-end; justify-content: space-between; padding: 14px 24px 6px; font-size: 12px; font-weight: 700; color: #3a352d; }
.ph-ind { letter-spacing: 2px; opacity: 0.85; font-size: 10px; }
.ph-head { padding: 8px 18px 0; }
.ph-brand { display: flex; align-items: center; gap: 7px; margin-bottom: 12px; }
.ph-brand span { font-family: 'Spectral', serif; font-weight: 500; font-size: 17px; letter-spacing: -0.6px; color: #33302b; }
.ph-day { font-family: 'Spectral', serif; font-size: 32px; font-weight: 500; line-height: 1; color: #33302b; letter-spacing: -0.8px; }
.ph-date { margin-top: 7px; font-size: 12.5px; color: #9a917f; font-weight: 500; }
.ph-rows { display: flex; flex-direction: column; gap: 9px; padding: 16px 14px 0; }
.ph-row { display: flex; align-items: center; gap: 10px; padding: 11px 12px; border-radius: 17px; background: #fbf8f0; border: 1px solid #ece3ce; box-shadow: 0 5px 14px -12px rgba(74,63,44,0.4); }
.ph-rowmain { flex: 1; min-width: 0; }
.ph-name { font-size: 14px; font-weight: 600; color: #3a352d; }
.ph-sub { font-size: 11px; margin-top: 2px; font-weight: 500; }
.ph-dot { width: 28px; height: 28px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; flex: 0 0 28px; }
.ph-tabs { position: absolute; bottom: 0; left: 0; right: 0; height: 62px; padding: 10px 6px 18px; display: flex; background: rgba(244,239,227,0.9); backdrop-filter: blur(10px); border-top: 1px solid #e6ddc8; }
.ph-tab { flex: 1; display: flex; align-items: center; justify-content: center; }
.ph-tab-ic { font-size: 18px; line-height: 1; }

.sec { padding: 40px 0 92px; }
.sec-head { margin-bottom: 40px; max-width: 560px; }
.sec-head.wide { max-width: 620px; }
.lp-eyebrow { font-size: 13px; font-weight: 700; letter-spacing: 1px; color: #b0917d; text-transform: uppercase; margin-bottom: 12px; }
h2 { font-family: 'Spectral', serif; font-weight: 400; font-size: 48px; letter-spacing: -1.6px; margin: 0; color: #201e1a; line-height: 1.04; }
.h2-sm { font-size: 44px; letter-spacing: -1.5px; }
.lead { font-size: 18px; line-height: 1.6; color: #6b6459; margin: 16px 0 0; }
.lead b, .sec-head b { color: #262420; font-weight: 600; }

.lp-card { background: #fbf8f0; border: 1px solid #eadfc9; border-radius: 26px; box-shadow: 0 20px 50px -34px rgba(74,63,44,0.5); }

/* Fark */
.fark-two { display: grid; grid-template-columns: 1.05fr 0.95fr; gap: 28px; align-items: stretch; }
.miss-card { padding: 30px 30px 32px; }
.miss-title { font-family: 'Spectral', serif; font-size: 22px; color: #33302b; margin-bottom: 4px; }
.miss-sub { font-size: 14px; color: #9a917f; margin-bottom: 20px; }
.sbtns { display: flex; gap: 10px; margin-bottom: 24px; }
.sbtn { flex: 1; border: 2px solid; border-radius: 18px; padding: 16px 6px 13px; display: flex; flex-direction: column; align-items: center; gap: 8px; }
.sdot { width: 42px; height: 42px; border-radius: 50%; color: #fbf8f0; display: flex; align-items: center; justify-content: center; font-size: 21px; font-weight: 700; }
.slabel { font-size: 12.5px; font-weight: 700; }
.reason-label { font-size: 13.5px; color: #6b6459; font-weight: 600; margin-bottom: 12px; }
.reason-label span { color: #b0a894; font-weight: 500; }
.fark-chips { display: flex; flex-wrap: wrap; gap: 9px; margin-bottom: 18px; }
.fark-chip { border: 1.5px solid; font-size: 14px; font-weight: 600; padding: 9px 16px; border-radius: 999px; }
.note-prev { border: 1.5px solid #e2d8c1; background: #fdfbf5; border-radius: 14px; padding: 12px 15px; font-size: 14.5px; color: #b0a894; font-style: italic; }

.summary-card { background: #f2ede2; border-color: #e6dcc7; box-shadow: none; padding: 30px 30px 28px; display: flex; flex-direction: column; }
.sum-eyebrow { font-size: 12.5px; font-weight: 700; letter-spacing: 0.5px; color: #9a917f; text-transform: uppercase; margin-bottom: 6px; }
.sum-title { font-family: 'Spectral', serif; font-size: 25px; color: #33302b; line-height: 1.15; margin-bottom: 22px; }
.bars { display: flex; flex-direction: column; gap: 16px; flex: 1; }
.bar-top { display: flex; justify-content: space-between; margin-bottom: 7px; }
.bar-label { font-size: 15px; font-weight: 600; color: #3a352d; }
.bar-count { font-size: 14px; font-weight: 700; color: #9a917f; }
.bar-track { height: 9px; border-radius: 6px; background: #e3d9c6; overflow: hidden; }
.bar-fill { height: 100%; border-radius: 6px; }
.sum-foot { margin-top: 24px; font-family: 'Spectral', serif; font-style: italic; font-size: 16px; color: #6b6459; line-height: 1.45; }

/* Grid showcase */
.grid-card { padding: 26px 26px 22px; overflow: hidden; }
.grid-head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 18px; gap: 12px; flex-wrap: wrap; }
.grid-title { font-family: 'Spectral', serif; font-size: 22px; color: #33302b; }
.lp-legend { display: flex; gap: 16px; flex-wrap: wrap; }
.lp-legend-item { display: flex; align-items: center; gap: 6px; }
.lp-legend-box { width: 18px; height: 18px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 10px; font-weight: 700; }
.lp-legend-item span { font-size: 12.5px; color: #9a917f; font-weight: 600; }
/* Fractional day columns, so all 28-31 days fit whatever the width is.
   Column count comes from the template (the month's real length). */
.monthgrid { display: grid; gap: 5px 3px; align-items: center; }
.mg-day { text-align: center; font-size: 10.5px; font-weight: 700; padding-bottom: 2px; }
.mg-name { font-size: 14px; font-weight: 600; color: #3a352d; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; padding-right: 10px; }
.mg-cell { aspect-ratio: 1; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; }
.mg-cell.mg-today { box-shadow: 0 0 0 2px #6d6fae; }
/* Below this the cells are too small to carry a glyph — the colour alone still
   reads as a month of progress, which is the whole point of the picture. */
@media (max-width: 760px) {
  .monthgrid { gap: 4px 2px; }
  .mg-cell { font-size: 0; border-radius: 4px; }
  .mg-day { font-size: 8px; }
  .mg-name { font-size: 11.5px; padding-right: 6px; }
}
/* On phones a name column would squeeze the days to 3px. Stack instead: the
   label gets its own line and the month becomes a full-width colour band.
   !important because the column count is set inline from the month length. */
@media (max-width: 640px) {
  .monthgrid { grid-template-columns: repeat(31, minmax(0, 1fr)) !important; gap: 3px 2px; }
  .mg-corner, .mg-day { display: none; }
  .mg-name { grid-column: 1 / -1; font-size: 13px; padding: 10px 0 2px; }
  .mg-cell { border-radius: 3px; }
  /* A 2px ring on an 8px cell reads as a blob and breaks the band's rhythm. */
  .mg-cell.mg-today { box-shadow: 0 0 0 1.5px #6d6fae; border-radius: 2px; }
}

/* 3-column layout (how + platforms) */
.cols3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 40px; }
.hstep { border-top: 1.5px solid #262420; padding-top: 22px; }
.hstep-n { font-family: 'Spectral', serif; font-size: 30px; color: #6d6fae; margin-bottom: 12px; }
.hstep-title { font-family: 'Spectral', serif; font-size: 22px; font-weight: 500; color: #201e1a; margin-bottom: 8px; }
.hstep-body { font-size: 15.5px; line-height: 1.6; color: #6b6459; }

/* Privacy */
.privacy-card { background: #f2ede2; border: 1px solid #e6dcc7; border-radius: 26px; padding: 44px 44px 40px; }
.privacy-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; }
.pv { background: #fbf8f0; border: 1px solid #e6dcc7; border-radius: 18px; padding: 22px 20px 20px; }
.pv-ic {
  width: 38px; height: 38px; border-radius: 11px; margin-bottom: 14px;
  display: flex; align-items: center; justify-content: center;
  background: #eceaf5; color: #6d6fae;
}
.pv-title { font-family: 'Spectral', serif; font-size: 18.5px; font-weight: 500; color: #201e1a; margin-bottom: 6px; }
.pv-body { font-size: 14.5px; line-height: 1.55; color: #6b6459; }
.pv-foot {
  display: flex; align-items: center; justify-content: center; gap: 9px;
  margin-top: 26px; color: #8a8172; font-size: 14px;
  font-family: 'Spectral', serif; font-style: italic;
}

/* Platforms */
.plat { border-top: 1.5px solid #262420; padding-top: 22px; }
.plat.soon { opacity: 0.55; border-top-color: #d8cdb4; }
.plat-head { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.plat-title { font-family: 'Spectral', serif; font-size: 24px; font-weight: 500; color: #201e1a; }
.plat-badge { font-size: 11px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; color: #a89f8c; border: 1px solid #d8cdb4; padding: 3px 9px; border-radius: 999px; }
.plat-body { font-size: 15.5px; line-height: 1.6; color: #6b6459; }
.plat-cta { display: inline-block; margin-top: 14px; font-size: 14.5px; font-weight: 700; color: #6d6fae; }
.plat-cta:hover { opacity: 0.7; }
.plat-note { margin-top: 26px; font-size: 13px; color: #9a917f; line-height: 1.6; }

/* Closing */
.closing { padding: 30px 0 80px; text-align: center; }
.close-h { font-size: 52px; letter-spacing: -1.8px; max-width: 640px; margin: 0 auto 12px; line-height: 1.08; }
.close-p { font-size: 17px; color: #6b6459; margin: 0 0 30px; }
.closing .btn-dark { padding: 17px 40px; }

/* Footer */
.foot { border-top: 1.5px solid #e2d9c8; padding: 40px 0 56px; }
.foot-top { display: grid; grid-template-columns: 1.4fr 1fr 1fr; gap: 32px; margin-bottom: 36px; }
.foot-desc { font-size: 15px; line-height: 1.55; color: #8a8172; max-width: 300px; margin: 0; }
.foot-col-title { font-size: 12.5px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; color: #b0a894; margin-bottom: 14px; }
.foot-col { display: flex; flex-direction: column; gap: 10px; font-size: 15px; font-weight: 600; }
.foot-col a { color: #6b6459; }
.foot-bottom { display: flex; align-items: center; justify-content: space-between; border-top: 1px solid #eadfc9; padding-top: 20px; font-size: 13.5px; color: #a89f8c; gap: 16px; flex-wrap: wrap; }
.foot-quote { font-family: 'Spectral', serif; font-style: italic; }

@media (max-width: 860px) {
  .fark-two { grid-template-columns: 1fr; }
  .privacy-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 780px) {
  .wrap { padding: 0 20px; }
  .nav-links a:not(.nav-cta) { display: none; }
  .lp-hero { grid-template-columns: 1fr; gap: 40px; padding: 24px 0 60px; }
  h1 { font-size: 46px; letter-spacing: -1.5px; }
  .hero-copy p { font-size: 17px; }
  .phone-wrap { order: 2; }
  h2 { font-size: 34px; }
  .h2-sm { font-size: 32px; }
  .close-h { font-size: 34px; letter-spacing: -1px; }
  .cols3 { grid-template-columns: 1fr; gap: 32px; }
  .privacy-grid { grid-template-columns: 1fr; gap: 22px; }
  .privacy-card { padding: 32px 24px 30px; }
  .foot-top { grid-template-columns: 1fr; gap: 28px; }
  .sec { padding: 30px 0 64px; }
}
</style>
