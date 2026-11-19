import { api, ApiError } from '../http'
import { FILE_PURPOSES, type FilePurpose } from './purposes'

export type UploadedFile = {
  id: string
  name: string
  contentType: string
  sizeBytes: number
}

/** Uploads one file; the answer's id is then given to the business action (for example the logo). */
export function uploadFile(purpose: FilePurpose, file: File) {
  const form = new FormData()
  form.append('file', file)
  form.append('purpose', String(FILE_PURPOSES[purpose].code))
  return api<UploadedFile>('/api/files', { body: { file: form } })
}

/** Address to show or download a file; the backend checks that this user may read it. */
export function fileUrl(id: string) {
  return `/api/files/${encodeURIComponent(id)}`
}

/** Translation key (files namespace) of the message for an upload error. */
export function uploadErrorKey(error: unknown) {
  return `errors.${error instanceof ApiError ? error.code : 'ERROR_UNKNOWN'}`
}

/** Size for people: "48 KB", "1.2 MB". */
export function formatSize(bytes: number) {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
