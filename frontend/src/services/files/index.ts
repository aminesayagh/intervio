import { addTranslations } from '../i18n'
import en from './locales/en.json'
import fr from './locales/fr.json'

addTranslations('files', { en, fr })

export {
  fileUrl,
  formatSize,
  uploadErrorKey,
  uploadFile,
  type UploadedFile,
} from './api'
export { DocumentsField } from './components/DocumentsField'
export { FileDropzone } from './components/FileDropzone'
export { FilePreview, type PreviewFile } from './components/FilePreview'
export { ImagePicker } from './components/ImagePicker'
export { checkFile, FILE_PURPOSES, type FilePurpose } from './purposes'
