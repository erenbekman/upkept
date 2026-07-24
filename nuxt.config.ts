export default defineNuxtConfig({
  // Hybrid: marketing pages are prerendered for SEO/link previews; the tracker
  // (/app/**) stays a client-only SPA because it needs SQLite/localStorage.
  routeRules: {
    '/': { prerender: true },
    '/privacy': { prerender: true },
    '/app/**': { ssr: false },
  },
  devtools: { enabled: false },
  modules: ['@vite-pwa/nuxt'],
  css: ['~/assets/main.css'],
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
        { name: 'theme-color', content: '#6d6fae' },
      ],
      link: [
        { rel: 'icon', href: '/favicon.ico', sizes: 'any' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Spectral:ital,wght@0,400;0,500;0,600;1,400&family=Karla:wght@400;500;600;700&display=swap' },
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
      theme_color: '#6d6fae',
      background_color: '#f6f5f2',
      display: 'standalone',
      start_url: '/app',
      lang: 'tr',
      icons: [
        { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
        { src: 'icon-512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    workbox: { globPatterns: ['**/*.{js,css,html,wasm}'] },
  },
})
