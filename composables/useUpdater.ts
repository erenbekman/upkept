// Desktop (Tauri) self-update. Shared by the launch check and the manual button
// in Settings so the download/relaunch dance exists once.
export const isDesktop = () =>
  import.meta.client && !!(window as any).__TAURI_INTERNALS__

export function useUpdater() {
  const busy = useState('updater_busy', () => false)

  // Returns a message worth showing, or null when there is nothing to say.
  // A silent launch check should not interrupt; a manual one always answers.
  async function check(manual = false): Promise<string | null> {
    if (!isDesktop() || busy.value) return null
    busy.value = true
    try {
      const { check: checkUpdate } = await import('@tauri-apps/plugin-updater')
      const update = await checkUpdate()
      if (!update) return manual ? t('updater.latest') : null
      const ok = await useAsk().confirm({
        title: t('updater.available', { v: update.version }),
        message: t('updater.availableText'),
        okLabel: t('updater.update'),
      })
      if (!ok) return null
      await update.downloadAndInstall()
      const { relaunch } = await import('@tauri-apps/plugin-process')
      await relaunch()
      return null
    } catch (e) {
      console.warn('updater:', e)
      return manual ? t('updater.failed') : null
    } finally {
      busy.value = false
    }
  }

  return { busy, check }
}
