import { addTranslations } from '../../i18n'
import en from './locales/en.json'
import fr from './locales/fr.json'

addTranslations('companies', { en, fr })

export { useCompany } from './api'
export { ONBOARDING_START, onboardingRoutes } from './routes'
