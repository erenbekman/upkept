<script setup lang="ts">
import trDict from '~/lang/tr'
import enDict from '~/lang/en'

const props = defineProps<{ lang: 'tr' | 'en' }>()
const L = props.lang === 'en' ? enDict.landing : trDict.landing
const fill = (s: string, n: number) => s.replace('{n}', String(n))
const home = props.lang === 'en' ? 'https://up-kept.app/en' : 'https://up-kept.app/'

useSeoMeta({
  title: L.seoTitle,
  description: L.seoDesc,
  ogTitle: L.seoTitle,
  ogDescription: L.ogDesc,
  ogImage: 'https://up-kept.app/og.png',
  ogUrl: home,
  ogLocale: props.lang === 'en' ? 'en_US' : 'tr_TR',
  twitterCard: 'summary_large_image',
  twitterTitle: L.seoTitle,
  twitterDescription: L.twDesc,
  twitterImage: 'https://up-kept.app/og.png',
})
useHead({
  htmlAttrs: { lang: props.lang },
  link: [
    { rel: 'canonical', href: home },
    { rel: 'alternate', hreflang: 'tr', href: 'https://up-kept.app/' },
    { rel: 'alternate', hreflang: 'en', href: 'https://up-kept.app/en' },
    { rel: 'alternate', hreflang: 'x-default', href: 'https://up-kept.app/' },
  ],
})

// Arriving on the English page is a language choice; carry it into the app
// unless the visitor already picked one there.
function startApp() {
  if (props.lang === 'en' && !localStorage.getItem('locale')) localStorage.setItem('locale', 'en')
}

// Installed contexts redirect to /app in middleware/installed-to-app.global.ts.

const DMG_URL = 'https://github.com/erenbekman/upkept/releases/latest/download/Upkept.dmg'
const IOS_URL = 'https://apps.apple.com/us/app/upkept/id6794236887'

// ---- "Fark" section (illustrative, static) ----
const missBtns = [
  { glyph: '✓', label: L.diff.buttons[0], border: '#e6ddc8', bg: '#fbf8f0', dotBg: '#5f8a58', labelColor: '#726a5e' },
  { glyph: '~', label: L.diff.buttons[1], border: '#e6ddc8', bg: '#fbf8f0', dotBg: '#ba8a2f', labelColor: '#726a5e' },
  { glyph: '✕', label: L.diff.buttons[2], border: '#c07d63', bg: '#f2e1d9', dotBg: '#bd7659', labelColor: '#9a5236' },
]
const missChips = L.diff.chips.map((label, i) => ({ label, on: i === 0 }))
const reasonBars = [
  { label: L.diff.reasons[0], count: 8, color: '#bd7659' },
  { label: L.diff.reasons[1], count: 5, color: '#c79433' },
  { label: L.diff.reasons[2], count: 4, color: '#6d6fae' },
  { label: L.diff.reasons[3], count: 3, color: '#9aa088' },
].map(r => ({ ...r, w: Math.round((r.count / 8) * 100) + '%' }))

// ---- Live demo date so the mockups never go stale ----
// Stable seed for prerender/hydration; onMounted shifts it to the real date on
// the client, so the phone + grid always show the current month/day.
const locale = props.lang === 'en' ? 'en-US' : 'tr-TR'
const today = ref(new Date(2026, 6, 24))
onMounted(() => { today.value = new Date() })

const dom = computed(() => today.value.getDate())
const dim = computed(() => new Date(today.value.getFullYear(), today.value.getMonth() + 1, 0).getDate())
const todayIdx = computed(() => dom.value - 1)
const phoneDay = computed(() => fill(L.phone.day, dom.value))
const phoneDate = computed(() => today.value.toLocaleDateString(locale, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))
const monthTitle = computed(() => today.value.toLocaleDateString(locale, { month: 'long', year: 'numeric' }))

