export const MAX_LOGO_BYTES = 2 * 1024 * 1024

/** Returns a translation key when the file cannot be a logo (decision 63), or null. */
export function checkLogo(file: Pick<File, 'type' | 'size'>) {
  if (file.type !== 'image/png' && file.type !== 'image/jpeg')
    return 'errors.ERROR_LOGO_TYPE'
  if (file.size > MAX_LOGO_BYTES) return 'errors.ERROR_FILE_TOO_LARGE'
  return null
}
