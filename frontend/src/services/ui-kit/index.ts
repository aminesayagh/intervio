import { addTranslations } from '../i18n'
import en from './locales/en.json'
import fr from './locales/fr.json'
import { applyTheme, initialTheme } from './theme'

addTranslations('ui-kit', { en, fr })
applyTheme(initialTheme())

export { cn } from './cn'
export { Field } from './Field'
export { FormError, Notice, Title } from './FormParts'
export { Icon } from './Icon'
export * as check from './validation'
export { PublicLayout } from './PublicLayout'
export { Segmented } from './Segmented'
export { Match, Show, Switch } from './Show'
export { foldSidebar, useSidebarFolded } from './sidebarFold'
export { applyTheme, initialTheme, useTheme, type Theme } from './theme'
