/** Field checks; each returns a translation key under "validation", or null when valid. */

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function required(value: string) {
  return value.trim() ? null : 'validation.required'
}

export function email(value: string) {
  return (
    required(value) ?? (EMAIL.test(value.trim()) ? null : 'validation.email')
  )
}

export function newPassword(value: string) {
  return (
    required(value) ?? (value.length >= 12 ? null : 'validation.passwordLength')
  )
}

export function confirmation(password: string) {
  return (value: string) =>
    required(value) ?? (value === password ? null : 'validation.mismatch')
}
