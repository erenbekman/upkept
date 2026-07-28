import type { EntryStatus } from '~/composables/useEntries'

export interface StatusMeta {
  glyph: string
  label: string
  sub: string
  cls: string
}

export function statusMeta(status: EntryStatus | null): StatusMeta {
  switch (status) {
    case 'done': return { glyph: '✓', label: 'Yaptım', sub: 'Yaptın', cls: 'st-done' }
    case 'partial': return { glyph: '~', label: 'Kısmen', sub: 'Kısmen', cls: 'st-partial' }
    case 'missed': return { glyph: '✕', label: 'Yapamadım', sub: 'Yarın yeni bir gün', cls: 'st-miss' }
    default: return { glyph: '+', label: 'Kaydet', sub: 'Henüz işaretlemedin', cls: 'st-none' }
  }
}
