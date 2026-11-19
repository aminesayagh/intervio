import { addTranslations } from '../../i18n'
import { AllInterventionsPage } from './AllInterventionsPage'
import { CreateInterventionPage } from './CreateInterventionPage'
import { InterventionPage } from './InterventionPage'
import en from './locales/en.json'
import fr from './locales/fr.json'

addTranslations('interventions', { en, fr })

export { SidebarInterventions } from './SidebarInterventions'

export const interventionRoutes = {
  '/interventions': AllInterventionsPage,
  '/interventions/new': CreateInterventionPage,
}
/** Every intervention is /interventions/{id}. */
export const INTERVENTION_PREFIX = '/interventions/'
export { InterventionPage }
