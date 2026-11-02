<script setup lang="ts">
import trDict from '~/lang/tr'
import enDict from '~/lang/en'
import type { FillLayer } from '~/composables/useDayFill'

const props = defineProps<{ lang: 'tr' | 'en' }>()
const L = props.lang === 'en' ? enDict.landing : trDict.landing
const fill = (s: string, n: number) => s.replace('{n}', String(n))
const home = props.lang === 'en' ? 'https://up-kept.app/' : 'https://up-kept.app/tr'

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
  meta: [{ name: 'theme-color', content: '#f3f4f6' }],
  link: [
    { rel: 'canonical', href: home },
    { rel: 'alternate', hreflang: 'en', href: 'https://up-kept.app/' },
    { rel: 'alternate', hreflang: 'tr', href: 'https://up-kept.app/tr' },
    { rel: 'alternate', hreflang: 'x-default', href: 'https://up-kept.app/' },
  ],
})

function startApp() {
  if (!localStorage.getItem('locale')) localStorage.setItem('locale', props.lang)
}

const DMG_URL = 'https://github.com/erenbekman/upkept/releases/latest/download/Upkept.dmg'
const IOS_URL = 'https://apps.apple.com/us/app/upkept/id6794236887'

type DemoState = 'none' | 'done' | 'partial' | 'rest'
const DEMO_COLORS = ['#078df1', '#04a64c', '#8d6df9', '#d76506']
const NEXT: Record<DemoState, DemoState> = { none: 'done', done: 'partial', partial: 'rest', rest: 'none' }
const INITIAL: DemoState[] = ['partial', 'done', 'none', 'none']
const demo = ref<DemoState[]>([...INITIAL])
const weight = (s: DemoState) => (s === 'done' || s === 'rest' ? 1 : s === 'partial' ? 0.5 : 0)
const demoLayers = computed<FillLayer[]>(() => demo.value.map((s, i) => ({
  id: i + 1, color: DEMO_COLORS[i], value: weight(s) / demo.value.length, faded: s === 'rest',
})))
const demoPct = computed(() => Math.round(demoLayers.value.reduce((a, l) => a + l.value, 0) * 100))
const flash = ref(false)
let flashTimer: ReturnType<typeof setTimeout>
function cycle(i: number) {
  const before = demoPct.value
  demo.value[i] = NEXT[demo.value[i]]
  if (before < 100 && demoPct.value === 100) {
    flash.value = true
    clearTimeout(flashTimer)
    flashTimer = setTimeout(() => { flash.value = false }, 1600)
  }
}
const resetDemo = () => { demo.value = [...INITIAL] }
onUnmounted(() => clearTimeout(flashTimer))

const missChips = L.diff.chips.map((label, i) => ({ label, on: i === 0 }))
const reasonBars = [
  { label: L.diff.reasons[0], count: 8 },
  { label: L.diff.reasons[1], count: 5 },
  { label: L.diff.reasons[2], count: 4 },
  { label: L.diff.reasons[3], count: 3 },
].map(r => ({ ...r, w: Math.round((r.count / 8) * 100) + '%' }))

const SHOTS = ['month-dark', 'grid-dark', 'numbers-dark']
const progress = L.progress.items.map((it, i) => ({ ...it, src: `/landing/${SHOTS[i]}.webp` }))

const STEP_FILL = [1 / 3, 2 / 3, 1]
const steps = L.how.steps.map((st, i) => ({
  n: String(i + 1),
  layers: [{ id: 1, color: '#ff5a36', value: STEP_FILL[i], faded: false }] as FillLayer[],
  ...st,
}))

