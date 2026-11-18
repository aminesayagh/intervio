import { expect, test } from 'vitest'
import { confirmation, email, newPassword, required } from './validation'

test('field checks return the message key, or null when valid', () => {
  expect(required('  ')).toBe('validation.required')
  expect(email('ada')).toBe('validation.email')
  expect(email('ada@example.com')).toBeNull()
  expect(newPassword('short')).toBe('validation.passwordLength')
  expect(newPassword('twelve chars')).toBeNull()
  expect(confirmation('twelve chars')('twelve charz')).toBe(
    'validation.mismatch',
  )
  expect(confirmation('twelve chars')('twelve chars')).toBeNull()
})
