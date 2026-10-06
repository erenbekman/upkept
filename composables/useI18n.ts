import { ref } from 'vue'
import tr from '../lang/tr.ts'
import en from '../lang/en.ts'

const DICTS = { tr, en }
export type Locale = keyof typeof DICTS
export const LOCALES: { code: Locale; label: string }[] = [
  { code: 'tr', label: 'Türkçe' },
  { code: 'en', label: 'English' },
]

const stored = typeof window !== 'undefined' ? localStorage.getItem('locale') : null
const locale = ref<Locale>(stored === 'en' ? 'en' : 'tr')
if (typeof window !== 'undefined') document.documentElement.lang = locale.value

const lookup = (dict: object, key: string): any => key.split('.').reduce<any>((o, k) => o?.[k], dict)

export function t(key: string, params?: Record<string, string | number>): string {
  const v: string = lookup(DICTS[locale.value], key) ?? lookup(tr, key) ?? key
  return params ? v.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? '')) : v
}

export function tList<T = string>(key: string): T[] {
  return lookup(DICTS[locale.value], key) ?? []
}

export const dateLocale = () => (locale.value === 'en' ? 'en-US' : 'tr-TR')

export function useLocale() {
  function setLocale(l: Locale) {
    locale.value = l
    localStorage.setItem('locale', l)
    document.documentElement.lang = l
  }
  return { locale, setLocale }
}
