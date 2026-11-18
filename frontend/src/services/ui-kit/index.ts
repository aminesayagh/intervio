import { addTranslations } from '../i18n'
import en from './locales/en.json'
import fr from './locales/fr.json'
import { applyTheme, initialTheme } from './theme'

addTranslations('ui-kit', { en, fr })
applyTheme(initialTheme())

export { Icon } from './Icon'
export { PublicLayout } from './PublicLayout'
