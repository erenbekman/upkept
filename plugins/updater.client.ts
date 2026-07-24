// Desktop (Tauri) self-update: on launch, check GitHub for a newer signed
// release and offer to install it. No-op in web/PWA/native-mobile.
export default defineNuxtPlugin(() => {
  if (!import.meta.client) return
  if (!(window as any).__TAURI_INTERNALS__) return

  ;(async () => {
    try {
      const { check } = await import('@tauri-apps/plugin-updater')
      const update = await check()
      if (!update) return
      if (!confirm(`Yeni sürüm var (${update.version}). Şimdi güncellensin mi?`)) return
      await update.downloadAndInstall()
      const { relaunch } = await import('@tauri-apps/plugin-process')
      await relaunch()
    } catch (e) {
      // best-effort; offline or no release yet is fine
      console.warn('updater:', e)
    }
  })()
})
