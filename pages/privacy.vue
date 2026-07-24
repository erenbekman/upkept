<script setup lang="ts">
definePageMeta({ layout: false })
useHead({ title: 'Privacy — Upkept' })
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
.pp { min-height: 100vh; background: #f7f4ed; color: #262420; font-family: 'Karla', system-ui, sans-serif; }
.pp-wrap { max-width: 720px; margin: 0 auto; padding: 40px 24px 80px; }
.pp-brand { display: inline-flex; align-items: center; gap: 9px; margin-bottom: 36px; }
.pp-brand span { font-family: 'Spectral', serif; font-weight: 500; font-size: 22px; letter-spacing: -0.8px; color: #201e1a; }
h1 { font-family: 'Spectral', serif; font-weight: 500; font-size: 40px; letter-spacing: -1px; margin: 0 0 6px; color: #201e1a; }
.pp-date { font-size: 14px; color: #9a917f; margin: 0 0 28px; }
h2 { font-family: 'Spectral', serif; font-weight: 500; font-size: 22px; margin: 32px 0 8px; color: #201e1a; }
p { font-size: 16px; line-height: 1.7; color: #4a453c; margin: 0 0 12px; }
b { color: #201e1a; }
a { color: #6d6fae; }
.pp-back { display: inline-block; margin-top: 40px; font-size: 15px; font-weight: 700; color: #6d6fae; }
</style>