// ---- Monthly grid showcase (illustrative) ----
function gmeta(s: string | null) {
  switch (s) {
    case 'done': return { glyph: '✓', bg: '#e6efe1', color: '#3f6b3a' }
    case 'partial': return { glyph: '~', bg: '#f5ead1', color: '#886214' }
    case 'miss': return { glyph: '✕', bg: '#f2e1d9', color: '#9a5236' }
    default: return { glyph: '·', bg: 'transparent', color: '#8e8778' }
  }
}
const PATTERNS = [
  'dddpdmdddpddnddddpddmd',
  'dddddddpdddddddpdddddd',
  'dpdmddpdnddpdmddpddnpd',
  'pdmdnddpdmddndpddmddnd',
  'ddnddpddndmddpddnddpdd',
]
const cm: Record<string, string | null> = { d: 'done', p: 'partial', m: 'miss', n: null }
const gDays = computed(() => Array.from({ length: dim.value }, (_, i) => ({
  n: i + 1,
  color: i === todayIdx.value ? '#6d6fae' : (i > todayIdx.value ? '#8e8778' : '#726a5e'),
})))
const gridRows = computed(() => L.grid.habits.map((name, h) => {
  const p = PATTERNS[h]
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
      color: none ? '#8e8778' : m.color,
      border: none ? '1px dashed #ece3ce' : '1px solid transparent',
      opacity: 1,
      today: i === todayIdx.value,
    })
  }
  return { name, cells }
}))
const gLegend = [
  { ...gmeta('done'), label: L.grid.legend[0], border: '1px solid transparent' },
  { ...gmeta('partial'), label: L.grid.legend[1], border: '1px solid transparent' },
  { ...gmeta('miss'), label: L.grid.legend[2], border: '1px solid transparent' },
  { glyph: '·', bg: 'transparent', color: '#8e8778', label: L.grid.legend[3], border: '1px dashed #e6ddc8' },
]

// ---- Steps / Privacy / Platforms ----
const steps = L.how.steps.map((st, i) => ({ n: String(i + 1), ...st }))
// Inline SVG, not emoji: these read as interface icons, and emoji render as a
// different picture on every platform.
const privacy = [
  {
    ...L.privacy.items[0],
    icon: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="m17 8 5 5M22 8l-5 5"/>',
  },
  {
    ...L.privacy.items[1],
    icon: '<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>',
  },
  {
    ...L.privacy.items[2],
    icon: '<path d="M12 20h.01"/><path d="M8.5 16.4a5 5 0 0 1 7 0"/><path d="M5 12.9a10 10 0 0 1 5.2-2.7"/><path d="M2 8.8a15 15 0 0 1 4.2-2.5"/><path d="m2 2 20 20"/><path d="M16.8 13.7a10 10 0 0 1 2.2-.8"/>',
  },
  {
    ...L.privacy.items[3],
    icon: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>',
  },
]
const platforms = [
  { ...L.platforms.items[0], soon: false, cta: { label: L.platforms.items[0].cta, to: '/app' } },
  { ...L.platforms.items[1], soon: false, cta: { label: L.platforms.items[1].cta, href: DMG_URL } },
  { ...L.platforms.items[2], soon: false, cta: { label: L.platforms.items[2].cta, href: IOS_URL } },
]

// ---- Hero phone mockup (mirrors the app's Bugün screen) ----
const PHONE_ROW_STYLE = [
  { subColor: '#726a5e', glyph: '+', dotBg: 'transparent', dotText: '#8e8778', dotBorder: '1.5px dashed #cdc2a8' },
  { subColor: '#3f6b3a', glyph: '✓', dotBg: '#5f8a58', dotText: '#ffffff', dotBorder: 'none' },
  { subColor: '#886214', glyph: '~', dotBg: '#ba8a2f', dotText: '#ffffff', dotBorder: 'none' },
  { subColor: '#9a5236', glyph: '✕', dotBg: '#bd7659', dotText: '#ffffff', dotBorder: 'none' },
  { subColor: '#726a5e', glyph: '+', dotBg: 'transparent', dotText: '#8e8778', dotBorder: '1.5px dashed #cdc2a8' },
]
const phoneRows = L.phone.rows.map((r, i) => ({ ...r, ...PHONE_ROW_STYLE[i] }))
const phoneTabs = [
  { label: 'today', icon: '☼', color: '#6d6fae' },
  { label: 'grid', icon: '▦', color: '#8e8778' },
  { label: 'stats', icon: '◔', color: '#8e8778' },
  { label: 'habits', icon: '❋', color: '#8e8778' },
  { label: 'settings', icon: '⚙︎', color: '#8e8778' },
]
</script>

