import { addTranslations } from '../i18n'
import en from './locales/en.json'
import fr from './locales/fr.json'

addTranslations('auth', { en, fr })

export { useCurrentUser, useLogOut } from './api'
export { authRoutes, type Access } from './routes'
