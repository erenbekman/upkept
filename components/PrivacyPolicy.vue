<script setup lang="ts">
import trDict from '~/lang/tr'
import enDict from '~/lang/en'

const props = defineProps<{ lang: 'tr' | 'en' }>()
const P = props.lang === 'en' ? enDict.privacyPage : trDict.privacyPage
const url = props.lang === 'en' ? 'https://up-kept.app/privacy' : 'https://up-kept.app/gizlilik'

useSeoMeta({
  title: P.seoTitle,
  description: P.seoDesc,
  ogTitle: P.seoTitle,
  ogDescription: P.ogDesc,
  ogUrl: url,
})
useHead({
  htmlAttrs: { lang: props.lang },
  link: [
    { rel: 'canonical', href: url },
    { rel: 'alternate', hreflang: 'tr', href: 'https://up-kept.app/gizlilik' },
    { rel: 'alternate', hreflang: 'en', href: 'https://up-kept.app/privacy' },
  ],
})
</script>

<template>
  <div class="pp">
    <div class="pp-wrap">
      <div class="pp-top">
        <NuxtLink :to="lang === 'en' ? '/' : '/tr'" class="pp-brand">
          <BrandMark class="pp-mark" />
          <span>upkept</span>
        </NuxtLink>
        <NuxtLink
          :to="lang === 'en' ? '/gizlilik' : '/privacy'" class="pp-lang"
          :lang="lang === 'en' ? 'tr' : 'en'" :hreflang="lang === 'en' ? 'tr' : 'en'"
        >{{ P.switchLabel }}</NuxtLink>
      </div>

      <h1>{{ P.title }}</h1>
      <p class="pp-date">{{ P.updated }}</p>

      <p>{{ P.intro }}</p>

      <template v-for="s in P.sections" :key="s.h">
        <h2>{{ s.h }}</h2>
        <!-- Static, authored copy from lang/ — the only markup in it is <b>. -->
        <p v-for="(para, i) in s.ps" :key="i" v-html="para" />
      </template>

      <h2>{{ P.contactTitle }}</h2>
      <p>{{ P.contact }} <a href="mailto:erenbekman@gmail.com">erenbekman@gmail.com</a></p>

      <NuxtLink :to="lang === 'en' ? '/' : '/tr'" class="pp-back">{{ P.back }}</NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.pp {
  min-height: 100dvh; background: #f3f4f6; color: #111114;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'SF Pro Text', system-ui, 'Segoe UI', Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
}
.pp-wrap {
  max-width: 760px; margin: 0 auto; padding-block: 26px 80px;
  padding-inline: max(16px, env(safe-area-inset-left)) max(16px, env(safe-area-inset-right));
}
.pp-top { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 48px; }
.pp-brand { display: inline-flex; align-items: center; gap: 10px; color: #111114; }
.pp-brand span { font-weight: 800; font-size: 22px; letter-spacing: -0.04em; }
.pp-mark { width: 26px; height: 28px; color: #111114; }
.pp-lang { font-size: 14px; font-weight: 700; padding: 8px 14px; border-radius: 999px; background: #ffffff; color: #111114; }
h1 { font-weight: 850; font-size: clamp(38px, 6vw, 56px); letter-spacing: -0.04em; line-height: 1.02; margin: 0 0 10px; text-wrap: balance; }
.pp-date { font-size: 15px; color: #62656e; font-weight: 600; margin: 0 0 32px; }
h2 { font-weight: 800; font-size: 24px; letter-spacing: -0.03em; margin: 36px 0 10px; text-wrap: balance; }
p { font-size: 18px; line-height: 1.65; color: #3a3d45; margin: 0 0 12px; max-width: 62ch; text-wrap: pretty; }
b { color: #111114; }
a { color: #bb381a; font-weight: 650; }
.pp-back { display: inline-block; margin-top: 40px; font-size: 16px; font-weight: 700; background: #111114; color: #ffffff; padding: 13px 22px; border-radius: 999px; }
</style>
