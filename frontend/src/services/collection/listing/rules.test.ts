import { expect, test } from 'vitest'
import { nextSort, parseSort, passes, readRule, ruleKey } from './rules'

test('a rule is written as its key, and read back', () => {
  expect(ruleKey('status', 'is')).toBe('status')
  expect(ruleKey('quantity', 'gt')).toBe('quantity.gt')
  expect(readRule('quantity.gt', ['5'])).toEqual({
    id: 'quantity',
    op: 'gt',
    values: ['5'],
  })
})

test('a record passes when every rule matches', () => {
  const item = {
    status: 'valid',
    quantity: 12,
    name: 'Pump seal',
    tags: ['safety'],
    due: '2026-12-10',
    active: true,
  }
  const valueOf = (id: string) => item[id as keyof typeof item]
  expect(
    passes(
      {
        status: ['valid', 'draft'],
        'quantity.gt': ['5'],
        'name.contains': ['PUMP'],
        'tags.not': ['hydraulic'],
        'due.lt': ['2027-01-01'],
        active: ['true'],
      },
      valueOf,
    ),
  ).toBe(true)
  // 12 is not less than 9 (as numbers, not as text).
  expect(passes({ 'quantity.lt': ['9'] }, valueOf)).toBe(false)
  expect(passes({ 'tags.not': ['safety'] }, valueOf)).toBe(false)
  // No value: never greater or less than anything.
  expect(passes({ 'quantity.gt': ['1'] }, () => null)).toBe(false)
})

test('a header press cycles one level; the address keeps several', () => {
  expect(nextSort([], 'name', 'asc')).toEqual([
    { by: 'name', direction: 'asc' },
  ])
  expect(nextSort([{ by: 'name', direction: 'asc' }], 'name', 'asc')).toEqual([
    { by: 'name', direction: 'desc' },
  ])
  expect(nextSort([{ by: 'name', direction: 'desc' }], 'name', 'asc')).toEqual(
    [],
  )
  expect(parseSort('status:asc,updated:desc,bad')).toEqual([
    { by: 'status', direction: 'asc' },
    { by: 'updated', direction: 'desc' },
  ])
})