const privacy = [
  { ...L.privacy.items[0], icon: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="m17 8 5 5M22 8l-5 5"/>' },
  { ...L.privacy.items[1], icon: '<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>' },
  { ...L.privacy.items[2], icon: '<path d="M12 20h.01"/><path d="M8.5 16.4a5 5 0 0 1 7 0"/><path d="M5 12.9a10 10 0 0 1 5.2-2.7"/><path d="M2 8.8a15 15 0 0 1 4.2-2.5"/><path d="m2 2 20 20"/><path d="M16.8 13.7a10 10 0 0 1 2.2-.8"/>' },
  { ...L.privacy.items[3], icon: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/>' },
]
const platforms = [
  { ...L.platforms.items[0], cta: { label: L.platforms.items[0].cta, to: '/app' } },
  { ...L.platforms.items[1], cta: { label: L.platforms.items[1].cta, href: DMG_URL } },
  { ...L.platforms.items[2], cta: { label: L.platforms.items[2].cta, href: IOS_URL } },
]
</script>

<template>
  <div class="lp">
    <a href="#main" class="skip">{{ L.skip }}</a>

    <div class="wrap">
      <nav class="nav">
        <NuxtLink :to="lang === 'en' ? '/' : '/tr'" class="lp-brand">
          <BrandMark class="lp-mark" />
          <span>upkept</span>
        </NuxtLink>
        <div class="nav-links">
          <a href="#fill">{{ L.nav.fill }}</a>
          <a href="#progress">{{ L.nav.progress }}</a>
          <a href="#widget">{{ L.nav.widget }}</a>
          <NuxtLink
            :to="lang === 'en' ? '/tr' : '/'" class="nav-lang"
            :lang="lang === 'en' ? 'tr' : 'en'" :hreflang="lang === 'en' ? 'tr' : 'en'" :aria-label="L.switchLabel" :title="L.switchLabel"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="10" />
              <path d="M2 12h20" />
              <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
            </svg>
            <span>{{ lang === 'en' ? 'TR' : 'EN' }}</span>
          </NuxtLink>
          <NuxtLink to="/app" class="nav-cta" @click="startApp">{{ L.nav.start }}</NuxtLink>
        </div>
      </nav>

      <main id="main">
        <section class="hero">
          <div class="hero-copy">
            <h1>{{ L.hero.title1 }}<br><span class="em">{{ L.hero.titleEm }}</span>{{ L.hero.title2 }}</h1>
            <p>{{ L.hero.text }}</p>
            <div class="hero-cta">
              <NuxtLink to="/app" class="btn-dark" @click="startApp">{{ L.hero.cta }}</NuxtLink>
              <a :href="IOS_URL" class="btn-light" target="_blank" rel="noopener">{{ L.hero.store }}</a>
            </div>
            <span class="hero-note">{{ L.hero.note }}</span>
          </div>
          <div class="hero-shot">
            <div class="device"><img src="/landing/today-dark.webp" :alt="L.hero.shot" width="320" height="696" fetchpriority="high"></div>
          </div>
        </section>

        <section id="fill" class="sec">
          <div class="sec-head">
            <div class="eyebrow">{{ L.fill.eyebrow }}</div>
            <h2>{{ L.fill.titleA }}<span class="em">{{ L.fill.titleEm }}</span></h2>
            <p class="lead">{{ L.fill.lead }}</p>
          </div>
          <div class="card demo">
            <div class="demo-num">
              <div class="demo-top">
                <span>{{ L.fill.day }}</span>
                <span class="demo-pct">{{ fill(L.fill.full, demoPct) }}</span>
              </div>
              <FillNumber text="40" :layers="demoLayers" :label="fill(L.fill.aria, demoPct)" live :flash="flash">
                <div v-if="flash" class="k-number-flash">{{ L.fill.complete }}</div>
              </FillNumber>
            </div>
            <div class="demo-rows">
              <button
                v-for="(name, i) in L.fill.habits" :key="name" type="button" class="demo-row"
                :class="demo[i]" :style="{ '--c': DEMO_COLORS[i] }" @click="cycle(i)"
              >
                <span class="demo-dot" aria-hidden="true" />
                <span class="demo-name">{{ name }}</span>
                <span class="demo-state">{{ L.fill.states[demo[i]] }}</span>
              </button>
              <button type="button" class="demo-reset" @click="resetDemo">{{ L.fill.reset }}</button>
            </div>
          </div>
        </section>

        <section id="fark" class="sec">
          <div class="sec-head">
            <div class="eyebrow">{{ L.diff.eyebrow }}</div>
            <h2>{{ L.diff.titleA }}<span class="em">{{ L.diff.titleEm }}</span></h2>
            <p class="lead">{{ L.diff.lead }}<b>{{ L.diff.leadBold }}</b></p>
          </div>
          <div class="two">
            <div class="card miss">
              <div class="miss-title">{{ L.diff.habit }}</div>
              <div class="miss-sub">{{ L.diff.question }}</div>
              <div class="opts">
                <div v-for="(b, i) in L.diff.buttons" :key="b" class="opt" :class="{ on: i === 3 }">{{ b }}</div>
              </div>
              <div class="reason-label">{{ L.diff.reason }} <span>· {{ L.diff.optional }}</span></div>
              <div class="chips">
                <div v-for="c in missChips" :key="c.label" class="chip" :class="{ on: c.on }">{{ c.label }}</div>
              </div>
            </div>
            <div class="card summary">
              <div class="sum-eyebrow">{{ L.diff.overTime }}</div>
              <div class="sum-head">{{ L.diff.topReason }}</div>
              <div class="bars">
                <div v-for="r in reasonBars" :key="r.label" class="bar">
                  <div class="bar-top"><span>{{ r.label }}</span><span class="bar-count">{{ fill(L.diff.times, r.count) }}</span></div>
                  <div class="bar-track"><div class="bar-fill" :style="{ width: r.w }" /></div>
                </div>
              </div>
              <div class="sum-foot">{{ L.diff.foot }}</div>
            </div>
          </div>
        </section>

        <section id="progress" class="sec">
          <div class="sec-head">
            <div class="eyebrow">{{ L.progress.eyebrow }}</div>
            <h2>{{ L.progress.titleA }}<span class="em">{{ L.progress.titleEm }}</span></h2>
            <p class="lead">{{ L.progress.lead }}</p>
          </div>
          <div class="cols3">
            <figure v-for="p in progress" :key="p.title" class="shot">
              <div class="device sm"><img :src="p.src" :alt="p.alt" width="260" height="565" loading="lazy"></div>
              <figcaption>
                <div class="col-title">{{ p.title }}</div>
                <div class="col-body">{{ p.body }}</div>
              </figcaption>
            </figure>
          </div>
        </section>

        <section id="widget" class="sec">
          <div class="card widget-card">
            <div class="widget-copy">
              <div class="eyebrow">{{ L.widget.eyebrow }}</div>
              <h2>{{ L.widget.titleA }}<span class="em">{{ L.widget.titleEm }}</span></h2>
              <p class="lead">{{ L.widget.lead }}</p>
              <ul class="points">
                <li v-for="pt in L.widget.points" :key="pt">{{ pt }}</li>
              </ul>
            </div>
            <img class="widget-img" src="/landing/widgets.webp" :alt="L.widget.alt" width="400" height="392" loading="lazy">
          </div>
        </section>

        <section id="how" class="sec">
          <div class="sec-head">
            <div class="eyebrow">{{ L.how.eyebrow }}</div>
            <h2>{{ L.how.titleA }}<span class="em">{{ L.how.titleEm }}</span></h2>
          </div>
          <div class="cols3">
            <div v-for="s in steps" :key="s.n" class="step">
              <FillNumber class="step-num" :text="s.n" :layers="s.layers" :label="s.n" />
              <div class="col-title">{{ s.title }}</div>
              <div class="col-body">{{ s.body }}</div>
            </div>
          </div>
        </section>

        <section id="gizlilik" class="sec">
          <div class="card privacy">
            <div class="sec-head">
              <div class="eyebrow">{{ L.privacy.eyebrow }}</div>
              <h2>{{ L.privacy.titleA }}<span class="em">{{ L.privacy.titleEm }}</span></h2>
              <p class="lead">{{ L.privacy.lead }}</p>
            </div>
            <div class="pv-grid">
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
            <div class="pv-foot">{{ L.privacy.foot }}</div>
          </div>
        </section>

        <section id="platforms" class="sec">
          <div class="sec-head">
            <div class="eyebrow">{{ L.platforms.eyebrow }}</div>
            <h2>{{ L.platforms.titleA }}<span class="em">{{ L.platforms.titleEm }}</span></h2>
          </div>
          <div class="cols3">
            <div v-for="p in platforms" :key="p.title" class="card plat">
              <div class="col-title">{{ p.title }}</div>
              <div class="col-body">{{ p.body }}</div>
              <NuxtLink v-if="p.cta.to" :to="p.cta.to" class="plat-cta" @click="startApp">{{ p.cta.label }} →</NuxtLink>
              <a v-else :href="p.cta.href" class="plat-cta" target="_blank" rel="noopener">{{ p.cta.label }} ↓</a>
            </div>
          </div>
          <div class="plat-note">{{ L.platforms.note }}</div>
        </section>

        <section class="closing">
          <BrandMark class="close-mark" />
          <h2>{{ L.closing.titleA }}<span class="em">{{ L.closing.titleEm }}</span></h2>
          <p>{{ L.closing.text }}</p>
          <NuxtLink to="/app" class="btn-dark" @click="startApp">{{ L.closing.cta }}</NuxtLink>
        </section>
      </main>

      <footer class="foot">
        <div class="foot-top">
          <div>
            <div class="lp-brand foot-brand">
              <BrandMark class="lp-mark" />
              <span>upkept</span>
            </div>
            <p class="foot-desc">{{ L.footer.desc }}</p>
          </div>
          <div>
            <div class="foot-title">{{ L.footer.app }}</div>
            <div class="foot-col">
              <NuxtLink to="/app" @click="startApp">Web</NuxtLink>
              <a href="#platforms">{{ L.footer.desktop }}</a>
              <a :href="IOS_URL" target="_blank" rel="noopener">iOS · App Store</a>
            </div>
          </div>
          <div>
            <div class="foot-title">upkept</div>
            <div class="foot-col">
              <NuxtLink :to="lang === 'en' ? '/privacy' : '/gizlilik'">{{ L.footer.privacy }}</NuxtLink>
              <a href="#how">{{ L.footer.how }}</a>
              <a href="mailto:erenbekman@gmail.com">{{ L.footer.contact }}</a>
            </div>
          </div>
        </div>
        <div class="foot-bottom">
          <span>© 2026 upkept</span>
          <span>{{ L.footer.quote }}</span>
        </div>
      </footer>
    </div>
  </div>
</template>

<style scoped>
.lp {
  --k-bg: #f3f4f6; --k-card: #ffffff; --k-fill: #e9ebee; --k-empty: #e3e5ea;
  --k-ink: #111114; --k-sub: #62656e; --k-accent: #ff5a36; --k-accent-ink: #bb381a;
  --k-font: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', system-ui, 'Segoe UI', Roboto, sans-serif;
  --em: #e8441e;
  position: relative; min-height: 100dvh; overflow: hidden;
  background: var(--k-bg); color: var(--k-ink); font-family: var(--k-font);
  -webkit-font-smoothing: antialiased;
}
.skip {
  position: absolute; left: 8px; top: -60px; z-index: 50;
  background: var(--k-ink); color: #fff; font-weight: 700; font-size: 15px;
  padding: 12px 18px; border-radius: 0 0 12px 12px; transition: top 0.15s;
}
.skip:focus { top: 0; }
@keyframes fadeUp { from { opacity: 0; transform: translateY(18px); } to { opacity: 1; transform: translateY(0); } }
@keyframes floaty { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-9px); } }

