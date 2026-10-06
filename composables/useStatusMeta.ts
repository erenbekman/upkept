import type { EntryStatus } from '~/composables/useEntries'

export interface StatusMeta {
  glyph: string
  label: string
  sub: string
  cls: string
}

export function statusMeta(status: EntryStatus | null): StatusMeta {
  switch (status) {
    case 'done': return { glyph: '✓', label: t('status.done'), sub: t('status.doneSub'), cls: 'st-done' }
    case 'partial': return { glyph: '~', label: t('status.partial'), sub: t('status.partialSub'), cls: 'st-partial' }
    case 'missed': return { glyph: '✕', label: t('status.missed'), sub: t('status.missedSub'), cls: 'st-miss' }
    default: return { glyph: '+', label: t('status.none'), sub: t('status.noneSub'), cls: 'st-none' }
  }
}
