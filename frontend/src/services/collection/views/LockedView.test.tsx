import { cleanup, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, expect, test } from 'vitest'
import '../../i18n'
import { Collection } from '../Collection'
import type { ViewDefinition } from '../definition'
import { itemSource, makeItems } from '../testing/items'
import { stubElementSizes } from '../testing/layout'
import { renderAt } from '../testing/render'
import { itemDefinition } from '../testing/testDefinition'

beforeAll(() => stubElementSizes({ width: 1128, height: 400, itemHeight: 152 }))
afterEach(cleanup)

const show = (view: ViewDefinition, url = '/items') =>
  renderAt(
    url,
    <Collection
      definition={{
        ...itemDefinition(itemSource(makeItems(6))),
        views: [view],
      }}
    />,
  )

test('locked filters always apply, with no Filter menu; the search stays', async () => {
  show(
    {
      id: 'valid',
      name: 'Valid',
      type: 'table',
      filters: { status: ['valid'] },
      filtersEditable: false,
    },
    // A hand-written address can't lift them.
    '/items?f.status=draft',
  )
  await screen.findByDisplayValue('Item 002')
  expect(screen.queryByDisplayValue('Item 001')).not.toBeInTheDocument()
  expect(
    screen.queryByRole('button', { name: 'Filter' }),
  ).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Sort' })).toBeInTheDocument()
  // The filters stay out of the address.
  expect(location.search).not.toContain('valid')
  await userEvent.type(screen.getByRole('searchbox'), '005')
  await waitFor(() =>
    expect(screen.queryByDisplayValue('Item 002')).not.toBeInTheDocument(),
  )
  expect(screen.getByDisplayValue('Item 005')).toBeInTheDocument()
})

test('a locked sort applies, with no Sort menu and no sortable headers', async () => {
  show(
    {
      id: 'byName',
      name: 'By name',
      type: 'table',
      sort: [{ by: 'name', direction: 'desc' }],
      sortEditable: false,
    },
    '/items?sort=name:asc',
  )
  await screen.findByDisplayValue('Item 006')
  const names = screen
    .getAllByRole('rowheader')
    .map((cell) => cell.querySelector('input')?.value)
  expect(names.slice(0, 2)).toEqual(['Item 006', 'Item 005'])
  expect(screen.queryByRole('button', { name: 'Sort' })).not.toBeInTheDocument()
  expect(screen.getByRole('button', { name: 'Filter' })).toBeInTheDocument()
  const header = screen.getByRole('columnheader', { name: /Name/ })
  expect(header).not.toHaveAttribute('aria-sort')
})