.wrap {
  max-width: 1140px; margin: 0 auto;
  padding-inline: max(44px, env(safe-area-inset-left)) max(44px, env(safe-area-inset-right));
}

.nav { display: flex; align-items: center; justify-content: space-between; padding: 26px 0; gap: 16px; }
.lp-brand { display: flex; align-items: center; gap: 10px; color: var(--k-ink); }
.lp-brand span { font-weight: 800; font-size: 22px; letter-spacing: -0.04em; }
.lp-mark { width: 26px; height: 28px; color: var(--k-ink); }
.nav-links { display: flex; align-items: center; gap: 28px; font-size: 15px; font-weight: 600; }
.nav-links a { color: var(--k-sub); }
.nav-links a:hover { color: var(--k-ink); }
.nav-lang { display: inline-flex; align-items: center; gap: 6px; min-height: 36px; font-size: 13px; font-weight: 700; letter-spacing: 0.04em; padding: 6px 12px; border-radius: 999px; background: var(--k-card); }
.nav-cta { background: var(--k-ink); color: #fff !important; padding: 10px 20px; border-radius: 999px; font-weight: 700; }

.hero { display: grid; grid-template-columns: 1fr 340px; gap: 56px; align-items: center; padding: 48px 0 96px; }
.hero-copy { animation: fadeUp 0.7s ease; }
h1 { font-weight: 850; font-size: clamp(52px, 7.4vw, 92px); line-height: 0.98; letter-spacing: -0.045em; margin: 0 0 26px; text-wrap: balance; }
.em { color: var(--em); }
.hero-copy p { font-size: 20px; line-height: 1.5; color: var(--k-sub); max-width: 470px; margin: 0 0 32px; font-weight: 500; text-wrap: pretty; }
.hero-cta { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
.btn-dark { background: var(--k-ink); color: #fff !important; font-size: 17px; font-weight: 700; padding: 16px 30px; border-radius: 999px; display: inline-block; transition: transform 0.15s; }
.btn-dark:hover { transform: translateY(-1px); }
.btn-light { background: var(--k-card); color: var(--k-ink) !important; font-size: 16px; font-weight: 700; padding: 15px 24px; border-radius: 999px; display: inline-block; box-shadow: 0 10px 30px -18px rgba(17,17,20,0.35); }
.hero-note { display: block; margin-top: 18px; font-size: 14px; font-weight: 600; color: var(--k-sub); }
.hero-shot { justify-self: center; animation: floaty 6s ease-in-out infinite; }

.device { background: #0b0b0d; padding: 10px; border-radius: 52px; box-shadow: 0 50px 90px -40px rgba(17,17,20,0.6), inset 0 0 0 1px rgba(255,255,255,0.08); }
.device img { display: block; width: 320px; height: auto; border-radius: 43px; }
.device.sm { padding: 8px; border-radius: 42px; }
.device.sm img { width: 100%; border-radius: 35px; }

.sec { padding: 24px 0 96px; }
.sec-head { max-width: 640px; margin-bottom: 40px; }
.eyebrow { font-size: 13px; font-weight: 750; letter-spacing: 0.14em; color: var(--k-accent-ink); margin-bottom: 14px; }
h2 { font-weight: 820; font-size: clamp(36px, 4.6vw, 56px); letter-spacing: -0.04em; line-height: 1.02; margin: 0; text-wrap: balance; }
.lead { font-size: 19px; line-height: 1.55; color: var(--k-sub); margin: 18px 0 0; font-weight: 500; text-wrap: pretty; }
.lead b { color: var(--k-ink); font-weight: 700; }
.card { background: var(--k-card); border-radius: 30px; box-shadow: 0 24px 60px -40px rgba(17,17,20,0.35); }

.demo { display: grid; grid-template-columns: 1.15fr 1fr; gap: 36px; align-items: center; padding: 34px 38px; }
.demo-top { display: flex; justify-content: space-between; font-size: 15px; font-weight: 700; color: var(--k-sub); padding: 0 6px 4px; }
.demo-pct { color: var(--k-accent-ink); font-variant-numeric: tabular-nums; }
.demo-rows { display: flex; flex-direction: column; gap: 10px; }
.demo-row {
  position: relative; display: flex; align-items: center; gap: 12px; width: 100%;
  min-height: 60px; padding: 0 18px; border: 0; border-radius: 20px; cursor: pointer; overflow: hidden;
  background: var(--k-fill); color: var(--k-ink); font: inherit; text-align: left;
  transition: background-color 0.25s, color 0.25s, transform 0.12s;
}
.demo-row:active { transform: scale(0.98); }
.demo-row::before { content: ""; position: absolute; inset: 0 auto 0 0; width: 0; background: var(--c); opacity: 0.22; transition: width 0.35s ease; }
.demo-row.partial::before { width: 50%; }
.demo-row.done { background: var(--c); color: #fff; }
.demo-row.rest { background: color-mix(in srgb, var(--c) 30%, var(--k-fill)); }
.demo-dot { position: relative; width: 14px; height: 14px; border-radius: 50%; border: 2.5px solid var(--c); flex: none; }
.demo-row.done .demo-dot { border-color: #fff; background: #fff; }
.demo-name { position: relative; flex: 1; font-size: 17px; font-weight: 650; }
.demo-state { position: relative; font-size: 14px; font-weight: 700; opacity: 0.75; }
.demo-reset { align-self: flex-end; margin-top: 4px; border: 0; background: none; font: inherit; font-size: 14px; font-weight: 700; color: var(--k-sub); cursor: pointer; padding: 6px 4px; }

.two { display: grid; grid-template-columns: 1.05fr 0.95fr; gap: 24px; }
.miss, .summary { padding: 32px; }
.miss-title { font-size: 26px; font-weight: 800; letter-spacing: -0.03em; }
.miss-sub { font-size: 16px; color: var(--k-sub); margin: 4px 0 20px; font-weight: 500; }
.opts { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 24px; }
.opt { min-height: 48px; border-radius: 16px; background: var(--k-fill); display: grid; place-items: center; font-size: 15px; font-weight: 700; color: var(--k-ink); }
.opt.on { background: var(--k-ink); color: #fff; }
.reason-label { font-size: 15px; font-weight: 700; margin-bottom: 12px; }
.reason-label span { color: var(--k-sub); font-weight: 600; }
.chips { display: flex; flex-wrap: wrap; gap: 8px; }
.chip { font-size: 15px; font-weight: 650; padding: 10px 16px; border-radius: 999px; background: var(--k-fill); }
.chip.on { background: var(--k-accent); color: var(--k-ink); }
.summary { background: var(--k-ink); color: #fff; display: flex; flex-direction: column; }
.sum-eyebrow { font-size: 15px; font-weight: 700; color: #a3a7b0; }
.sum-head { font-size: 30px; font-weight: 800; letter-spacing: -0.03em; margin: 6px 0 22px; }
.bars { display: flex; flex-direction: column; gap: 16px; flex: 1; }
.bar-top { display: flex; justify-content: space-between; font-size: 16px; font-weight: 650; margin-bottom: 7px; }
.bar-count { color: #a3a7b0; font-variant-numeric: tabular-nums; }
.bar-track { height: 10px; border-radius: 6px; background: #2a2d34; overflow: hidden; }
.bar-fill { height: 100%; border-radius: 6px; background: var(--k-accent); }
.sum-foot { margin-top: 24px; font-size: 16px; line-height: 1.5; color: #a3a7b0; font-weight: 500; }

.cols3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 32px; }
.shot { margin: 0; }
.shot .device { max-width: 280px; margin: 0 auto 24px; }
.col-title { font-size: 22px; font-weight: 800; letter-spacing: -0.03em; margin-bottom: 8px; }
.col-body { font-size: 16px; line-height: 1.55; color: var(--k-sub); font-weight: 500; text-wrap: pretty; }

.widget-card { display: grid; grid-template-columns: 1fr 400px; gap: 40px; align-items: center; padding: 48px; background: var(--k-fill); box-shadow: none; }
.widget-img { width: 100%; height: auto; display: block; }
.points { list-style: none; padding: 0; margin: 26px 0 0; display: flex; flex-direction: column; gap: 10px; }
.points li { display: flex; align-items: center; gap: 12px; font-size: 16px; font-weight: 650; }
.points li::before { content: ""; width: 10px; height: 10px; border-radius: 50%; background: var(--k-accent); flex: none; }

.step-num { width: 120px; margin: 0 0 12px -8px; }

.privacy { padding: 48px; }
.pv-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.pv { background: var(--k-fill); border-radius: 22px; padding: 22px 20px; }
.pv-ic { width: 40px; height: 40px; border-radius: 12px; margin-bottom: 14px; display: grid; place-items: center; background: var(--k-card); color: var(--k-ink); }
.pv-title { font-size: 18px; font-weight: 800; letter-spacing: -0.02em; margin-bottom: 6px; }
.pv-body { font-size: 15px; line-height: 1.5; color: var(--k-sub); font-weight: 500; text-wrap: pretty; }
.pv-foot { margin-top: 26px; text-align: center; color: var(--k-sub); font-size: 15px; font-weight: 600; }

.plat { padding: 28px; display: flex; flex-direction: column; }
.plat .col-body { flex: 1; }
.plat-cta { margin-top: 18px; font-size: 15px; font-weight: 750; color: var(--k-accent-ink); }
.plat-cta:hover { opacity: 0.75; }
.plat-note { margin-top: 24px; font-size: 14px; color: var(--k-sub); line-height: 1.6; font-weight: 500; }

.closing { padding: 40px 0 96px; text-align: center; display: flex; flex-direction: column; align-items: center; }
.close-mark { width: 64px; height: 68px; color: var(--k-ink); margin-bottom: 28px; }
.closing h2 { max-width: 720px; }
.closing p { font-size: 19px; color: var(--k-sub); margin: 16px 0 30px; font-weight: 500; }

.foot { border-top: 1px solid #e3e5ea; padding: 40px 0 56px; }
.foot-top { display: grid; grid-template-columns: 1.4fr 1fr 1fr; gap: 32px; margin-bottom: 36px; }
.foot-brand { margin-bottom: 14px; }
.foot-desc { font-size: 16px; line-height: 1.55; color: var(--k-sub); max-width: 300px; margin: 0; font-weight: 500; }
.foot-title { font-size: 15px; font-weight: 750; color: var(--k-sub); margin-bottom: 14px; }
.foot-col { display: flex; flex-direction: column; gap: 10px; font-size: 16px; font-weight: 650; }
.foot-col a { color: var(--k-ink); }
.foot-bottom { display: flex; justify-content: space-between; gap: 16px; flex-wrap: wrap; border-top: 1px solid #e3e5ea; padding-top: 20px; font-size: 14px; color: var(--k-sub); font-weight: 500; }

@media (max-width: 940px) {
  .hero { grid-template-columns: 1fr; gap: 48px; }
  .demo, .two, .widget-card { grid-template-columns: 1fr; }
  .pv-grid { grid-template-columns: repeat(2, 1fr); }
}
@media (max-width: 780px) {
  .wrap { padding-inline: max(16px, env(safe-area-inset-left)) max(16px, env(safe-area-inset-right)); }
  .nav { flex-wrap: wrap; row-gap: 14px; }
  .nav-links { flex-wrap: wrap; gap: 16px; }
  .hero { padding: 20px 0 64px; }
  .device img { width: min(300px, 76vw); }
  .sec { padding: 16px 0 64px; }
  .demo, .miss, .summary, .widget-card, .privacy { padding: 24px 20px; }
  .opts { grid-template-columns: repeat(2, 1fr); }
  .cols3 { grid-template-columns: 1fr; gap: 40px; }
  .pv-grid { grid-template-columns: 1fr; }
  .foot-top { grid-template-columns: 1fr; gap: 28px; }
}
@media (prefers-reduced-motion: reduce) {
  .hero-copy, .hero-shot { animation: none; }
}
</style>
