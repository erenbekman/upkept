<script setup lang="ts">
definePageMeta({ layout: false })
useSeoMeta({
  title: 'Privacy — upkept',
  description: 'upkept keeps your data on your device. No accounts, no ads, no tracking; optional anonymous sync.',
  ogTitle: 'Privacy — upkept',
  ogDescription: 'Local-first habit tracker. No accounts, no ads, no tracking.',
  ogUrl: 'https://up-kept.app/privacy',
})
// This page is written in English while the app ships lang="tr" globally. Without
// the override, screen readers read English prose with Turkish pronunciation and
// the browser hyphenates by the wrong ruleset.
useHead({
  htmlAttrs: { lang: 'en' },
  link: [{ rel: 'canonical', href: 'https://up-kept.app/privacy' }],
})
</script>

<template>
  <div class="pp">
    <div class="pp-wrap">
      <NuxtLink to="/" class="pp-brand">
        <svg width="24" height="24" viewBox="0 0 60 60" fill="none">
          <path d="M47 22 A19 19 0 1 0 49 34" stroke="#6d6fae" stroke-width="6.5" stroke-linecap="round" />
          <circle cx="47" cy="14" r="4.6" fill="#6d6fae" />
        </svg>
        <span>upkept</span>
      </NuxtLink>

      <h1>Privacy Policy</h1>
      <p class="pp-date">Last updated: 24 July 2026</p>

      <p>Upkept is a habit tracker that keeps your data on your own device. No accounts, no ads, no analytics or tracking. This policy explains what data exists and where it lives.</p>

      <h2>What we process</h2>
      <p>The app only handles what you enter: habit names, daily statuses (done / partial / missed), reason tags, short notes, and dates. This data is stored <b>on your device</b> (local SQLite). No name, email, location, or contacts are collected.</p>

      <h2>Optional cloud sync</h2>
      <p>If you want to sync across devices, you generate a <b>sync code</b> in Settings. Your habit data is then stored on Cloudflare infrastructure (D1) keyed by that anonymous code — only so devices entering the same code can share the same data. The code is the sole access key; it stays with you and is not tied to any identity.</p>
      <p>Sync is <b>off by default</b>. Until you create a code, no data leaves your device. You can stop syncing at any time via Settings → “Disconnect”.</p>

      <h2>Third parties</h2>
      <p><b>Cloudflare</b> is used for hosting and (if you enable it) the sync backend. No advertising networks, analytics, or tracking SDKs are used. Your data is never sold, rented, or shared for marketing.</p>

      <h2>Deleting your data</h2>
      <p>You can delete your habits and records from within the app. Removing the app deletes the data on your device. If you used sync, you can request deletion of the cloud copy tied to your code by contacting us at the address below.</p>

      <h2>Children</h2>
      <p>Upkept is intended for a general audience and does not knowingly collect data from children.</p>

      <h2>Changes</h2>
      <p>If this policy changes, the date on this page will be updated.</p>

      <h2>Contact</h2>
      <p>Questions: <a href="mailto:erenbekman@gmail.com">erenbekman@gmail.com</a></p>

      <NuxtLink to="/" class="pp-back">← Home</NuxtLink>
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
.pp-back { display: inline-block; margin-top: 40px; font-size: var(--ms-lg); font-weight: 700; color: #6465a5; }
</style>
