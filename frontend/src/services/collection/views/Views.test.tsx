import { cleanup, screen, within } from '@testing-library/react'
import { afterEach, beforeAll, expect, test } from 'vitest'
import '../../i18n'
import { Collection } from '../Collection'
import { checkDefinition } from '../testing/checks'
import { itemSource, makeItems } from '../testing/items'
import { stubElementSizes } from '../testing/layout'
import { partDefinition } from '../testing/parts'
import { renderAt } from '../testing/render'
import { itemDefinition } from '../testing/testDefinition'
import { DEFAULT_VIEW, valuesOf, viewProblems, viewsOf } from './views'

beforeAll(() => stubElementSizes({ width: 1128, height: 400, itemHeight: 152 }))
afterEach(cleanup)

const items = () => itemDefinition(itemSource(makeItems(3)))

test('a collection without views gets one table of every record', () => {
  expect(viewsOf({})).toEqual([DEFAULT_VIEW])
  expect(viewsOf({ views: [] })).toEqual([DEFAULT_VIEW])
})

test('views follow their order, else their place; the first is the default', () => {
  const ids = viewsOf({
    views: [
      { id: 'a', name: 'A', type: 'table' },
      { id: 'b', name: 'B', type: 'table', order: -1 },
      { id: 'c', name: 'C', type: 'table' },
    ],
  }).map((view) => view.id)
  expect(ids).toEqual(['b', 'a', 'c'])
})

test("a view's unknown ids are reported", () => {
  const definition = {
    ...items(),
    views: [
      {
        id: 'open',
        name: 'Open',
        type: 'table' as const,
        columns: ['name', 'colour'],
        filters: { status: ['open'], 'quantity.gt': ['1'], size: ['l'] },
        sort: [
          { by: 'quantity', direction: 'asc' as const },
          { by: 'notes', direction: 'asc' as const },
        ],
      },
      { id: 'open', name: 'Again', type: 'table' as const },
    ],
  }
  expect(viewProblems(definition)).toEqual([
    'view "open": no column "colour"',
    'view "open": no filter "size"',
    'view "open": can\'t sort by "notes"',
    'view "open": id used twice',
  ])
})

test("the test collections' views are valid", () => {
  expect(viewProblems(items())).toEqual([])
  expect(viewProblems(checkDefinition())).toEqual([])
  expect(viewProblems(partDefinition(undefined, items))).toEqual([])
})

test("the table shows the view's columns, in its order", async () => {
  const definition = {
    ...items(),
    views: [
      {
        id: 'short',
        name: 'Short',
        type: 'table' as const,
        columns: ['status', 'name'],
      },
    ],
  }
  renderAt('/items', <Collection definition={definition} />)
  const table = await screen.findByRole('grid')
  const headers = within(table)
    .getAllByRole('columnheader')
    .map((header) => header.textContent)
    .filter(Boolean)
  expect(headers).toEqual(['Status', 'Name'])
})

test('a new record takes the values the list is filtered on', () => {
  expect(
    valuesOf(items(), {
      status: ['valid'],
      active: ['true'],
      tags: ['pump', 'valve'],
      // Not one value, or not "is": nothing to take.
      owner: ['Julie Moreau', 'Marc Petit'],
      'quantity.gt': ['5'],
    }),
  ).toEqual({ status: 'valid', active: true, tags: ['pump', 'valve'] })
})
