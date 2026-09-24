import { createI18n } from 'vue-i18n'
import en from './locales/en'
import id from './locales/id'

export const SUPPORTED_LOCALES = ['en', 'id'] as const
export type Locale = (typeof SUPPORTED_LOCALES)[number]

export const LOCALE_LABELS: Record<Locale, string> = {
  en: 'English',
  id: 'Bahasa Indonesia',
}

const LOCALE_KEY = 'dtpl.locale'

function isLocale(value: string | null | undefined): value is Locale {
  return SUPPORTED_LOCALES.includes(value as Locale)
}

function detectLocale(): Locale {
  try {
    const saved = localStorage.getItem(LOCALE_KEY)
    if (isLocale(saved)) return saved
  } catch {
    // ignore storage errors
  }
  const browser = navigator.language?.slice(0, 2).toLowerCase()
  return isLocale(browser) ? browser : 'en'
}

export const i18n = createI18n({
  legacy: false,
  locale: detectLocale(),
  fallbackLocale: 'en',
  messages: { en, id },
  datetimeFormats: {
    en: { long: { dateStyle: 'medium', timeStyle: 'short' } },
    id: { long: { dateStyle: 'medium', timeStyle: 'short' } },
  },
})

export function setLocale(locale: Locale) {
  i18n.global.locale.value = locale
  document.documentElement.lang = locale
  try {
    localStorage.setItem(LOCALE_KEY, locale)
  } catch {
    // ignore storage errors
  }
}

document.documentElement.lang = i18n.global.locale.value
