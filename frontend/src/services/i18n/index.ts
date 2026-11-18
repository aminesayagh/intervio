import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

export type Language = 'en' | 'fr'

const STORAGE_KEY = 'intervio.language'

/** Saved choice first, then the browser language (French if it is French), else English. */
function initialLanguage(): Language {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === 'en' || saved === 'fr') return saved
  } catch {
    // Storage can be blocked; fall back to the browser language.
  }
  return navigator.language.toLowerCase().startsWith('fr') ? 'fr' : 'en'
}

const language = initialLanguage()
document.documentElement.lang = language

i18n.use(initReactI18next).init({
  lng: language,
  fallbackLng: 'en',
  interpolation: { escapeValue: false }, // React already escapes
  resources: {},
})

/** Services register their own translations under their namespace. */
export function addTranslations(
  namespace: string,
  translations: Record<Language, Record<string, unknown>>,
) {
  for (const lang of ['en', 'fr'] as const) {
    i18n.addResourceBundle(lang, namespace, translations[lang])
  }
}

export function setLanguage(next: Language) {
  try {
    localStorage.setItem(STORAGE_KEY, next)
  } catch {
    // Not saved; the choice still applies until the page is closed.
  }
  document.documentElement.lang = next
  void i18n.changeLanguage(next)
}

export { i18n }
