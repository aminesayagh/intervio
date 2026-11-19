import { expect, test } from 'vitest'
import { accept, checkFile } from './purposes'

test('each purpose has its own types and size limit', () => {
  expect(checkFile('companyLogo', { name: 'logo.PNG', size: 1000 })).toBeNull()
  expect(checkFile('companyLogo', { name: 'logo.pdf', size: 1000 })).toBe(
    'errors.ERROR_FILE_TYPE',
  )
  expect(
    checkFile('companyLogo', { name: 'logo.png', size: 2 * 1024 * 1024 + 1 }),
  ).toBe('errors.ERROR_FILE_TOO_LARGE')
  expect(
    checkFile('document', {
      name: 'specifications.docx',
      size: 9 * 1024 * 1024,
    }),
  ).toBeNull()
  expect(checkFile('document', { name: 'tool.exe', size: 10 })).toBe(
    'errors.ERROR_FILE_TYPE',
  )
  expect(
    checkFile('document', { name: 'plan.pdf', size: 10 * 1024 * 1024 + 1 }),
  ).toBe('errors.ERROR_FILE_TOO_LARGE')
  expect(accept('companyLogo')).toBe('.png,.jpg,.jpeg')
})
