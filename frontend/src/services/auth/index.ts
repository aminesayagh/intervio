import { addTranslations } from '../i18n'
import en from './locales/en.json'
import fr from './locales/fr.json'

addTranslations('auth', { en, fr })

export {
  currentUserKey,
  useCurrentUser,
  useLogOut,
  type CurrentUser,
} from './api'
export { authRoutes, type Access } from './routes'
export { dropReturnTo, peekReturnTo, saveReturnTo } from './returnTo'
