import { addTranslations } from '../i18n'
import en from './locales/en.json'
import fr from './locales/fr.json'
import { applyTheme, initialTheme } from './theme'

addTranslations('ui-kit', { en, fr })
applyTheme(initialTheme())

export { Calendar, type CalendarEntry } from './calendar/Calendar'
export { cn } from './cn'
export { Field } from './forms/Field'
export { FormError, Notice, Title } from './forms/FormParts'
export { Icon } from './Icon'
export * as check from './forms/validation'
export { PublicLayout } from './layout/PublicLayout'
export { Segmented } from './forms/Segmented'
export { Match, Show, Switch, Variant } from './views/Show'
export { foldSidebar, useSidebarFolded } from './layout/sidebarFold'
export { offerBack, useTopBarBack, type Back } from './layout/topBarBack'
export { applyTheme, initialTheme, useTheme, type Theme } from './theme'
export * from './aria'
