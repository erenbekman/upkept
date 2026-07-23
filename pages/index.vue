<script setup lang="ts">
definePageMeta({ layout: false })

// Installed contexts (native app, Tauri desktop, or installed PWA) skip the
// marketing landing and open straight into the tracker.
if (import.meta.client) {
  const w = window as any
  const installed =
    w.__TAURI_INTERNALS__ || w.__TAURI__ ||
    (w.Capacitor?.isNativePlatform?.()) ||
    w.matchMedia?.('(display-mode: standalone)').matches
  if (installed) await navigateTo('/app', { replace: true })
}

const DMG_URL = 'https://github.com/erenbekman/upkept/releases/latest/download/Upkept.dmg'
const platforms = [
  { title: 'Web', body: 'Tarayıcıda anında aç, kurulum yok. Günün durumunu hızlıca gözden geçir.', cta: { label: 'Tarayıcıda aç', to: '/app' } },
  { title: 'iOS', body: 'Cebinde. Tek dokunuşla işaretle; aylık grid ve nazik hatırlatmalar hep yanında.', cta: { label: 'App Store — yakında' } },
  { title: 'Masaüstü', body: 'Geniş ekranda ayın tamamını gör, alışkanlıklarını rahatça düzenle. macOS (.dmg).', cta: { label: 'macOS için indir', href: DMG_URL } },
]
const steps = [
  { n: '1', title: 'Alışkanlığını ekle', body: 'Az ama sürdürülebilir. Bir–üç alışkanlıkla başla, gerisini zaman getirir.' },
  { n: '2', title: 'Günü işaretle', body: 'Yaptım, kısmen ya da yapamadım. İstersen sebep ekle — hepsi opsiyonel.' },
  { n: '3', title: 'Süreklilik gör', body: 'Grid ve istatistiklerde ilerlemeni izle. Kusursuzluk değil, devamlılık.' },
]
const statuses = [
  { glyph: '✓', label: 'Yaptım', cls: 'done' },
  { glyph: '~', label: 'Kısmen', cls: 'partial' },
  { glyph: '✕', label: 'Yapamadım', cls: 'miss' },
  { glyph: '·', label: 'Kayıt yok', cls: 'none' },
]
</script>

