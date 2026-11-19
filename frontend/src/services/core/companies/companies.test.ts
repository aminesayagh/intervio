import { expect, test } from 'vitest'
import { countries } from './countries'

test('countries are named and sorted in the interface language', () => {
  const fr = countries('fr')
  expect(fr.find((c) => c.code === 'DE')?.name).toBe('Allemagne')
  expect(fr[0].name.localeCompare(fr[1].name, 'fr')).toBeLessThanOrEqual(0)
  expect(countries('en').find((c) => c.code === 'DE')?.name).toBe('Germany')
})
