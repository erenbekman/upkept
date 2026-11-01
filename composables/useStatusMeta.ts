import type { EntryStatus } from '~/composables/useEntries'
import type { HabitKind } from '~/composables/useHabits'

export interface StatusMeta {
  glyph: string
  label: string
}

export function statusMeta(status: EntryStatus | null, kind: HabitKind = 'build'): StatusMeta {
  if (kind === 'quit' && status === 'done') return { glyph: '✓', label: t('status.clear') }
  if (kind === 'quit' && status === 'missed') return { glyph: '✕', label: t('status.slipped') }
  switch (status) {
    case 'done': return { glyph: '✓', label: t('status.done') }
    case 'partial': return { glyph: '~', label: t('status.partial') }
    case 'missed': return { glyph: '✕', label: t('status.missed') }
    case 'rest': return { glyph: '‖', label: t('status.rest') }
    default: return { glyph: '+', label: t('status.none') }
  }
}
