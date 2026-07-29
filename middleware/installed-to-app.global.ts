// Installed contexts (native app, Tauri desktop, installed PWA) skip the
// marketing landing and open straight into the tracker.
//
// This has to be middleware, not a redirect inside the landing page's setup:
// the landing sets `layout: false`, and redirecting from within its setup left
// that stuck for the whole session — /app rendered with no layout at all, so
// the native app had no tab bar and no safe-area padding.
export default defineNuxtRouteMiddleware((to) => {
  if (!import.meta.client || to.path !== '/') return
  const w = window as any
  const installed =
    w.__TAURI_INTERNALS__ || w.__TAURI__ ||
    w.Capacitor?.isNativePlatform?.() ||
    w.matchMedia?.('(display-mode: standalone)').matches
  if (installed) return navigateTo('/app', { replace: true })
})
