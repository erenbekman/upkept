// Desktop (Tauri) self-update: on launch, check GitHub for a newer signed
// release and offer to install it. No-op in web/PWA/native-mobile.
export default defineNuxtPlugin((nuxtApp) => {
  if (!isDesktop()) return
  nuxtApp.hook('app:mounted', () => { useUpdater().check() })
})