<template>
  <div class="lp">
    <svg class="arc arc-tr" viewBox="0 0 600 600" aria-hidden="true">
      <path d="M470 220 A190 190 0 1 0 490 340" fill="none" stroke="#6d6fae" stroke-width="2" stroke-linecap="round" stroke-dasharray="620" />
      <circle cx="470" cy="140" r="14" fill="#6d6fae" opacity="0.5" />
    </svg>

    <a href="#main" class="skip">{{ L.skip }}</a>

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
          <a href="#fark">{{ L.nav.diff }}</a>
          <a href="#grid">{{ L.nav.grid }}</a>
          <a href="#how">{{ L.nav.how }}</a>
          <NuxtLink :to="lang === 'en' ? '/' : '/en'" class="nav-lang" :lang="lang === 'en' ? 'tr' : 'en'" :hreflang="lang === 'en' ? 'tr' : 'en'">{{ L.switchLabel }}</NuxtLink>
          <NuxtLink to="/app" class="nav-cta" @click="startApp">{{ L.nav.start }}</NuxtLink>
        </div>
      </nav>

      <!-- HERO -->
      <main id="main">
      <section class="lp-hero">
        <div class="hero-copy">
          <h1>{{ L.hero.title1 }}<br><span class="em">{{ L.hero.titleEm }}</span>{{ L.hero.title2 }}</h1>
          <p>{{ L.hero.text }}</p>
          <div class="hero-cta">
            <NuxtLink to="/app" class="btn-dark" @click="startApp">{{ L.hero.cta }}</NuxtLink>
            <a :href="IOS_URL" class="btn-store" target="_blank" rel="noopener"> {{ L.hero.store }}</a>
            <span class="hero-note">{{ L.hero.note }}</span>
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
          <div class="lp-eyebrow">{{ L.diff.eyebrow }}</div>
          <h2>{{ L.diff.titleA }}<span class="em">{{ L.diff.titleEm }}</span></h2>
          <p class="lead">{{ L.diff.lead }}<b>{{ L.diff.leadBold }}</b></p>
        </div>

        <div class="fark-two">
          <div class="lp-card miss-card">
            <div class="miss-title">{{ L.diff.habit }}</div>
            <div class="miss-sub">{{ L.diff.question }}</div>
            <div class="sbtns">
              <div v-for="b in missBtns" :key="b.label" class="sbtn" :style="{ borderColor: b.border, background: b.bg }">
                <div class="sdot" :style="{ background: b.dotBg }">{{ b.glyph }}</div>
                <div class="slabel" :style="{ color: b.labelColor }">{{ b.label }}</div>
              </div>
            </div>
            <div class="reason-label">{{ L.diff.reason }} <span>{{ L.diff.optional }}</span></div>
            <div class="fark-chips">
              <div
                v-for="c in missChips" :key="c.label" class="fark-chip"
                :style="c.on
                  ? { borderColor: '#6d6fae', background: '#6d6fae', color: '#ffffff' }
                  : { borderColor: '#e2d8c1', background: '#fbf8f0', color: '#6b6459' }"
              >{{ c.label }}</div>
            </div>
            <div class="note-prev">{{ L.diff.note }}</div>
          </div>

          <div class="lp-card summary-card">
            <div class="sum-eyebrow">{{ L.diff.overTime }}</div>
            <div class="sum-title">{{ L.diff.topReason }}</div>
            <div class="bars">
              <div v-for="r in reasonBars" :key="r.label" class="bar-row">
                <div class="bar-top">
                  <span class="bar-label">{{ r.label }}</span>
                  <span class="bar-count">{{ fill(L.diff.times, r.count) }}</span>
                </div>
                <div class="bar-track"><div class="bar-fill" :style="{ width: r.w, background: r.color }" /></div>
              </div>
            </div>
            <div class="sum-foot">{{ L.diff.foot }}</div>
          </div>
        </div>
      </section>

      <!-- AYLIK GRID -->
      <section id="grid" class="sec">
        <div class="sec-head wide">
          <div class="lp-eyebrow">{{ L.grid.eyebrow }}</div>
          <h2>{{ L.grid.titleA }}<span class="em">{{ L.grid.titleEm }}</span></h2>
          <p class="lead">{{ L.grid.lead }}</p>
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
          <!-- Column count as a custom property, not an inline grid-template: the
               phone layout has to restate the template and a hardcoded repeat(31)
               there left February's colour band 3 columns short of its label. -->
          <div class="monthgrid" aria-hidden="true" :style="{ '--cols': dim }">
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
          <div class="lp-eyebrow">{{ L.how.eyebrow }}</div>
          <h2>{{ L.how.titleA }}<span class="em">{{ L.how.titleEm }}</span></h2>
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
            <div class="lp-eyebrow">{{ L.privacy.eyebrow }}</div>
            <h2>{{ L.privacy.titleA }}<span class="em">{{ L.privacy.titleEm }}</span></h2>
            <p class="lead">{{ L.privacy.lead }}</p>
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
            <span>{{ L.privacy.foot }}</span>
          </div>
        </div>
      </section>

      <!-- PLATFORMLAR -->
      <section id="platforms" class="sec">
        <div class="sec-head wide">
          <div class="lp-eyebrow">{{ L.platforms.eyebrow }}</div>
          <h2>{{ L.platforms.titleA }}<span class="em">{{ L.platforms.titleEm }}</span></h2>
        </div>
        <div class="cols3">
          <div v-for="p in platforms" :key="p.title" class="plat" :class="{ soon: p.soon }">
            <div class="plat-head">
              <div class="plat-title">{{ p.title }}</div>
              <span v-if="p.soon" class="plat-badge">{{ L.platforms.soon }}</span>
            </div>
            <div class="plat-body">{{ p.body }}</div>
            <NuxtLink v-if="p.cta?.to" :to="p.cta.to" class="plat-cta" @click="startApp">{{ p.cta.label }} →</NuxtLink>
            <a v-else-if="p.cta?.href" :href="p.cta.href" class="plat-cta" target="_blank" rel="noopener">{{ p.cta.label }} ↓</a>
          </div>
        </div>
        <div class="plat-note">{{ L.platforms.note }}</div>
      </section>

      <!-- KAPANIŞ -->
      <section class="closing">
        <h2 class="close-h">{{ L.closing.titleA }}<span class="em">{{ L.closing.titleEm }}</span></h2>
        <p class="close-p">{{ L.closing.text }}</p>
        <NuxtLink to="/app" class="btn-dark" @click="startApp">{{ L.closing.cta }}</NuxtLink>
      </section>

      </main>

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
            <p class="foot-desc">{{ L.footer.desc }}</p>
          </div>
          <div>
            <div class="foot-col-title">{{ L.footer.app }}</div>
            <div class="foot-col">
              <NuxtLink to="/app" @click="startApp">Web</NuxtLink>
              <a href="#platforms">{{ L.footer.desktop }}</a>
              <a :href="IOS_URL" target="_blank" rel="noopener">iOS · App Store</a>
            </div>
          </div>
          <div>
            <div class="foot-col-title">upkept</div>
            <div class="foot-col">
              <NuxtLink :to="lang === 'en' ? '/privacy' : '/gizlilik'">{{ L.footer.privacy }}</NuxtLink>
              <a href="#how">{{ L.footer.how }}</a>
              <a href="mailto:erenbekman@gmail.com">{{ L.footer.contact }}</a>
            </div>
          </div>
        </div>
        <div class="foot-bottom">
          <span>© 2026 upkept</span>
          <span class="foot-quote">{{ L.footer.quote }}</span>
        </div>
      </footer>
    </div>
  </div>
