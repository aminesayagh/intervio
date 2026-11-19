import { expect, test } from 'vitest'
import { countries } from './countries'
import { checkLogo, MAX_LOGO_BYTES } from './logo'

test('countries are named and sorted in the interface language', () => {
  const fr = countries('fr')
  expect(fr.find((c) => c.code === 'DE')?.name).toBe('Allemagne')
  expect(fr[0].name.localeCompare(fr[1].name, 'fr')).toBeLessThanOrEqual(0)
  expect(countries('en').find((c) => c.code === 'DE')?.name).toBe('Germany')
})

test('a logo is a PNG or JPG of at most 2 MB', () => {
  expect(checkLogo({ type: 'image/png', size: 1000 })).toBeNull()
  expect(checkLogo({ type: 'image/jpeg', size: MAX_LOGO_BYTES })).toBeNull()
  expect(checkLogo({ type: 'image/gif', size: 1000 })).toBe(
    'errors.ERROR_LOGO_TYPE',
  )
  expect(checkLogo({ type: 'image/png', size: MAX_LOGO_BYTES + 1 })).toBe(
    'errors.ERROR_FILE_TOO_LARGE',
  )
})
