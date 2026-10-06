import { Capacitor } from '@capacitor/core'

// Native only: iOS Safari ignores navigator.vibrate, and the desktop has no motor.
export async function haptic(kind: 'tap' | 'success' = 'tap') {
  if (!Capacitor.isNativePlatform()) return
  try {
    const { Haptics, ImpactStyle, NotificationType } = await import('@capacitor/haptics')
    if (kind === 'success') await Haptics.notification({ type: NotificationType.Success })
    else await Haptics.impact({ style: ImpactStyle.Light })
  } catch {}
}