<template>
  <div class="lp">
    <svg class="arc arc-tr" viewBox="0 0 600 600">
      <path d="M470 220 A190 190 0 1 0 490 340" fill="none" stroke="#6d6fae" stroke-width="2" stroke-linecap="round" stroke-dasharray="620" />
      <circle cx="470" cy="140" r="14" fill="#6d6fae" opacity="0.5" />
    </svg>
    <svg class="arc arc-bl" viewBox="0 0 400 400">
      <path d="M300 150 A120 120 0 1 0 312 210" fill="none" stroke="#c9a487" stroke-width="1.5" stroke-linecap="round" />
      <circle cx="300" cy="95" r="9" fill="#c9a487" />
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
          <a href="#platforms">Platformlar</a>
          <a href="#how">Nasıl çalışır</a>
          <a href="#felsefe">Felsefe</a>
          <NuxtLink to="/app" class="nav-cta">Başla</NuxtLink>
        </div>
      </nav>

      <section class="lp-hero">
        <div class="hero-copy">
          <h1>Kusursuz değil,<br><span class="em">sürekli</span> ol.</h1>
          <p>Alışkanlıklarını sakin ve yargısız takip et. Bir günü kaçırmak bir alarm değil — sadece sessizce kaydedilir.</p>
          <div class="hero-cta">
            <NuxtLink to="/app" class="btn-dark">Ücretsiz başla</NuxtLink>
            <a href="#how" class="btn-link">Nasıl çalışır</a>
          </div>
        </div>

        <div class="phone-wrap">
          <div class="phone">
            <div class="ph-brand">
              <svg width="20" height="20" viewBox="0 0 60 60" fill="none">
                <path d="M47 22 A19 19 0 1 0 49 34" stroke="#6d6fae" stroke-width="6.5" stroke-linecap="round" />
                <circle cx="47" cy="14" r="4.6" fill="#6d6fae" />
              </svg>
              <span>upkept</span>
            </div>
            <div class="ph-day">Gün 12</div>
            <div class="ph-date">23 Temmuz, Perşembe</div>
            <div class="ph-row">
              <span class="ph-name">Egzersiz</span>
              <span class="ph-pill done">✓</span>
            </div>
            <div class="ph-row">
              <span class="ph-name">Su içmek</span>
              <span class="ph-pill done">✓</span>
            </div>
            <div class="ph-row">
              <span class="ph-name">Kitap okumak</span>
              <span class="ph-pill partial">~</span>
            </div>
            <div class="ph-row">
              <span class="ph-name">Meditasyon</span>
              <span class="ph-pill none">+</span>
            </div>
          </div>
        </div>
      </section>

      <section id="platforms" class="sec">
        <div class="sec-head">
          <div class="lp-eyebrow">Her yerde seninle</div>
          <h2>Bir challenge, üç ekran</h2>
        </div>
        <div class="cols-3">
          <div v-for="p in platforms" :key="p.title" class="plat">
            <div class="plat-title">{{ p.title }}</div>
            <div class="plat-body">{{ p.body }}</div>
            <NuxtLink v-if="p.cta.to" :to="p.cta.to" class="plat-cta">{{ p.cta.label }} →</NuxtLink>
            <a v-else-if="p.cta.href" :href="p.cta.href" class="plat-cta">{{ p.cta.label }} ↓</a>
            <span v-else class="plat-soon">{{ p.cta.label }}</span>
          </div>
        </div>
        <div class="plat-note">macOS uygulaması imzasız — ilk açılışta sağ tık → <b>Aç</b>. Windows &amp; Android yakında.</div>
      </section>

      <section id="how" class="sec">
        <div class="sec-head center">
          <div class="lp-eyebrow">Zahmetsiz</div>
          <h2>Günde on saniye</h2>
        </div>
        <div class="cols-3 steps">
          <div v-for="s in steps" :key="s.n" class="step">
            <div class="step-n">{{ s.n }}</div>
            <div class="step-title">{{ s.title }}</div>
            <div class="step-body">{{ s.body }}</div>
          </div>
        </div>

        <div class="strip">
          <div class="strip-lead">Dört sakin durum —</div>
          <div v-for="st in statuses" :key="st.label" class="strip-item">
            <div class="strip-glyph" :class="st.cls">{{ st.glyph }}</div>
            <span>{{ st.label }}</span>
          </div>
        </div>
      </section>

      <section id="felsefe" class="philosophy">
        <div class="quote">Her seri bir gün önce sıfırdı. Kaçırmak da yolculuğun bir parçası — <span class="em">önemli olan geri dönmen.</span></div>
        <NuxtLink to="/app" class="btn-dark">Bugün başla</NuxtLink>
      </section>

      <footer class="foot">
        <div class="lp-brand foot-brand">
          <svg width="20" height="20" viewBox="0 0 60 60" fill="none">
            <path d="M47 22 A19 19 0 1 0 49 34" stroke="#a89f8c" stroke-width="6.5" stroke-linecap="round" />
            <circle cx="47" cy="14" r="4.6" fill="#a89f8c" />
          </svg>
          <span>upkept</span>
        </div>
        <div class="foot-links">
          <a href="#">Gizlilik</a>
          <a href="#">İletişim</a>
          <span>© 2026</span>
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
.arc-tr { top: -160px; right: -180px; width: 620px; height: 620px; opacity: 0.5; }
.arc-tr path { animation: drawArc 2.2s ease forwards; }
.arc-bl { bottom: -120px; left: -140px; width: 420px; height: 420px; opacity: 0.35; }
@keyframes drawArc { from { stroke-dashoffset: 620; } to { stroke-dashoffset: 0; } }
@keyframes fadeUp { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
@keyframes floaty { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-9px); } }

