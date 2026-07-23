# Upkept

Aylık, yargısız alışkanlık takibi. "Kaçırdım + sebep" kaydetmek "yaptım" kadar hızlı; metrikler süreklilik yüzdesi etrafında kurgulu. Veri tamamen cihazda (SQLite), sunucu yok.

Tek kod tabanı → **web (PWA)**, **iOS/Android** (Capacitor), **masaüstü** (Tauri).

## Stack
Nuxt 3 (SPA, `ssr: false`) · TypeScript · @capacitor-community/sqlite (web'de jeep-sqlite + sql.js, native'de gerçek SQLite) · @vite-pwa/nuxt

## Geliştirme
```bash
npm install
npm run dev
```

## Web build (Cloudflare Pages)
- Build command: `npm run generate`
- Output directory: `.output/public`

## Mobil (Capacitor)
```bash
npm run cap:sync        # generate + native'e kopyala
npx cap open ios        # Xcode
npx cap open android    # Android Studio
```

## Masaüstü (Tauri)
```bash
npx tauri build --bundles app
```