</template>

<style scoped>
/* Text tones are verified against every surface this page paints on
   (#f7f4ed page, #fbf8f0 card, #f2ede2 soft, #fdfbf5 note, #f4efe3 phone):
   #726a5e clears AA 4.5:1 for copy, #8e8778 clears 3:1 for graphic glyphs, and
   #7d6758 is the eyebrow tan at 4.5:1. The lighter tones these replaced ran as
   low as 1.68:1. #6465a5 is the accent as small text; #6d6fae stays the fill.
   Locked by test/contrast.test.mjs. */
.lp {
  position: relative; min-height: 100dvh; overflow: hidden;
  background: #f7f4ed; color: #262420;
  font-family: 'Karla', system-ui, sans-serif;
}
.arc { position: absolute; pointer-events: none; }
/* Four nav links precede the content, so the first focusable thing is a way past
   them. Off-screen until focused. */
.skip {
  position: absolute; left: 8px; top: -60px; z-index: 50;
  background: #262420; color: #f7f4ed; font-weight: 700; font-size: var(--ms-md);
  padding: 12px 18px; border-radius: 0 0 12px 12px; transition: top 0.15s;
}
.skip:focus { top: 0; }
.arc-tr { top: -160px; right: -180px; width: 600px; height: 600px; opacity: 0.45; }
.arc-tr path { animation: drawArc 2.2s ease forwards; }
@keyframes drawArc { from { stroke-dashoffset: 620; } to { stroke-dashoffset: 0; } }
@keyframes fadeUp { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
@keyframes floaty { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-9px); } }

