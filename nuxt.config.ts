export default defineNuxtConfig({
  // Hybrid: marketing pages are prerendered for SEO/link previews; the tracker
  // (/app/**) stays a client-only SPA because it needs SQLite/localStorage.
  routeRules: {
    '/': { prerender: true },
    '/tr': { prerender: true },
    '/en': { redirect: { to: '/', statusCode: 301 } },
    '/privacy': { prerender: true },
    '/gizlilik': { prerender: true },
    '/app/**': { ssr: false },
  },
  devtools: { enabled: false },
  modules: ['@vite-pwa/nuxt'],
  css: ['~/assets/main.css', '~/assets/app.css'],
  app: {
    head: {
      title: 'Upkept',
      htmlAttrs: { lang: 'tr' },
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'description', content: 'Sakin ve yargısız aylık alışkanlık takibi. Kaçırmak bir alarm değil — önemli olan geri dönmen. Hesap yok, offline çalışır.' },
        { property: 'og:type', content: 'website' },
        { property: 'og:site_name', content: 'upkept' },
        { property: 'og:image', content: 'https://up-kept.app/og.png' },
        { name: 'twitter:card', content: 'summary_large_image' },
        { name: 'theme-color', content: '#f3f4f6' },
      ],
      link: [
        { rel: 'icon', href: '/favicon.ico', sizes: 'any' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
      ],
    },
  },
  vite: {
    optimizeDeps: { exclude: ['jeep-sqlite'] },
  },
  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'Upkept',
      short_name: 'Upkept',
      description: 'Aylık alışkanlık takibi — yargısız, sürdürülebilir',
      theme_color: '#f3f4f6',
      background_color: '#f3f4f6',
      display: 'standalone',
      start_url: '/app',
      lang: 'tr',
      icons: [
        { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
        { src: 'icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,wasm}'],
      globIgnores: ['index.html', 'tr/index.html', 'privacy/index.html', 'gizlilik/index.html', '**/_payload.json'],
      navigateFallback: '/200',
      navigateFallbackAllowlist: [/^\/app(\/|$)/],
    },
  },
})
