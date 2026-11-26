/** Mirrors the backend's FilePurpose: the server checks again; this only gives instant feedback. */
export const FILE_PURPOSES = {
  companyLogo: { code: 1, maxMb: 2, extensions: ['png', 'jpg', 'jpeg'] },
  userPhoto: { code: 3, maxMb: 2, extensions: ['png', 'jpg', 'jpeg'] },
  document: {
    code: 2,
    maxMb: 10,
    extensions: [
      'pdf',
      'png',
      'jpg',
      'jpeg',
      'xlsx',
      'xls',
      'csv',
      'docx',
      'doc',
      'pptx',
      'ppt',
    ],
  },
} as const

export type FilePurpose = keyof typeof FILE_PURPOSES

/** The `accept` attribute for a file input. */
export function accept(purpose: FilePurpose) {
  return FILE_PURPOSES[purpose].extensions.map((e) => `.${e}`).join(',')
}

/** What a file must be: its types and its largest size. */
export type FileRules = { extensions: readonly string[]; maxMb: number }

/**
 * Returns a translation key (files namespace) when the file cannot be uploaded, or null:
 * against a purpose's rules, or a field's own (#73: the one check, used everywhere).
 */
export function checkFile(
  purpose: FilePurpose | FileRules,
  file: Pick<File, 'name' | 'size'>,
) {
  const rules = typeof purpose === 'string' ? FILE_PURPOSES[purpose] : purpose
  const extension = file.name.split('.').pop()?.toLowerCase() ?? ''
  if (!(rules.extensions as readonly string[]).includes(extension))
    return 'errors.ERROR_FILE_TYPE'
  if (file.size > rules.maxMb * 1024 * 1024)
    return 'errors.ERROR_FILE_TOO_LARGE'
  return null
}
