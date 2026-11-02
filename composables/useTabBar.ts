import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core'

interface NativeTab { id: string; title: string; systemImage: string }

const NativeTabBar = registerPlugin<{
  setTabs(o: { tabs: NativeTab[]; selected?: string }): Promise<void>
  select(o: { id: string }): Promise<void>
  setTint(o: { color: string }): Promise<void>
  setStyle(o: { style: 'light' | 'dark' | 'auto' }): Promise<void>
  show(): Promise<void>
  hide(): Promise<void>
  addListener(event: 'tabSelected', fn: (e: { id: string }) => void): Promise<PluginListenerHandle>
}>('UpkeptTabBar')

export const TABS = [
  { id: 'today', to: '/app', symbol: 'circle.bottomhalf.filled' },
  { id: 'progress', to: '/app/progress', symbol: 'chart.bar.fill' },
  { id: 'settings', to: '/app/settings', symbol: 'slider.horizontal.3' },
] as const

export type TabId = typeof TABS[number]['id']

export const tabForPath = (path: string): TabId | null => {
  const p = path.replace(/(.)\/$/, '$1')
  return TABS.find(t => t.to === p)?.id ?? null
}

export const nativeTabBar = () => Capacitor.getPlatform() === 'ios'

export function useTabBar() {
  const enabled = nativeTabBar()

  async function setup(onSelect: (id: TabId) => void) {
    if (!enabled) return
    await NativeTabBar.addListener('tabSelected', e => onSelect(e.id as TabId))
  }

  async function label(selected: TabId | null) {
    if (!enabled) return
    await NativeTabBar.setTabs({
      tabs: TABS.map(tab => ({ id: tab.id, title: t(`tabs.${tab.id}`), systemImage: tab.symbol })),
      selected: selected ?? undefined,
    }).catch(() => {})
  }

  async function sync(selected: TabId | null) {
    if (!enabled) return
    if (selected) {
      await NativeTabBar.select({ id: selected }).catch(() => {})
      await NativeTabBar.show().catch(() => {})
    } else {
      await NativeTabBar.hide().catch(() => {})
    }
  }

  async function tint(color: string) {
    if (!enabled) return
    await NativeTabBar.setTint({ color }).catch(() => {})
  }

  async function style(pref: 'light' | 'dark' | 'auto') {
    if (!enabled) return
    await NativeTabBar.setStyle({ style: pref }).catch(() => {})
  }

  return { enabled, setup, label, sync, tint, style }
}
