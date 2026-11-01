import { Capacitor } from '@capacitor/core'

export const hapticsEnabled = () => localStorage.getItem('haptics') !== '0'

// Native only: iOS Safari ignores navigator.vibrate, and the desktop has no motor.
export async function haptic(kind: 'tap' | 'success' | 'soft' = 'tap') {
  if (!Capacitor.isNativePlatform() || !hapticsEnabled()) return
  try {
    const { Haptics, ImpactStyle, NotificationType } = await import('@capacitor/haptics')
    if (kind === 'success') await Haptics.notification({ type: NotificationType.Success })
    else await Haptics.impact({ style: kind === 'soft' ? ImpactStyle.Medium : ImpactStyle.Light })
  } catch {}
}
