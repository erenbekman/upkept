import { Capacitor, registerPlugin, type PluginListenerHandle } from '@capacitor/core'

const NativeMotion = registerPlugin<{
  start(): Promise<void>
  stop(): Promise<void>
  addListener(event: 'tilt', fn: (e: { gamma: number }) => void): Promise<PluginListenerHandle>
}>('UpkeptMotion')

const watchers = new Set<(gamma: number) => void>()
let nativeHandle: Promise<PluginListenerHandle> | null = null

const emit = (gamma: number) => { for (const fn of watchers) fn(gamma) }
const onOrientation = (e: DeviceOrientationEvent) => { if (typeof e.gamma === 'number') emit(e.gamma) }

function connect() {
  if (Capacitor.getPlatform() === 'ios') {
    nativeHandle = NativeMotion.addListener('tilt', e => emit(e.gamma))
    NativeMotion.start()
  } else {
    window.addEventListener('deviceorientation', onOrientation)
  }
}

function disconnect() {
  if (nativeHandle) {
    nativeHandle.then(h => h.remove())
    nativeHandle = null
    NativeMotion.stop()
  } else {
    window.removeEventListener('deviceorientation', onOrientation)
  }
}

export function watchDeviceTilt(fn: (gamma: number) => void) {
  if (!watchers.size) connect()
  watchers.add(fn)
  return () => {
    watchers.delete(fn)
    if (!watchers.size) disconnect()
  }
}
