import { cleanup, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, expect, test } from 'vitest'
import '../../../i18n'
import { Collection } from '../../Collection'
import type { SelectField, ViewDefinition } from '../../definition'
import { itemSource, makeItems, type Item } from '../../testing/items'
import { setScreenWidth, stubElementSizes } from '../../testing/layout'
import { renderAt } from '../../testing/render'
import { itemDefinition } from '../../testing/testDefinition'
import { viewProblems } from '../views'
import { arrange, moveCards, type Move } from './moveCards'

beforeAll(() => stubElementSizes({ width: 1128, height: 600, itemHeight: 64 }))
afterEach(cleanup)

const board: ViewDefinition = {
  id: 'board',
  name: 'Board',
  type: 'kanban',
  groupBy: 'status',
  card: ['owner'],
}
const definition = (source = itemSource(makeItems(6))) => ({
  ...itemDefinition(source),
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

test('cards dropped on a column take its value, unless they may not change', () => {
  const field = itemDefinition(itemSource(makeItems(1))).columns.find(
    (column) => column.id === 'status',
  )!.field as SelectField<Item>
  const [draft, valid, locked] = makeItems(3).map((item, index) => ({
    ...item,
    status: index === 1 ? ('valid' as const) : ('draft' as const),
  }))
  const saved: [string, Partial<Item>][] = []
  const refused: string[] = []
  moveCards(
    [draft, valid, locked],
    'valid',
    { id: 'status', label: 'Status', field },
    {
      canEdit: (record) => record !== locked,
      save: async (record, patch) => void saved.push([record.name, patch]),
      refuse: (record) => refused.push(record.name),
    },
  )
  expect(saved).toEqual([['Item 001', { status: 'valid' }]])
  expect(refused).toEqual(['Item 003'])
})

test('"+" on a column starts a new record with its value', async () => {
  const source = itemSource(makeItems(6))
  renderAt('/items', <Collection definition={definition(source)} />)
  await screen.findByRole('region', { name: 'Outdated' })
  await userEvent.click(
    screen.getByRole('button', { name: 'New record in Outdated' }),
  )
  const aside = await screen.findByRole('complementary', { name: '+ Add item' })
  await userEvent.type(
    within(aside).getByRole('textbox', { name: 'Title' }),
    'Old pump{Enter}',
  )
  await waitFor(() => expect(source.items()[0].name).toBe('Old pump'))
  expect(source.items()[0].status).toBe('outdated')
})

test('on a narrow screen, a card moves through its menu (MAS-37)', async () => {
  setScreenWidth(390)
  try {
    const source = itemSource(makeItems(6))
    renderAt('/items', <Collection definition={definition(source)} />)
    const draft = await screen.findByRole('region', { name: 'Draft' })
    await within(draft).findByText('Item 001')
    // No dragging there: the grip gives way to a menu of the other columns.
    await userEvent.click(
      within(draft).getByRole('button', { name: 'Move Item 001' }),
    )
    const menu = await screen.findByRole('menu')
    expect(
      within(menu)
        .getAllByRole('menuitem')
        .map((item) => item.textContent),
    ).toEqual(['Valid', 'Outdated'])
    await userEvent.click(within(menu).getByRole('menuitem', { name: 'Valid' }))
    await waitFor(() => expect(source.items()[0].status).toBe('valid'))
  } finally {
    setScreenWidth(1128)
  }
})

test('a moved card shows at once where it was dropped, and stays there', () => {
  type Card = { id: string; status: string }
  const card = (id: string, status: string): Card => ({ id, status })
  const arrangeIn = (
    items: Card[],
    value: string,
    moves: [string, Move<Card>][],
  ) =>
    arrange(
      items,
      value,
      new Map(moves),
      (c) => c.id,
      (c) => c.status,
    )
  const valid = [card('a', 'valid'), card('b', 'valid'), card('c', 'valid')]
  // Saving: gone from Draft, in Valid before b, though Valid's list has not reloaded.
  const saving: [string, Move<Card>][] = [
    ['x', { to: 'valid', before: 'b', record: card('x', 'valid') }],
  ]
  expect(arrangeIn([card('x', 'draft')], 'draft', saving)).toEqual({
    cards: [],
    change: -1,
  })
  const shown = arrangeIn(valid, 'valid', saving)
  expect(shown.cards.map((c) => c.id)).toEqual(['a', 'x', 'b', 'c'])
  expect(shown.change).toBe(1)
  // Reloaded, where the sort puts it last: it stays where it was dropped.
  const reloaded = arrangeIn([...valid, card('x', 'valid')], 'valid', [
    ['x', { to: 'valid', before: 'b' }],
  ])
  expect(reloaded.cards.map((c) => c.id)).toEqual(['a', 'x', 'b', 'c'])
  expect(reloaded.change).toBe(0)
  // Changed again elsewhere: the old move no longer brings it back.
  expect(
    arrangeIn(valid, 'valid', [['x', { to: 'valid', before: 'b' }]]).cards,
  ).toHaveLength(3)
})
