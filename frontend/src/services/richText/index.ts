import { addTranslations } from '../i18n'
import en from './locales/en.json'
import fr from './locales/fr.json'

addTranslations('rich-text', { en, fr })

export {
  EditorText,
  PlateEditor,
  type MarkdownFailure,
} from './editor/PlateEditor'
export { FloatingToolbar } from './editor/Toolbar'
export { AIProposal, RichTextAI } from './ai/AskAI'
