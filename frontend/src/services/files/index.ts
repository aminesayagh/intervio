import { addTranslations } from '../i18n'
import en from './locales/en.json'
import fr from './locales/fr.json'

addTranslations('files', { en, fr })

export { fileUrl, uploadErrorKey, uploadFile, type UploadedFile } from './api'
export { FileDropzone } from './FileDropzone'
export { ImagePicker } from './ImagePicker'
export { checkFile, FILE_PURPOSES, type FilePurpose } from './purposes'
