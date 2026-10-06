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
        <NuxtLink :to="lang === 'en' ? '/en' : '/'" class="pp-brand">
          <svg width="24" height="24" viewBox="0 0 60 60" fill="none">
            <path d="M47 22 A19 19 0 1 0 49 34" stroke="#6d6fae" stroke-width="6.5" stroke-linecap="round" />
            <circle cx="47" cy="14" r="4.6" fill="#6d6fae" />
          </svg>
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

      <NuxtLink :to="lang === 'en' ? '/en' : '/'" class="pp-back">{{ P.back }}</NuxtLink>
    </div>
  </div>
</template>

<style scoped>
.pp { min-height: 100dvh; background: #f7f4ed; color: #262420; font-family: 'Karla', system-ui, sans-serif; }
.pp-wrap {
  max-width: 720px; margin: 0 auto; padding-block: 40px 80px;
  padding-inline: max(24px, env(safe-area-inset-left)) max(24px, env(safe-area-inset-right));
}
.pp-brand { display: inline-flex; align-items: center; gap: 9px; margin-bottom: 36px; }
.pp-brand span { font-family: 'Spectral', serif; font-weight: 500; font-size: var(--ms-3xl); letter-spacing: -0.8px; color: #201e1a; }
h1 { font-family: 'Spectral', serif; font-weight: 500; font-size: var(--ms-6xl); letter-spacing: -1px; margin: 0 0 6px; color: #201e1a; text-wrap: balance; }
.pp-date { font-size: var(--ms-md); color: #726a5e; margin: 0 0 28px; }
h2 { font-family: 'Spectral', serif; font-weight: 500; font-size: var(--ms-3xl); margin: 32px 0 8px; color: #201e1a; text-wrap: balance; }
/* The only long-form prose in the project; the 720px wrapper ran ~90 characters
   per line. 53ch, not 68: ch is the width of "0", and Karla's average lowercase
   letter is far narrower, so 68ch measured out at 90 real characters. 53ch
   renders ~70 — inside the 60–75 the eye tracks comfortably. */
p { font-size: var(--ms-xl); line-height: 1.7; color: #4a453c; margin: 0 0 12px; max-width: 53ch; text-wrap: pretty; }
b { color: #201e1a; }
a { color: #6465a5; }
.pp-top { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 36px; }
.pp-top .pp-brand { margin-bottom: 0; }
.pp-lang { font-size: var(--ms-md); font-weight: 600; padding: 6px 12px; border-radius: 999px; border: 1px solid #e2d8c1; color: #6b6459; }
.pp-back { display: inline-block; margin-top: 40px; font-size: var(--ms-lg); font-weight: 700; color: #6465a5; }
</style>
