import { cleanup, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, expect, test } from 'vitest'
import '../../../i18n'
import { Collection } from '../../Collection'
import type { ViewDefinition } from '../../definition'
import { itemSource, makeItems } from '../../testing/items'
import { stubElementSizes } from '../../testing/layout'
import { renderAt } from '../../testing/render'
import { itemDefinition } from '../../testing/testDefinition'
import { viewProblems } from '../views'

beforeAll(() => stubElementSizes({ width: 1128, height: 600, itemHeight: 64 }))
afterEach(cleanup)

const board: ViewDefinition = {
  id: 'board',
  name: 'Board',
  type: 'kanban',
  groupBy: 'status',
  card: ['owner'],
}
const definition = () => ({
  ...itemDefinition(itemSource(makeItems(6))),
  views: [board],
})

test('a column per status, in order, with its count and its cards', async () => {
  renderAt('/items', <Collection definition={definition()} />)
  const draft = await screen.findByRole('region', { name: 'Draft' })
  expect(
    screen
      .getAllByRole('region')
      .map((column) => column.ariaLabel)
      .filter(Boolean),
  ).toEqual(['Draft', 'Valid', 'Outdated'])
  // Items 1 and 4 are drafts.
  expect(await within(draft).findByText('Item 001')).toBeInTheDocument()
  expect(within(draft).getByText('Item 004')).toBeInTheDocument()
  expect(within(draft).queryByText('Item 002')).not.toBeInTheDocument()
  expect(within(draft).getByRole('heading')).toHaveTextContent('Draft2')
})

test('a card opens its record', async () => {
  renderAt('/items', <Collection definition={definition()} />)
  const valid = await screen.findByRole('region', { name: 'Valid' })
  await userEvent.click(await within(valid).findByText('Item 002'))
  expect(
    await screen.findByRole('complementary', { name: 'Item 002' }),
  ).toBeInTheDocument()
})

test('a list filtered on the grouping field keeps the other columns, empty', async () => {
  renderAt('/items?f.status=valid', <Collection definition={definition()} />)
  const draft = await screen.findByRole('region', { name: 'Draft' })
  expect(within(draft).getByRole('heading')).toHaveTextContent('Draft0')
  const valid = screen.getByRole('region', { name: 'Valid' })
  expect(await within(valid).findByText('Item 002')).toBeInTheDocument()
})

test('a board must group by a filterable select', () => {
  expect(
    viewProblems({
      ...definition(),
      views: [{ ...board, groupBy: 'notes' } as ViewDefinition],
    }),
  ).toEqual(['view "board": "notes" is not a filterable select'])
  expect(viewProblems(definition())).toEqual([])
})
