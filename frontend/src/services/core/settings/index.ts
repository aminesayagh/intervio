import { addTranslations } from '../../i18n'
import { CompanyPage } from './CompanyPage'
import en from './locales/en.json'
import fr from './locales/fr.json'
import { ProfilePage } from './ProfilePage'
import { SecurityPage } from './SecurityPage'

addTranslations('settings', { en, fr })

/** Settings tabs (decision 86); every company tab is /settings/companies/{id}. */
export const settingsRoutes = {
  '/settings/profile': ProfilePage,
  '/settings/security': SecurityPage,
}
export const COMPANY_SETTINGS_PREFIX = '/settings/companies/'
export const CompanySettingsPage = CompanyPage
