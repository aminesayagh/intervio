import { addTranslations } from '../../i18n'
import en from './locales/en.json'
import fr from './locales/fr.json'
import { DashboardPage, ResourcesPage } from './pages'

addTranslations('client-board', { en, fr })

export { ClientBoardLayout } from './ClientBoardLayout'

/** Client board tabs, each at its own address (decision 82). */
export const clientBoardRoutes = {
  '/dashboard': DashboardPage,
  '/resources': ResourcesPage,
}
export const CLIENT_BOARD_HOME = '/dashboard'
