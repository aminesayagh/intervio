import { addTranslations } from '../../i18n'
import en from './locales/en.json'
import fr from './locales/fr.json'

addTranslations('companies', { en, fr })

export {
  companyApi,
  companyKey,
  errorKey as companyErrorKey,
  INDUSTRY_CODES,
  useCompany,
  type Company,
} from './api'
export { CountryField } from './components'
export { ONBOARDING_START, onboardingRoutes } from './routes'