/* viewport-fit=cover is set globally, so landscape on a notched phone puts the
   viewport edge under the notch — the inline margin has to win against it. */
.wrap {
  position: relative; max-width: 1140px; margin: 0 auto;
  padding-inline: max(44px, env(safe-area-inset-left)) max(44px, env(safe-area-inset-right));
}

.nav { display: flex; align-items: center; justify-content: space-between; padding: 28px 0; }
.lp-brand { display: flex; align-items: center; gap: 10px; }
.lp-brand span { font-family: 'Spectral', serif; font-weight: 500; font-size: var(--ms-3xl); letter-spacing: -0.8px; color: #262420; }
.nav-links { display: flex; align-items: center; gap: 34px; font-size: var(--ms-md); font-weight: 600; color: #6b6459; }
.nav-links a { color: #6b6459; }
.nav-links a:hover { opacity: 0.7; }
.nav-lang { font-size: var(--ms-sm); padding: 6px 12px; border-radius: 999px; border: 1px solid #e2d8c1; }
.nav-cta { border: 1.5px solid #262420; color: #262420 !important; padding: 10px 20px; border-radius: 999px; font-weight: 700; }

.lp-hero { display: grid; grid-template-columns: 1fr 320px; gap: 56px; align-items: center; padding: 56px 0 88px; }
.hero-copy { animation: fadeUp 0.7s ease; }
h1 { font-family: 'Spectral', serif; font-weight: 400; font-size: var(--ms-8xl); line-height: 1.02; letter-spacing: -2.5px; margin: 0 0 24px; color: #201e1a; }
.em { font-style: italic; color: #6d6fae; }
.hero-copy p { font-size: var(--ms-2xl); line-height: 1.6; color: #6b6459; max-width: 430px; margin: 0 0 34px; text-wrap: pretty; }
.hero-cta { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
.btn-store { border: 1.5px solid #d8cfba; color: #4a463f !important; background: #fbf8f0; font-size: var(--ms-lg); font-weight: 700; padding: 14px 24px; border-radius: 999px; display: inline-block; }
.btn-store:hover { background: #f4efe2; }
.btn-dark { background: #262420; color: #f7f4ed !important; font-size: var(--ms-xl); font-weight: 700; padding: 16px 32px; border-radius: 999px; display: inline-block; }
.btn-dark:hover { opacity: 0.85; }
.hero-note { font-size: var(--ms-md); font-weight: 600; color: #726a5e; }

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
.ph-day, .ph-date, .mg-day, .bar-count, .grid-title {
  font-variant-numeric: tabular-nums;
}
.ph-day { font-family: 'Spectral', serif; font-size: 32px; font-weight: 500; line-height: 1; color: #33302b; letter-spacing: -0.8px; }
.ph-date { margin-top: 7px; font-size: 12.5px; color: #726a5e; font-weight: 500; }
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
.lp-eyebrow { font-size: var(--ms-sm); font-weight: 700; letter-spacing: 1px; color: #7d6758; text-transform: uppercase; margin-bottom: 12px; }
h2 { font-family: 'Spectral', serif; font-weight: 400; font-size: var(--ms-7xl); letter-spacing: -1.6px; margin: 0; color: #201e1a; line-height: 1.04; text-wrap: balance; }
.lead { font-size: var(--ms-2xl); line-height: 1.6; color: #6b6459; margin: 16px 0 0; text-wrap: pretty; }
.lead b, .sec-head b { color: #262420; font-weight: 600; }

.lp-card { background: #fbf8f0; border: 1px solid #eadfc9; border-radius: 26px; box-shadow: 0 20px 50px -34px rgba(74,63,44,0.5); }

/* Fark */
.fark-two { display: grid; grid-template-columns: 1.05fr 0.95fr; gap: 28px; align-items: stretch; }
.miss-card { padding: 30px 30px 32px; }
.miss-title { font-family: 'Spectral', serif; font-size: var(--ms-3xl); color: #33302b; margin-bottom: 4px; }
.miss-sub { font-size: var(--ms-md); color: #726a5e; margin-bottom: 20px; }
.sbtns { display: flex; gap: 10px; margin-bottom: 24px; }
.sbtn { flex: 1 1 0; min-width: 0; border: 2px solid; border-radius: 18px; padding: 16px 6px 13px; display: flex; flex-direction: column; align-items: center; gap: 8px; }
.sdot { width: 42px; height: 42px; border-radius: 50%; color: #ffffff; display: flex; align-items: center; justify-content: center; font-size: var(--ms-3xl); font-weight: 700; }
.slabel { font-size: var(--ms-xs); font-weight: 700; }
.reason-label { font-size: var(--ms-sm); color: #6b6459; font-weight: 600; margin-bottom: 12px; }
.reason-label span { color: #726a5e; font-weight: 500; }
.fark-chips { display: flex; flex-wrap: wrap; gap: 9px; margin-bottom: 18px; }
.fark-chip { border: 1.5px solid; font-size: var(--ms-md); font-weight: 600; padding: 9px 16px; border-radius: 999px; }
.note-prev { border: 1.5px solid #e2d8c1; background: #fdfbf5; border-radius: 14px; padding: 12px 15px; font-size: var(--ms-md); color: #726a5e; font-style: italic; }

.summary-card { background: #f2ede2; border-color: #e6dcc7; box-shadow: none; padding: 30px 30px 28px; display: flex; flex-direction: column; }
.sum-eyebrow { font-size: var(--ms-xs); font-weight: 700; letter-spacing: 0.5px; color: #726a5e; text-transform: uppercase; margin-bottom: 6px; }
.sum-title { font-family: 'Spectral', serif; font-size: var(--ms-4xl); color: #33302b; line-height: 1.15; margin-bottom: 22px; }
.bars { display: flex; flex-direction: column; gap: 16px; flex: 1; }
.bar-top { display: flex; justify-content: space-between; margin-bottom: 7px; }
.bar-label { font-size: var(--ms-lg); font-weight: 600; color: #3a352d; }
.bar-count { font-size: var(--ms-md); font-weight: 700; color: #726a5e; }
.bar-track { height: 9px; border-radius: 6px; background: #e3d9c6; overflow: hidden; }
.bar-fill { height: 100%; border-radius: 6px; }
.sum-foot { margin-top: 24px; font-family: 'Spectral', serif; font-style: italic; font-size: var(--ms-xl); color: #6b6459; line-height: 1.45; text-wrap: pretty; }

/* Grid showcase */
.grid-card { padding: 26px 26px 22px; overflow: hidden; }
.grid-head { display: flex; align-items: baseline; justify-content: space-between; margin-bottom: 18px; gap: 12px; flex-wrap: wrap; }
.grid-title { font-family: 'Spectral', serif; font-size: var(--ms-3xl); color: #33302b; }
.lp-legend { display: flex; gap: 16px; flex-wrap: wrap; }
.lp-legend-item { display: flex; align-items: center; gap: 6px; }
.lp-legend-box { width: 18px; height: 18px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: var(--ms-2xs); font-weight: 700; }
.lp-legend-item span { font-size: var(--ms-xs); color: #726a5e; font-weight: 600; }
/* Fractional day columns, so all 28-31 days fit whatever the width is.
   Column count comes from the template (the month's real length). */
.monthgrid {
  display: grid; gap: 5px 3px; align-items: center;
  grid-template-columns: minmax(60px, 128px) repeat(var(--cols), minmax(0, 1fr));
}
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
   label gets its own line and the month becomes a full-width colour band. */
@media (max-width: 640px) {
  .monthgrid { grid-template-columns: repeat(var(--cols), minmax(0, 1fr)); gap: 3px 2px; }
  .mg-corner, .mg-day { display: none; }
  .mg-name { grid-column: 1 / -1; font-size: 13px; padding: 10px 0 2px; }
  .mg-cell { border-radius: 3px; }
  /* A 2px ring on an 8px cell reads as a blob and breaks the band's rhythm. */
  .mg-cell.mg-today { box-shadow: 0 0 0 1.5px #6d6fae; border-radius: 2px; }
}

/* 3-column layout (how + platforms) */
.cols3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 40px; }
.hstep { border-top: 1.5px solid #262420; padding-top: 22px; }
.hstep-n { font-family: 'Spectral', serif; font-size: var(--ms-5xl); color: #6d6fae; margin-bottom: 12px; }
.hstep-title { font-family: 'Spectral', serif; font-size: var(--ms-3xl); font-weight: 500; color: #201e1a; margin-bottom: 8px; }
.hstep-body { font-size: var(--ms-lg); line-height: 1.6; color: #6b6459; text-wrap: pretty; }

/* Privacy */
.privacy-card { background: #f2ede2; border: 1px solid #e6dcc7; border-radius: 26px; padding: 44px 44px 40px; }
.privacy-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 18px; }
.pv { background: #fbf8f0; border: 1px solid #e6dcc7; border-radius: 18px; padding: 22px 20px 20px; }
.pv-ic {
  width: 38px; height: 38px; border-radius: 11px; margin-bottom: 14px;
  display: flex; align-items: center; justify-content: center;
  background: #eceaf5; color: #6d6fae;
}
.pv-title { font-family: 'Spectral', serif; font-size: var(--ms-2xl); font-weight: 500; color: #201e1a; margin-bottom: 6px; }
.pv-body { font-size: var(--ms-md); line-height: 1.55; color: #6b6459; text-wrap: pretty; }
.pv-foot {
  display: flex; align-items: center; justify-content: center; gap: 9px;
  margin-top: 26px; color: #726a5e; font-size: var(--ms-md);
  font-family: 'Spectral', serif; font-style: italic;
}

/* Platforms */
.plat { border-top: 1.5px solid #262420; padding-top: 22px; }
.plat.soon { opacity: 0.55; border-top-color: #d8cdb4; }
.plat-head { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.plat-title { font-family: 'Spectral', serif; font-size: var(--ms-3xl); font-weight: 500; color: #201e1a; }
.plat-badge { font-size: var(--ms-2xs); font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; color: #726a5e; border: 1px solid #d8cdb4; padding: 3px 9px; border-radius: 999px; }
.plat-body { font-size: var(--ms-lg); line-height: 1.6; color: #6b6459; text-wrap: pretty; }
.plat-cta { display: inline-block; margin-top: 14px; font-size: var(--ms-md); font-weight: 700; color: #6465a5; }
.plat-cta:hover { opacity: 0.7; }
.plat-note { margin-top: 26px; font-size: var(--ms-sm); color: #726a5e; line-height: 1.6; text-wrap: pretty; }

/* Closing */
.closing { padding: 30px 0 80px; text-align: center; }
.close-h { font-size: var(--ms-7xl); letter-spacing: -1.8px; max-width: 640px; margin: 0 auto 12px; line-height: 1.08; text-wrap: balance; }
.close-p { font-size: var(--ms-xl); color: #6b6459; margin: 0 0 30px; }
.closing .btn-dark { padding: 17px 40px; }

/* Footer */
.foot { border-top: 1.5px solid #e2d9c8; padding: 40px 0 56px; }
.foot-top { display: grid; grid-template-columns: 1.4fr 1fr 1fr; gap: 32px; margin-bottom: 36px; }
.foot-desc { font-size: var(--ms-lg); line-height: 1.55; color: #726a5e; max-width: 300px; margin: 0; text-wrap: pretty; }
.foot-col-title { font-size: var(--ms-xs); font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase; color: #726a5e; margin-bottom: 14px; }
.foot-col { display: flex; flex-direction: column; gap: 10px; font-size: var(--ms-lg); font-weight: 600; }
.foot-col a { color: #6b6459; }
.foot-bottom { display: flex; align-items: center; justify-content: space-between; border-top: 1px solid #eadfc9; padding-top: 20px; font-size: var(--ms-sm); color: #726a5e; gap: 16px; flex-wrap: wrap; }
.foot-quote { font-family: 'Spectral', serif; font-style: italic; }

/* The hero breaks here, not at 780: below ~940px the copy column drops under
   460px and the 74px headline goes from two lines to three — measured 226px
   tall across the whole 781–900 band before the old breakpoint rescued it. */
@media (max-width: 940px) {
  .lp-hero { grid-template-columns: 1fr; gap: 40px; }
}
@media (max-width: 860px) {
  .fark-two { grid-template-columns: 1fr; }
  .privacy-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 780px) {
  .wrap { padding-inline: max(20px, env(safe-area-inset-left)) max(20px, env(safe-area-inset-right)); }
  /* The three anchors used to vanish outright with nothing standing in for
     them. They fit on one line down to ~390px and wrap below that. */
  .nav { flex-wrap: wrap; row-gap: 14px; }
  .nav-links { flex-wrap: wrap; gap: 18px; }
  .lp-hero { padding: 24px 0 60px; }
  h1 { letter-spacing: -1.5px; }
  .phone-wrap { order: 2; }
  .close-h { letter-spacing: -1px; }
  .cols3 { grid-template-columns: 1fr; gap: 32px; }
  .privacy-grid { grid-template-columns: 1fr; gap: 22px; }
  .privacy-card { padding: 32px 24px 30px; }
  .foot-top { grid-template-columns: 1fr; gap: 28px; }
  .sec { padding: 30px 0 64px; }
}
</style>
