import { expect, test } from 'vitest'
import {
  nextSort,
  parseGroup,
  parseSort,
  passes,
  passesGroup,
  plainOf,
  readRule,
  ruleKey,
  sameRules,
  type FilterGroup,
} from './rules'

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

test('composed rules: "and" / "or", one level of groups, unfinished rules ignored', () => {
  const item = { status: 'draft', quantity: 3, owner: 'me' }
  const valueOf = (id: string) => item[id as keyof typeof item]
  const rule = (id: string, op: 'is' | 'gt', ...values: string[]) => ({
    id,
    op,
    values,
  })
  // Status is Draft and (Owner is me or Quantity greater than 5).
  const group: FilterGroup = {
    join: 'and',
    rules: [
      rule('status', 'is', 'draft'),
      {
        join: 'or',
        rules: [rule('owner', 'is', 'me'), rule('quantity', 'gt', '5')],
      },
      rule('owner', 'is'), // no value yet: doesn't apply
    ],
  }
  expect(passesGroup(group, valueOf)).toBe(true)
  expect(
    passesGroup({ ...group, rules: group.rules.slice(1, 2) }, () => null),
  ).toBe(false)
  expect(passesGroup({ join: 'or', rules: [] }, valueOf)).toBe(true)

  // The short f.{key} form when it can say it; else null (a `filter` parameter).
  expect(
    plainOf({
      join: 'and',
      rules: [rule('quantity', 'gt', '5'), rule('status', 'is', 'a')],
    }),
  ).toEqual({
    'quantity.gt': ['5'],
    status: ['a'],
  })
  expect(plainOf({ join: 'or', rules: [rule('status', 'is', 'a')] })).toEqual({
    status: ['a'],
  })
  expect(
    plainOf({
      join: 'or',
      rules: [rule('status', 'is', 'a'), rule('owner', 'is', 'b')],
    }),
  ).toBeNull()
  expect(plainOf(group)).toBeNull()
  expect(
    plainOf({
      join: 'and',
      rules: [rule('status', 'is', 'a'), rule('status', 'is', 'b')],
    }),
  ).toBeNull()

  // Same rules in force, whatever the order of plain rules or an unfinished one.
  expect(
    sameRules(
      {
        join: 'and',
        rules: [rule('status', 'is', 'a'), rule('owner', 'is', 'b')],
      },
      {
        join: 'or',
        rules: [
          rule('owner', 'is', 'b'),
          rule('status', 'is', 'a'),
          rule('x', 'is'),
        ],
      },
    ),
  ).toBe(false) // two rules joined by "or" are not the same as by "and"
  expect(
    sameRules(
      {
        join: 'and',
        rules: [rule('status', 'is', 'a'), rule('owner', 'is', 'b')],
      },
      {
        join: 'and',
        rules: [
          rule('owner', 'is', 'b'),
          rule('status', 'is', 'a'),
          rule('x', 'is'),
        ],
      },
    ),
  ).toBe(true)
})

test('a composed filter is read back from the address, leaving out what is wrong', () => {
  expect(parseGroup('not json')).toBeNull()
  expect(parseGroup('{"join":"xor","rules":[]}')).toBeNull()
  const deep = {
    join: 'or',
    rules: [
      { id: 'a', op: 'is', values: ['1'] },
      { id: 'b', op: 'bad', values: ['1'] },
      {
        join: 'and',
        rules: [
          { join: 'and', rules: [] },
          { id: 'c', op: 'gt', values: ['2'] },
        ],
      },
    ],
  }
  expect(parseGroup(JSON.stringify(deep))).toEqual({
    join: 'or',
    rules: [
      { id: 'a', op: 'is', values: ['1'] },
      { join: 'and', rules: [{ id: 'c', op: 'gt', values: ['2'] }] },
    ],
  })
})

test('"empty" passes a record without a value (MAS-55)', () => {
  expect(passes({ 'due.empty': ['true'] }, () => null)).toBe(true)
  expect(passes({ 'due.empty': ['true'] }, () => '2026-12-01')).toBe(false)
})