.wrap { position: relative; max-width: 1140px; margin: 0 auto; padding: 0 44px; }

.nav { display: flex; align-items: center; justify-content: space-between; padding: 30px 0; }
.lp-brand { display: flex; align-items: center; gap: 10px; }
.lp-brand span { font-family: 'Spectral', serif; font-weight: 500; font-size: 23px; letter-spacing: -0.8px; }
.nav-links { display: flex; align-items: center; gap: 36px; font-size: 15px; font-weight: 600; color: #6b6459; }
.nav-links a { color: #6b6459; }
.nav-links a:hover { opacity: 0.7; }
.nav-cta { border: 1.5px solid #262420; color: #262420 !important; padding: 10px 20px; border-radius: 999px; font-weight: 700; }

.lp-hero { display: grid; grid-template-columns: 1fr 340px; gap: 56px; align-items: center; padding: 70px 0 110px; }
.hero-copy { animation: fadeUp 0.7s ease; }
h1 { font-family: 'Spectral', serif; font-weight: 400; font-size: 74px; line-height: 1.02; letter-spacing: -2.5px; margin: 0 0 26px; color: #201e1a; }
.em { font-style: italic; color: #6d6fae; }
.hero-copy p { font-size: 19px; line-height: 1.6; color: #6b6459; max-width: 440px; margin: 0 0 38px; }
.hero-cta { display: flex; align-items: center; gap: 22px; }
.btn-dark { background: #262420; color: #f7f4ed !important; font-size: 16px; font-weight: 700; padding: 16px 32px; border-radius: 999px; display: inline-block; }
.btn-dark:hover { opacity: 0.85; }
.btn-link { font-size: 15.5px; font-weight: 700; color: #262420; border-bottom: 1.5px solid #c9c0ad; padding-bottom: 3px; }

.phone-wrap { justify-self: center; animation: floaty 6s ease-in-out infinite; }
.phone {
  width: 300px; border-radius: 40px; background: #ffffff;
  border: 1px solid #eae8e2; padding: 26px 22px 30px;
  box-shadow: 0 40px 80px -40px rgba(74,63,44,0.5);
}
.ph-brand { display: flex; align-items: center; gap: 8px; margin-bottom: 18px; }
.ph-brand span { font-family: 'Spectral', serif; font-weight: 500; font-size: 17px; color: #201e1a; }
.ph-day { font-family: 'Spectral', serif; font-size: 34px; color: #201e1a; line-height: 1; }
.ph-date { font-size: 13px; color: #8c8880; margin: 8px 0 22px; }
.ph-row {
  display: flex; align-items: center; justify-content: space-between;
  background: #f6f5f2; border: 1px solid #eae8e2; border-radius: 16px;
  padding: 13px 14px; margin-bottom: 10px;
}
.ph-name { font-size: 15px; font-weight: 600; color: #2a2825; }
.ph-pill {
  width: 30px; height: 30px; border-radius: 50%; display: flex;
  align-items: center; justify-content: center; font-size: 15px; font-weight: 700;
}
.ph-pill.done { background: #5f8a58; color: #fbf8f0; }
.ph-pill.partial { background: #c79433; color: #fbf8f0; }
.ph-pill.none { background: transparent; color: #c3b79b; border: 1.5px dashed #ddd9d0; }

.sec { padding: 20px 0 110px; }
.sec-head { margin-bottom: 56px; max-width: 560px; }
.sec-head.center { text-align: center; margin-left: auto; margin-right: auto; }
.lp-eyebrow { font-size: 13px; font-weight: 700; letter-spacing: 1px; color: #b0917d; text-transform: uppercase; margin-bottom: 14px; }
h2 { font-family: 'Spectral', serif; font-weight: 400; font-size: 46px; letter-spacing: -1.4px; margin: 0; color: #201e1a; line-height: 1.05; }

.cols-3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 0; }
.plat { padding: 30px 30px 30px 0; border-top: 1.5px solid #262420; }
.plat-title { font-family: 'Spectral', serif; font-size: 25px; font-weight: 500; color: #201e1a; margin: 6px 0 12px; }
.plat-body { font-size: 15.5px; line-height: 1.6; color: #6b6459; }
.plat-cta { display: inline-block; margin-top: 14px; font-size: 14.5px; font-weight: 700; color: #6d6fae; }
.plat-cta:hover { opacity: 0.7; }
.plat-soon { display: inline-block; margin-top: 14px; font-size: 14px; font-weight: 600; color: #b0a894; }
.plat-note { margin-top: 26px; font-size: 13px; color: #9a917f; line-height: 1.6; }

.steps { gap: 44px; }
.step { text-align: center; }
.step-n { font-family: 'Spectral', serif; font-size: 34px; color: #6d6fae; margin-bottom: 16px; }
.step-title { font-family: 'Spectral', serif; font-size: 22px; font-weight: 500; color: #201e1a; margin-bottom: 10px; }
.step-body { font-size: 15.5px; line-height: 1.6; color: #6b6459; max-width: 260px; margin: 0 auto; }

.strip {
  margin-top: 72px; display: flex; align-items: center; justify-content: center;
  gap: 40px; flex-wrap: wrap; padding: 30px 0;
  border-top: 1.5px solid #e2d9c8; border-bottom: 1.5px solid #e2d9c8;
}
.strip-lead { font-family: 'Spectral', serif; font-style: italic; font-size: 18px; color: #6b6459; }
.strip-item { display: flex; align-items: center; gap: 10px; }
.strip-item span { font-size: 14px; font-weight: 600; color: #6b6459; }
.strip-glyph {
  width: 38px; height: 38px; border-radius: 12px; display: flex;
  align-items: center; justify-content: center; font-size: 18px; font-weight: 700;
}
.strip-glyph.done { background: #e6efe1; color: #3f6b3a; }
.strip-glyph.partial { background: #f5ead1; color: #8a6414; }
.strip-glyph.miss { background: #f2e1d9; color: #9a5236; }
.strip-glyph.none { background: transparent; color: #b0a894; border: 1px dashed #d8cdb4; }

.philosophy { padding: 60px 0 110px; text-align: center; }
.quote { max-width: 760px; margin: 0 auto; font-family: 'Spectral', serif; font-weight: 400; font-size: 36px; line-height: 1.4; color: #201e1a; letter-spacing: -0.6px; }
.philosophy .btn-dark { margin-top: 48px; padding: 17px 38px; }

.foot { border-top: 1.5px solid #e2d9c8; padding: 30px 0 54px; display: flex; align-items: center; justify-content: space-between; color: #9a917f; font-size: 14px; }
.foot-brand span { font-family: 'Spectral', serif; font-size: 16px; color: #6b6459; font-weight: 400; }
.foot-links { display: flex; gap: 26px; align-items: center; }
.foot-links a { color: #9a917f; }

@media (max-width: 780px) {
  .wrap { padding: 0 20px; }
  .nav-links a:not(.nav-cta) { display: none; }
  .lp-hero { grid-template-columns: 1fr; gap: 40px; padding: 30px 0 70px; }
  h1 { font-size: 46px; letter-spacing: -1.5px; }
  .hero-copy p { font-size: 17px; }
  .phone-wrap { order: 2; }
  .cols-3 { grid-template-columns: 1fr; gap: 0; }
  .steps { gap: 36px; }
  .plat { padding: 24px 0; }
  h2 { font-size: 34px; }
  .quote { font-size: 26px; }
  .strip { gap: 20px 28px; }
}
</style>
