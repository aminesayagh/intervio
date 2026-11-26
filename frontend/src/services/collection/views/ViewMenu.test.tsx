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

const views: ViewDefinition[] = [
  { id: 'all', name: 'All', type: 'table' },
  { id: 'valid', name: 'Valid', type: 'table', filters: { status: ['valid'] } },
]
const show = (
  url = '/items',
  local: Record<string, string> = {},
  configured = views,
) =>
  renderAt(
    url,
    <Collection
      definition={{
        ...itemDefinition(itemSource(makeItems(6))),
        views: configured,
      }}
    />,
    {},
    local,
  )
/** The view shown, as its button says. */
const shown = () => screen.getByRole('button', { name: /^View: / }).textContent
/** Opens the views menu and picks one, after typing in its search. */
async function pick(name: string, typed = '') {
  await userEvent.click(screen.getByRole('button', { name: /^View: / }))
  if (typed) await userEvent.type(screen.getByRole('textbox'), typed)
  await userEvent.click(screen.getByRole('menuitem', { name }))
}

test('choosing a view: the address names it and the list takes its filters', async () => {
  show()
  await screen.findByDisplayValue('Item 001')
  expect(shown()).toBe('All')
  await pick('Valid', 'val')
  await waitFor(() => expect(location.search).toContain('view=valid'))
  expect(location.search).toContain('f.status=valid')
  // Items 2 and 5 are the valid ones.
  await waitFor(() =>
    expect(screen.queryByDisplayValue('Item 001')).not.toBeInTheDocument(),
  )
  expect(screen.getByDisplayValue('Item 002')).toBeInTheDocument()
  // Back to the default view: its own settings, and a bare address.
  await pick('All')
  await waitFor(() => expect(location.search).toBe(''))
})

test('a link to a view opens it with its filters', async () => {
  show('/items?view=valid')
  await screen.findByDisplayValue('Item 002')
  expect(shown()).toBe('Valid')
  expect(screen.queryByDisplayValue('Item 001')).not.toBeInTheDocument()
})

test('an unknown view opens the default one', async () => {
  show('/items?view=gone')
  await screen.findByDisplayValue('Item 001')
  expect(shown()).toBe('All')
})

test('a bare address opens the view this browser used last', async () => {
  show('/items', { 'intervio.collection.test-items.view': 'valid' })
  await screen.findByDisplayValue('Item 002')
  expect(shown()).toBe('Valid')
  expect(location.search).toContain('view=valid')
})

test('the search narrows the menu', async () => {
  show()
  await screen.findByDisplayValue('Item 001')
  await userEvent.click(screen.getByRole('button', { name: /^View: / }))
  await userEvent.type(screen.getByRole('textbox'), 'val')
  expect(
    screen.getAllByRole('menuitem').map((item) => item.textContent),
  ).toEqual(['Valid'])
})

test('a collection with one view shows its name, with no menu', async () => {
  show('/items', {}, [views[0]])
  await screen.findByDisplayValue('Item 001')
  expect(
    screen.queryByRole('button', { name: /^View: / }),
  ).not.toBeInTheDocument()
  expect(screen.getByText('All')).toBeInTheDocument()
})
